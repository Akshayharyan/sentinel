
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select

from database import SessionLocal
from models import CheckResult, Monitor
from monitor import check_website


def get_recent_checks(db, monitor_id, limit=2):
    """Return the most recent check results, newest first."""
    return db.scalars(
        select(CheckResult)
        .where(CheckResult.monitor_id == monitor_id)
        .order_by(CheckResult.checked_at.desc())
        .limit(limit)
    ).all()


def run_due_checks():
    """Check registered monitors and detect downtime or recovery."""
    db = SessionLocal()

    try:
        monitors = db.scalars(select(Monitor)).all()

        for monitor in monitors:
            try:
                recent_checks = get_recent_checks(db, monitor.id)

                latest_check = (
                    recent_checks[0].checked_at
                    if recent_checks
                    else None
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

                # A monitor is considered DOWN only after
                # two consecutive failed recorded checks.
                was_down = (
                    len(recent_checks) >= 2
                    and not recent_checks[0].is_up
                    and not recent_checks[1].is_up
                )

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

                # Detect transitions without repeating alerts
                # for an outage that is already confirmed.
                if not result["is_up"]:
                    now_down = (
                        bool(recent_checks)
                        and not recent_checks[0].is_up
                    )

                    if now_down and not was_down:
                        print(
                            f"[Sentinel] DOWNTIME DETECTED: "
                            f"{monitor.name} ({monitor.url})"
                        )

                elif was_down:
                    print(
                        f"[Sentinel] RECOVERY DETECTED: "
                        f"{monitor.name} ({monitor.url})"
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
