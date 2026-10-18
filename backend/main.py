
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl

from monitor import check_website

app = FastAPI(title="Sentinel API")

# Temporary in-memory storage
monitors = {}


class MonitorCreate(BaseModel):
    name: str
    url: HttpUrl


@app.get("/")
def home():
    return {
        "message": "Welcome to Sentinel",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/check")
def check(url: HttpUrl):
    return check_website(str(url))


@app.post("/monitors", status_code=201)
def create_monitor(monitor: MonitorCreate):
    for existing in monitors.values():
        if existing["url"] == str(monitor.url):
            raise HTTPException(
                status_code=409,
                detail="This website is already registered"
            )

    monitor_id = str(uuid4())

    new_monitor = {
        "id": monitor_id,
        "name": monitor.name,
        "url": str(monitor.url),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    monitors[monitor_id] = new_monitor
    return new_monitor


@app.get("/monitors")
def list_monitors():
    return list(monitors.values())


@app.delete("/monitors/{monitor_id}")
def delete_monitor(monitor_id: str):
    if monitor_id not in monitors:
        raise HTTPException(
            status_code=404,
            detail="Monitor not found"
        )

    deleted_monitor = monitors.pop(monitor_id)

    return {
        "message": "Monitor deleted successfully",
        "monitor": deleted_monitor
    }
