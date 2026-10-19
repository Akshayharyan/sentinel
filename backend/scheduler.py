
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select

from database import SessionLocal
from models import CheckResult, Monitor
from monitor import check_website
from alert_logic import detect_transition
from email_service import send_alert_email


def get_recent_checks(db, monitor_id, limit=2):
    """Return the most recent check results, newest first."""
    return db.scalars(
        select(CheckResult)
        .where(CheckResult.monitor_id == monitor_id)
        .order_by(CheckResult.checked_at.desc())
        .limit(limit)
    ).all()


def notify_transition(monitor, event, result):
    """Send an email for a new downtime or recovery event."""
    if event == "DOWN":
        subject = f"[Sentinel] Website DOWN: {monitor.name}"
        body = (
            f"Sentinel has detected downtime.\n\n"
            f"Monitor: {monitor.name}\n"
            f"URL: {monitor.url}\n"
            f"Status: DOWN\n"
            f"HTTP status: {result.get('status_code')}\n"
            f"Error: {result.get('error', 'No details available')}\n\n"
            f"The website failed two consecutive checks.\n"
        )

    elif event == "RECOVERED":
        subject = f"[Sentinel] Website RECOVERED: {monitor.name}"
        body = (
            f"Sentinel has detected that the website has recovered.\n\n"
            f"Monitor: {monitor.name}\n"
            f"URL: {monitor.url}\n"
            f"Status: UP\n"
            f"HTTP status: {result.get('status_code')}\n"
            f"Response time: {result['response_time_ms']:.2f} ms\n\n"
            f"The website is responding successfully again.\n"
        )

    else:
        return

    recipient = monitor.owner.email if monitor.owner else None

    try:
        send_alert_email(subject, body, recipient=recipient)
    except Exception as error:
        # Email failure must not interrupt website monitoring.
        print(
            f"[Sentinel] Failed to send {event} email "
            f"for {monitor.url}: {error}"
        )


def run_due_checks():
    """Check registered monitors and detect downtime or recovery."""
    db = SessionLocal()

    try:
        monitors = db.scalars(select(Monitor)).all()

        for monitor in monitors:
            try:
                # Read previous results before recording this check.
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

                # Check the website.
                result = check_website(monitor.url)

                # Save the result before processing notifications.
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

                # Detect transitions using previous results.
                previous_is_up = [
                    check.is_up for check in recent_checks
                ]

                event = detect_transition(
                    previous_is_up,
                    result["is_up"],
                )

                if event == "DOWN":
                    print(
                        f"[Sentinel] DOWNTIME DETECTED: "
                        f"{monitor.name} ({monitor.url})"
                    )
                    notify_transition(monitor, event, result)

                elif event == "RECOVERED":
                    print(
                        f"[Sentinel] RECOVERY DETECTED: "
                        f"{monitor.name} ({monitor.url})"
                    )
                    notify_transition(monitor, event, result)

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
