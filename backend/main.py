
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field, HttpUrl
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import create_tables, get_db
from models import CheckResult, Monitor
from monitor import check_website
from scheduler import scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()

    if not scheduler.running:
        scheduler.start()

    print("[Sentinel] Automatic monitoring started")

    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)
            print("[Sentinel] Automatic monitoring stopped")


app = FastAPI(
    title="Sentinel API",
    description="Website monitoring and uptime history API",
    lifespan=lifespan,
)


class MonitorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    url: HttpUrl
    check_interval_seconds: int = Field(
        default=60,
        ge=30,
        le=86400,
    )


def serialize_monitor(monitor: Monitor) -> dict:
    return {
        "id": monitor.id,
        "name": monitor.name,
        "url": monitor.url,
        "check_interval_seconds": monitor.check_interval_seconds,
        "created_at": monitor.created_at.isoformat(),
    }


def serialize_check(result: CheckResult) -> dict:
    return {
        "id": result.id,
        "monitor_id": result.monitor_id,
        "status_code": result.status_code,
        "response_time_ms": result.response_time_ms,
        "is_up": result.is_up,
        "error": result.error,
        "checked_at": result.checked_at.isoformat(),
    }


def save_check_result(
    monitor: Monitor,
    result: dict,
    db: Session,
) -> CheckResult:
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
    db.refresh(record)

    return record


@app.get("/")
def home():
    return {
        "message": "Welcome to Sentinel",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Ad-hoc check. Does not save history.
@app.get("/check")
def check(url: HttpUrl):
    return check_website(str(url))


@app.post("/monitors", status_code=201)
def create_monitor(
    monitor: MonitorCreate,
    db: Session = Depends(get_db),
):
    url = str(monitor.url)

    existing = db.scalar(
        select(Monitor).where(Monitor.url == url)
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="This website is already registered",
        )

    new_monitor = Monitor(
        id=str(uuid4()),
        name=monitor.name,
        url=url,
        check_interval_seconds=monitor.check_interval_seconds,
        created_at=datetime.now(timezone.utc),
    )

    try:
        db.add(new_monitor)
        db.commit()
        db.refresh(new_monitor)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This website is already registered",
        )

    return serialize_monitor(new_monitor)


@app.get("/monitors")
def list_monitors(db: Session = Depends(get_db)):
    records = db.scalars(
        select(Monitor).order_by(Monitor.created_at.desc())
    ).all()

    return [serialize_monitor(item) for item in records]


@app.post("/monitors/{monitor_id}/check")
def check_monitor(
    monitor_id: str,
    db: Session = Depends(get_db),
):
    monitor = db.get(Monitor, monitor_id)

    if monitor is None:
        raise HTTPException(
            status_code=404,
            detail="Monitor not found",
        )

    result = check_website(monitor.url)

    try:
        saved_result = save_check_result(monitor, result, db)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="The check ran, but its result could not be saved",
        )

    return serialize_check(saved_result)


@app.get("/monitors/{monitor_id}/history")
def get_monitor_history(
    monitor_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    monitor = db.get(Monitor, monitor_id)

    if monitor is None:
        raise HTTPException(
            status_code=404,
            detail="Monitor not found",
        )

    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 500",
        )

    records = db.scalars(
        select(CheckResult)
        .where(CheckResult.monitor_id == monitor_id)
        .order_by(CheckResult.checked_at.desc())
        .limit(limit)
    ).all()

    return {
        "monitor_id": monitor_id,
        "monitor_name": monitor.name,
        "count": len(records),
        "history": [serialize_check(item) for item in records],
    }


@app.delete("/monitors/{monitor_id}")
def delete_monitor(
    monitor_id: str,
    db: Session = Depends(get_db),
):
    monitor = db.get(Monitor, monitor_id)

    if monitor is None:
        raise HTTPException(
            status_code=404,
            detail="Monitor not found",
        )

    db.execute(
        delete(CheckResult).where(
            CheckResult.monitor_id == monitor_id
        )
    )

    db.delete(monitor)
    db.commit()

    return {
        "message": "Monitor and its history deleted successfully",
        "monitor_id": monitor_id,
    }
