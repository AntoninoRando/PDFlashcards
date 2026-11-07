import logging

from fastapi import APIRouter, HTTPException

from app import config
from app.models.studyset import AutosaveRequest, StatusResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/autosave", response_model=StatusResponse, summary="Autosave the study set")
def autosave(request: AutosaveRequest) -> StatusResponse:
    """Writes the serialized study set sent by the web app to disk."""
    try:
        # newline="": write the content as sent (no '\n' -> '\r\n' on Windows)
        config.AUTOSAVE_PATH.write_text(request.content, encoding="utf-8", newline="")
    except OSError as exc:
        logger.error("Failed to write %s: %s", config.AUTOSAVE_PATH, exc)
        raise HTTPException(status_code=500, detail="Failed to write file") from exc
    return StatusResponse(status="success")
