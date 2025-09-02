from datetime import datetime, timedelta
from ..types import LineDescriptor, StudySet


class RecallData:
    symbol = "***"

    def __init__(self, line_descriptor: LineDescriptor, study_set: StudySet, args: str):
        recall_data = _parse_recall_data(args)
        if not recall_data:
            print(f"[RecallData] Failed to parse recall data: '{args}'")
            return
        self.reviewed_at = recall_data["reviewedAt"]
        self.ease = recall_data["ease"]
        self.interval = recall_data["interval"]
        self.learning_phase = recall_data["learningPhase"]
        parent = line_descriptor.parent
        if parent is None:
            print("[RecallData] No parent")
            return
        f = next((f for f in study_set.flashcards if f.line_descriptor == parent), None)
        if not f:
            print("[RecallData] No flashcard associated")
            return
        f.reviewed_at = self.reviewed_at
        f.ease = self.ease
        f.interval = self.interval
        f.learning_phase = self.learning_phase
        if f.reviewed_at:
            f.next_review_at = f.reviewed_at + timedelta(days=self.interval)

    def to_json(self):
        return {
            "name": "RecallData",
            "reviewedAt": self.reviewed_at,
            "ease": self.ease,
            "interval": self.interval,
            "learningPhase": self.learning_phase,
        }


def _parse_recall_data(recall_string: str):
    try:
        parts = [p.strip() for p in recall_string.split(",")]
        if len(parts) != 4:
            print(f"[parser] Invalid recall data format: expected 4 parts, got {len(parts)}")
            return None
        reviewed_at = datetime.fromisoformat(parts[0])
        ease = float(parts[1])
        interval = float(parts[2])
        learning_phase = parts[3].lower() == "true"
        return {
            "reviewedAt": reviewed_at,
            "ease": ease,
            "interval": interval,
            "learningPhase": learning_phase,
        }
    except Exception as e:
        print(f"[parser] Error parsing recall data: {e}")
        return None
