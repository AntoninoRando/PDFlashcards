from types import SimpleNamespace

import pytest

from app.services import hand_gestures as hg
from app.services.camera_service import CameraService


def point(x=0.5, y=0.5):
    return SimpleNamespace(x=x, y=y, z=0.0)


def hand(open_fingers=(), index_angle_tip=None):
    """21 landmarks; the listed finger tips are above their PIP joint."""
    landmarks = [point() for _ in range(21)]
    for tip in hg.FINGER_TIPS:
        landmarks[tip] = point(y=0.3 if tip in open_fingers else 0.7)
        landmarks[tip - 2] = point(y=0.5)
    if index_angle_tip is not None:
        landmarks[hg.INDEX_FINGER_MCP] = point(0.5, 0.5)
        landmarks[hg.INDEX_FINGER_TIP] = point(*index_angle_tip)
    return landmarks


def detection(*hands):
    return SimpleNamespace(hand_landmarks=list(hands))


def recognition(gesture=None):
    gestures = [[SimpleNamespace(category_name=gesture)]] if gesture else []
    return SimpleNamespace(gestures=gestures)


def test_count_open_fingers():
    assert hg.count_open_fingers([hand(open_fingers=(8, 12))]) == 2
    assert hg.count_open_fingers([hand(open_fingers=(8,)), hand(open_fingers=(8, 12))]) == 3


def test_option_pointed_at():
    assert hg.option_pointed_at(-60) == "hide"
    assert hg.option_pointed_at(-95) == "not bad"
    assert hg.option_pointed_at(-120) is None


@pytest.fixture
def service(monkeypatch):
    s = CameraService()
    sent = []
    monkeypatch.setattr(s, "_emit", lambda is_pointing, command: sent.append((is_pointing, command)))
    s.sent = sent
    return s


def test_gesture_command_is_sent_once(service):
    for _ in range(3):
        service.process_frame(detection(hand()), recognition("Thumb_Up"))
    assert service.sent == [(False, "ok")]


def test_finger_count_command(service):
    service.process_frame(detection(hand(open_fingers=(8, 12, 16))), recognition())
    assert service.sent == [(False, "not bad")]


def test_pointing_is_notified_and_cleared(service):
    # Index finger straight up: angle -90 => "bad"
    pointing_hand = hand(open_fingers=(8,), index_angle_tip=(0.5, 0.2))
    service.process_frame(detection(pointing_hand), recognition("Pointing_Up"))
    service.process_frame(detection(hand()), recognition())
    assert (True, "bad") in service.sent
    assert service.sent[-1] == (True, None)
