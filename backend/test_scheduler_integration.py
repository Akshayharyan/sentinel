
import unittest
from contextlib import redirect_stdout
from datetime import datetime, timedelta, timezone
from io import StringIO
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

import scheduler
from database import Base
from models import CheckResult, Monitor


class TestSchedulerIntegration(unittest.TestCase):

    def setUp(self):
        # Create an isolated, in-memory test database.
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(self.engine)

        self.TestSessionLocal = sessionmaker(
            bind=self.engine,
            expire_on_commit=False,
        )

        # Add one dedicated test monitor.
        with self.TestSessionLocal() as db:
            self.monitor_id = str(uuid4())

            test_monitor = Monitor(
                id=self.monitor_id,
                name="Sentinel Integration Test",
                url="https://sentinel-test.invalid",
                check_interval_seconds=30,
            )

            db.add(test_monitor)
            db.commit()

    def tearDown(self):
        self.engine.dispose()

    def test_downtime_and_recovery_flow(self):
        # Simulate: UP -> DOWN -> DOWN -> UP.
        # No real HTTP requests will be made.
        simulated_responses = [
            {
                "status_code": 200,
                "response_time_ms": 100.0,
                "is_up": True,
            },
            {
                "status_code": None,
                "response_time_ms": 1000.0,
                "is_up": False,
                "error": "Simulated failure",
            },
            {
                "status_code": None,
                "response_time_ms": 1000.0,
                "is_up": False,
                "error": "Simulated failure",
            },
            {
                "status_code": 200,
                "response_time_ms": 120.0,
                "is_up": True,
            },
        ]

        output = StringIO()

        with (
            patch.object(
                scheduler,
                "SessionLocal",
                self.TestSessionLocal,
            ),
            patch.object(
                scheduler,
                "check_website",
                side_effect=simulated_responses,
            ) as mock_check,
            redirect_stdout(output),
        ):
            for index in range(4):
                scheduler.run_due_checks()

                # Simulate the configured interval passing so
                # the next scheduled check is allowed to run.
                if index < 3:
                    with self.TestSessionLocal() as db:
                        latest = db.scalars(
                            select(CheckResult)
                            .where(
                                CheckResult.monitor_id
                                == self.monitor_id
                            )
                            .order_by(
                                CheckResult.checked_at.desc()
                            )
                            .limit(1)
                        ).first()

                        self.assertIsNotNone(latest)

                        latest.checked_at = (
                            datetime.now(timezone.utc)
                            - timedelta(seconds=31)
                        )

                        db.commit()

        logs = output.getvalue()

        # Verify that all four simulated checks ran.
        self.assertEqual(mock_check.call_count, 4)

        # Verify that downtime and recovery were detected.
        self.assertEqual(
            logs.count("DOWNTIME DETECTED"),
            1,
            logs,
        )
        self.assertEqual(
            logs.count("RECOVERY DETECTED"),
            1,
            logs,
        )

        # Verify that every check was saved.
        with self.TestSessionLocal() as db:
            records = db.scalars(
                select(CheckResult).where(
                    CheckResult.monitor_id == self.monitor_id
                )
            ).all()

            self.assertEqual(len(records), 4)

        print("\nCaptured scheduler output:")
        print(logs)
        print("PASS: Four checks were saved.")
        print("PASS: Downtime was detected exactly once.")
        print("PASS: Recovery was detected exactly once.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
