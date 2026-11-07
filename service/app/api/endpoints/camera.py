import asyncio

from fastapi import APIRouter

from app.models.camera import CameraStatus, CameraToggleResponse
from app.services.camera_service import camera_service

router = APIRouter()


@router.post("/enable", response_model=CameraToggleResponse, summary="Enable Camera Recognition")
async def enable_camera() -> CameraToggleResponse:
    # Model loading can take a while: keep it off the event loop
    loop = asyncio.get_running_loop()
    success, msg = await asyncio.to_thread(camera_service.start, loop)
    return CameraToggleResponse(
        status="success" if success else "info",
        message=msg,
        camera_enabled=camera_service.enabled,
    )


@router.post("/disable", response_model=CameraToggleResponse, summary="Disable Camera Recognition")
async def disable_camera() -> CameraToggleResponse:
    # Stopping joins the capture thread: keep it off the event loop
    success, msg = await asyncio.to_thread(camera_service.stop)
    return CameraToggleResponse(
        status="success" if success else "info",
        message=msg,
        camera_enabled=camera_service.enabled,
    )


@router.get("/status", response_model=CameraStatus, summary="Get Camera Status")
def get_camera_status() -> CameraStatus:
    return CameraStatus(
        enabled=camera_service.enabled,
        running=camera_service.is_running,
        is_pointing=bool(camera_service.pointing_with_finger),
        gesture_command=camera_service.last_sent_command,
    )
