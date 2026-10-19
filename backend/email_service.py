
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv


# Load configuration from backend/.env.
load_dotenv(Path(__file__).resolve().parent / ".env")


def send_alert_email(
    subject: str,
    body: str,
    recipient: str | None = None,
) -> None:
    """Send a Sentinel alert email through Brevo SMTP."""

    host = os.getenv("SMTP_HOST", "smtp-relay.brevo.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    login = os.getenv("SMTP_LOGIN")
    password = os.getenv("SMTP_KEY")
    sender = os.getenv("ALERT_FROM_EMAIL")
    recipient = recipient or os.getenv("ALERT_TO_EMAIL")

    required = {
        "SMTP_LOGIN": login,
        "SMTP_KEY": password,
        "ALERT_FROM_EMAIL": sender,
        "ALERT_TO_EMAIL": recipient,
    }

    missing = [
        name for name, value in required.items()
        if not value
    ]

    if missing:
        raise ValueError(
            "Missing email configuration: "
            + ", ".join(missing)
        )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(body)

    # Port 587 uses STARTTLS.
    with smtplib.SMTP(host, port, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(login, password)
        smtp.send_message(message)

    print(f"[Sentinel] Email sent: {subject}")
