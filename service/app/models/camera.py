from typing import Optional

from pydantic import BaseModel


class CameraStatus(BaseModel):
    enabled: bool
    running: bool
    is_pointing: bool
    gesture_command: Optional[str] = None


class CameraToggleResponse(BaseModel):
    status: str
    message: str
    camera_enabled: bool
