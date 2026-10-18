
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select

from database import SessionLocal
from models import CheckResult, Monitor
from monitor import check_website


def run_due_checks():
    """Check registered monitors when their next check is due."""
    db = SessionLocal()

    try:
        monitors = db.scalars(select(Monitor)).all()

        for monitor in monitors:
            try:
                latest_check = db.scalar(
                    select(CheckResult.checked_at)
                    .where(CheckResult.monitor_id == monitor.id)
                    .order_by(CheckResult.checked_at.desc())
                    .limit(1)
                )

                now = datetime.now(timezone.utc)

                # Run the first check immediately.
                if latest_check is not None:
                    if latest_check.tzinfo is None:
                        latest_check = latest_check.replace(
                            tzinfo=timezone.utc
                        )

                    interval = max(
                        30,
                        monitor.check_interval_seconds,
                    )

                    next_due = latest_check + timedelta(
                        seconds=interval
                    )

                    if now < next_due:
                        continue

                result = check_website(monitor.url)

                record = CheckResult(
                    id=str(uuid4()),
                    monitor_id=monitor.id,
                    status_code=result.get("status_code"),
                    response_time_ms=result["response_time_ms"],
                    is_up=result["is_up"],
                    error=result.get("error"),
                    checked_at=datetime.now(timezone.utc),
                )

                db.add(record)
                db.commit()

                status = "UP" if result["is_up"] else "DOWN"
                print(
                    f"[Sentinel] Checked {monitor.url}: {status}"
                )

            except Exception as error:
                db.rollback()
                print(
                    f"[Sentinel] Failed to check "
                    f"{monitor.url}: {error}"
                )

    except Exception as error:
        db.rollback()
        print(f"[Sentinel] Scheduler error: {error}")

    finally:
        db.close()


scheduler = BackgroundScheduler(timezone="UTC")

scheduler.add_job(
    run_due_checks,
    trigger="interval",
    seconds=10,
    id="website_monitoring",
    max_instances=1,
    coalesce=True,
    replace_existing=True,
)
