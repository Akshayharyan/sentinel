
from email_service import send_alert_email


if __name__ == "__main__":
    try:
        send_alert_email(
            subject="Sentinel - Test Email",
            body=(
                "Hello!\n\n"
                "This is a test email from Sentinel.\n"
                "If you received this message, "
                "Brevo SMTP is working.\n\n"
                "- Sentinel Monitoring"
            ),
        )

        print("SUCCESS: Test email sent.")

    except Exception as error:
        print("FAILED: Could not send the test email.")
        print(f"Reason: {type(error).__name__}: {error}")
