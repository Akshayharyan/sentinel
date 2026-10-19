import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv


SESSION_COOKIE = "sentinel_session"
PASSWORD_ITERATIONS = 600_000
SESSION_MAX_AGE = 60 * 60 * 24 * 7

load_dotenv(Path(__file__).with_name(".env"))


def _secret() -> bytes:
    value = os.getenv("SESSION_SECRET")
    if not value:
        raise RuntimeError(
            "SESSION_SECRET is missing. Set it in backend/.env."
        )
    return value.encode()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt,
        PASSWORD_ITERATIONS,
    )
    return (
        f"pbkdf2_sha256${PASSWORD_ITERATIONS}$"
        f"{base64.urlsafe_b64encode(salt).decode()}$"
        f"{base64.urlsafe_b64encode(digest).decode()}"
    )


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt_value, digest_value = encoded.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_value.encode())
        expected = base64.urlsafe_b64decode(digest_value.encode())
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode(),
            salt,
            int(iterations),
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def create_session_token(user_id: str) -> str:
    expires = int(
        (datetime.now(timezone.utc) + timedelta(seconds=SESSION_MAX_AGE))
        .timestamp()
    )
    payload = f"{user_id}.{expires}"
    signature = hmac.new(
        _secret(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload}.{signature}"


def read_session_user_id(token: str | None) -> str | None:
    if not token:
        return None

    try:
        user_id, expires_value, signature = token.split(".")
        payload = f"{user_id}.{expires_value}"
        expected = hmac.new(
            _secret(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        if int(expires_value) < int(datetime.now(timezone.utc).timestamp()):
            return None
        return user_id
    except (ValueError, TypeError):
        return None
