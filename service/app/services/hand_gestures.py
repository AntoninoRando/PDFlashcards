"""
Pure helpers that interpret MediaPipe *Tasks* results (`HandLandmarker` and
`GestureRecognizer`). They do not depend on the camera, so they can be tested
with fake landmark objects.

Landmark indexes: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker
"""

import math
from typing import Any, Optional, Sequence

INDEX_FINGER_MCP = 5
INDEX_FINGER_TIP = 8
# Tips of index, middle, ring and pinky fingers (each tip - 2 is its PIP joint)
FINGER_TIPS = (8, 12, 16, 20)


def top_gesture(recognition_result: Any) -> Optional[str]:
    """Name of the most likely gesture of the first hand (e.g. 'Thumb_Up')."""
    gestures = getattr(recognition_result, "gestures", None)
    if not gestures or not gestures[0]:
        return None
    return gestures[0][0].category_name


def count_open_fingers(hands: Sequence[Sequence[Any]]) -> int:
    """Number of extended fingers (thumb excluded) across all detected hands."""
    count = 0
    for landmarks in hands:
        for tip in FINGER_TIPS:
            if landmarks[tip].y < landmarks[tip - 2].y:
                count += 1
    return count


def index_base_x(hands: Sequence[Sequence[Any]]) -> Optional[float]:
    """Horizontal position (0..1) of the index finger base of the first hand."""
    if not hands:
        return None
    return hands[0][INDEX_FINGER_MCP].x


def pointing_angle(landmarks: Sequence[Any]) -> float:
    """Angle (degrees) of the index finger, from its base to its tip."""
    tip = landmarks[INDEX_FINGER_TIP]
    base = landmarks[INDEX_FINGER_MCP]
    return math.degrees(math.atan2(tip.y - base.y, tip.x - base.x))


def option_pointed_at(angle: float) -> Optional[str]:
    """
    Maps the index finger angle to the recall option shown in that direction
    (the options are laid out horizontally under the card).
    """
    if angle >= -70:
        return "hide"
    if angle >= -80:
        return "forgot"
    if angle >= -90:
        return "bad"
    if angle >= -100:
        return "not bad"
    if angle >= -110:
        return "ok"
    return None
