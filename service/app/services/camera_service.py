"""
Camera-based gesture recognition.

A background thread reads the webcam, runs the MediaPipe hand landmarker and
gesture recognizer on each frame, and pushes `notification` events to the web
app through Socket.IO:

- `{"isPointing": False, "command": <command>}` when a gesture command is made;
- `{"isPointing": True, "command": <option or None>}` when the recall option
  pointed at with the index finger changes.
"""

import asyncio
import logging
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable, Optional

from app import config
from app.services import hand_gestures as hg
from app.services.socket_manager import socket_manager

logger = logging.getLogger(__name__)

FRAME_INTERVAL_S = 0.1  # No need to exhaust the CPU

# condition(detection_result, recognition_result) -> bool
Condition = Callable[[Any, Any], bool]


@dataclass(frozen=True)
class GestureCommand:
    name: str
    condition: Condition
    # Minimum seconds since the last command before this one can be sent again
    delay: Optional[float] = None
    # Whether the command can be sent several times in a row
    allow_repeat: bool = False
    # Whether the command is recognized while the user is pointing
    allow_during_pointing: bool = False


def _gesture_is(name: str) -> Condition:
    return lambda _det, rec: hg.top_gesture(rec) == name


def _fingers_open(count: int) -> Condition:
    return lambda det, _rec: hg.count_open_fingers(det.hand_landmarks) == count


def _pointing_up_with_index(predicate: Callable[[float], bool]) -> Condition:
    def condition(det: Any, rec: Any) -> bool:
        if hg.top_gesture(rec) != "Pointing_Up":
            return False
        x = hg.index_base_x(det.hand_landmarks)
        return x is not None and predicate(x)

    return condition


GESTURE_COMMANDS: tuple[GestureCommand, ...] = (
    GestureCommand("show", _gesture_is("Open_Palm"), allow_during_pointing=True),
    GestureCommand("hide", _gesture_is("Closed_Fist"), allow_during_pointing=True),
    GestureCommand("forgot", _gesture_is("Thumb_Down")),
    GestureCommand("bad", _fingers_open(2)),
    GestureCommand("not bad", _fingers_open(3)),
    GestureCommand("ok", _gesture_is("Thumb_Up")),
    # The camera image is mirrored: the hand on the left of the frame is the right one
    GestureCommand("next page", _pointing_up_with_index(lambda x: x < 0.45), delay=1, allow_repeat=True),
    GestureCommand("previous page", _pointing_up_with_index(lambda x: x > 0.55), delay=1, allow_repeat=True),
)


class CameraService:
    def __init__(self) -> None:
        self.enabled = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

        # MediaPipe models, loaded on first start (slow, and not needed to
        # run the rest of the service)
        self._detector: Any = None
        self._recognizer: Any = None

        self.last_sent_command: Optional[str] = None
        self.last_sent_command_ts: Optional[float] = None
        self.pointing_with_finger: Optional[str] = None

    @property
    def is_running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())

    # ------------------------------------------------------------------ control
    def start(self, loop: asyncio.AbstractEventLoop) -> tuple[bool, str]:
        """Starts the recognition thread. `loop` is used to emit socket events."""
        with self._lock:
            if self.enabled:
                return False, "Camera recognition is already enabled"
            try:
                self._load_models()
            except Exception as exc:  # MediaPipe raises plain RuntimeErrors
                logger.error("Failed to load MediaPipe models: %s", exc)
                return False, f"Models not loaded: {exc}"

            self._loop = loop
            self.enabled = True
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run, name="camera", daemon=True)
            self._thread.start()
            return True, "Camera recognition enabled"

    def stop(self) -> tuple[bool, str]:
        with self._lock:
            if not self.enabled:
                return False, "Camera recognition is already disabled"
            self.enabled = False
            self._stop_event.set()
            if self._thread and self._thread.is_alive():
                self._thread.join(timeout=2)
            return True, "Camera recognition disabled"

    def _load_models(self) -> None:
        if self._detector and self._recognizer:
            return
        from mediapipe.tasks import python as mp_tasks
        from mediapipe.tasks.python import vision

        self._detector = vision.HandLandmarker.create_from_options(
            vision.HandLandmarkerOptions(
                base_options=mp_tasks.BaseOptions(model_asset_path=str(config.HAND_LANDMARKER_MODEL)),
                num_hands=2,
            )
        )
        self._recognizer = vision.GestureRecognizer.create_from_options(
            vision.GestureRecognizerOptions(
                base_options=mp_tasks.BaseOptions(model_asset_path=str(config.GESTURE_RECOGNIZER_MODEL)),
            )
        )

    # --------------------------------------------------------------- recognition
    def _run(self) -> None:
        import cv2
        import mediapipe as mp

        capture = cv2.VideoCapture(config.CAMERA_INDEX)
        logger.info("Camera thread started")
        try:
            while not self._stop_event.is_set():
                success, image = capture.read()
                if not success:
                    logger.warning("Unable to read from camera %s", config.CAMERA_INDEX)
                    self._stop_event.wait(1)
                    continue

                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
                try:
                    detection = self._detector.detect(mp_image)
                    recognition = self._recognizer.recognize(mp_image)
                    self.process_frame(detection, recognition)
                except Exception:
                    logger.exception("Frame processing error")

                self._stop_event.wait(FRAME_INTERVAL_S)
        finally:
            capture.release()
            logger.info("Camera thread stopped")

    def process_frame(self, detection: Any, recognition: Any) -> None:
        """Turns the MediaPipe results of one frame into notifications."""
        self._process_commands(detection, recognition)
        self._process_pointing(detection, recognition)

    def _process_commands(self, detection: Any, recognition: Any) -> None:
        now = time.time()
        for command in GESTURE_COMMANDS:
            if self.pointing_with_finger and not command.allow_during_pointing:
                continue
            if command.name == self.last_sent_command and not command.allow_repeat:
                continue
            if (
                command.delay is not None
                and self.last_sent_command_ts is not None
                and now - self.last_sent_command_ts < command.delay
            ):
                continue
            if command.condition(detection, recognition):
                self.last_sent_command = command.name
                self.last_sent_command_ts = now
                self._emit(is_pointing=False, command=command.name)
                break

    def _process_pointing(self, detection: Any, recognition: Any) -> None:
        pointed: Optional[str] = None
        if hg.top_gesture(recognition) == "Pointing_Up" and detection.hand_landmarks:
            angle = hg.pointing_angle(detection.hand_landmarks[0])
            # Outside the known range: keep the previous option
            pointed = hg.option_pointed_at(angle) or self.pointing_with_finger

        if pointed != self.pointing_with_finger:
            self.pointing_with_finger = pointed
            # Also sent when pointing stops (None) so the UI clears the highlight
            self._emit(is_pointing=True, command=pointed)

    def _emit(self, is_pointing: bool, command: Optional[str]) -> None:
        payload = {"isPointing": is_pointing, "command": command}
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(socket_manager.emit("notification", payload), self._loop)
        else:
            logger.info("Not emitted (no event loop): %s", payload)


camera_service = CameraService()
