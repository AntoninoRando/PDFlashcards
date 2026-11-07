from datetime import timedelta
from typing import Optional

from ..dates import parse_iso_datetime
from ..types import LineDescriptor, StudySet


class RecallData:
    """Scheduling data of the parent card: `*** <reviewedAt>, <ease>, <interval>, <learningPhase>`."""

    symbol = "***"

    def __init__(self, line_descriptor: LineDescriptor, study_set: StudySet, args: str):
        self.reviewed_at = None
        self.ease: Optional[float] = None
        self.interval: Optional[float] = None
        self.learning_phase: Optional[bool] = None

        recall_data = _parse_recall_data(args)
        if not recall_data:
            print(f"[RecallData] Failed to parse recall data: '{args}'")
            return
        self.reviewed_at, self.ease, self.interval, self.learning_phase = recall_data

        parent = line_descriptor.parent
        if parent is None:
            print("[RecallData] No parent")
            return
        f = next((f for f in study_set.flashcards if f.line_descriptor is parent), None)
        if not f:
            print("[RecallData] No flashcard associated")
            return
        f.reviewed_at = self.reviewed_at
        f.ease = self.ease
        f.interval = self.interval
        f.learning_phase = self.learning_phase
        f.next_review_at = self.reviewed_at + timedelta(days=self.interval)

    def to_json(self):
        return {
            "name": "RecallData",
            "reviewedAt": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "ease": self.ease,
            "interval": self.interval,
            "learningPhase": self.learning_phase,
        }


def _parse_recall_data(recall_string: str):
    parts = [p.strip() for p in recall_string.split(",")]
    if len(parts) != 4:
        print(f"[parser] Invalid recall data format: expected 4 parts, got {len(parts)}")
        return None
    reviewed_at = parse_iso_datetime(parts[0])
    if reviewed_at is None:
        print(f"[parser] Invalid date: {parts[0]}")
        return None
    try:
        ease = float(parts[1])
        interval = float(parts[2])
    except ValueError as e:
        print(f"[parser] Error parsing recall data: {e}")
        return None
    # Same validation as the web app
    if not 1 <= ease <= 10 or interval < 0:
        print(f"[parser] Invalid difficulty or interval: {parts[1]}, {parts[2]}")
        return None
    learning_phase = parts[3].lower() == "true"
    return reviewed_at, ease, interval, learning_phase
