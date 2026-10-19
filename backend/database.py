
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv(Path(__file__).with_name(".env"))

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is missing. Check your backend/.env file."
    )

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_database_connection():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    print("Database connection successful")


def create_tables():
    # Import both models so SQLAlchemy registers their tables.
    from models import CheckResult, Monitor, User

    Base.metadata.create_all(bind=engine)

    # Existing deployments may already have a monitors table. Keep legacy
    # rows intact and make ownership nullable until an administrator assigns it.
    with engine.begin() as connection:
        columns = {
            row[1]
            for row in connection.exec_driver_sql(
                "PRAGMA table_info(monitors)"
            )
        } if engine.dialect.name == "sqlite" else {
            row[0]
            for row in connection.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'monitors'"
                )
            )
        }

        if "owner_id" not in columns:
            if engine.dialect.name == "sqlite":
                connection.exec_driver_sql(
                    "ALTER TABLE monitors ADD COLUMN owner_id VARCHAR(36)"
                )
            else:
                connection.execute(
                    text(
                        "ALTER TABLE monitors ADD COLUMN IF NOT EXISTS "
                        "owner_id VARCHAR(36)"
                    )
                )

        if engine.dialect.name == "postgresql":
            connection.execute(
                text(
                    "ALTER TABLE monitors DROP CONSTRAINT IF EXISTS "
                    "monitors_url_key"
                )
            )
            connection.execute(
                text("DROP INDEX IF EXISTS ix_monitors_url")
            )
            connection.execute(
                text(
                    "DO $$ BEGIN "
                    "ALTER TABLE monitors ADD CONSTRAINT monitors_owner_fk "
                    "FOREIGN KEY (owner_id) REFERENCES users(id) "
                    "ON DELETE CASCADE; "
                    "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
                )
            )
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS "
                    "uq_monitor_owner_url_idx ON monitors(owner_id, url)"
                )
            )
