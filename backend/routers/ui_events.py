from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field

from core.audit_logger import log_ui_click_event


class UIClickEvent(BaseModel):
    timestamp: str | None = None
    path: str | None = None
    href: str | None = None
    tag_name: str | None = None
    role: str | None = None
    text: str | None = None
    element_id: str | None = None
    class_name: str | None = None
    button_type: str | None = None
    input_type: str | None = None
    aria_label: str | None = None
    name: str | None = None
    x: int | None = Field(default=None, ge=0)
    y: int | None = Field(default=None, ge=0)


router = APIRouter(
    prefix="/api/ui-events",
    tags=["UI Events"],
)


@router.post("/click")
def capture_click(payload: UIClickEvent):
    event = payload.model_dump(exclude_none=True)
    event.setdefault(
        "timestamp",
        datetime.now(timezone.utc).isoformat(),
    )

    log_ui_click_event("UI_CLICK", **event)
    return {"ok": True}
