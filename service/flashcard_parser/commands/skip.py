from typing import Optional

from ..dates import parse_iso_datetime
from ..types import LineDescriptor, StudySet


class Skip:
    """Postpones the parent card until the given ISO timestamp."""

    symbol = "SKIP"
    command_name = "Skip"

    def __init__(self, line_descriptor: LineDescriptor, study_set: StudySet, argument: Optional[str]):
        self.skip_until = parse_iso_datetime(argument) if argument else None
        if self.skip_until is None:
            print(f"[Skip] Missing or invalid ISO timestamp: '{argument}'")

        parent = line_descriptor.parent
        if parent is None:
            print("[Skip] Command has no parent line descriptor")
            return
        flashcard = next((f for f in study_set.flashcards if f.line_descriptor is parent), None)
        if flashcard is None:
            print("[Skip] Could not find associated flashcard")
            return

        flashcard.skip_until = self.skip_until
        if self.skip_until and flashcard.next_review_at < self.skip_until:
            flashcard.next_review_at = self.skip_until

    def to_json(self):
        return {
            "name": Skip.command_name,
            "skipUntil": self.skip_until.isoformat() if self.skip_until else None,
        }
