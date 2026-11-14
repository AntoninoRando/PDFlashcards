from ..types import Flashcard, LineDescriptor, StudySet


class Reverse:
    """Port of `src/Commands/All/Reverse.ts`: keep the two in sync.

    `<>` under a card adds a second card studied the other way (answer first,
    front to recall), with its own review data under the `<>` line.
    """

    symbol = "<>"
    command_name = "Reverse"

    def __init__(self, line_descriptor: LineDescriptor, study_set: StudySet):
        self.card = None
        parent = line_descriptor.parent
        source = (
            next((f for f in study_set.flashcards if f.line_descriptor is parent), None)
            if parent is not None
            else None
        )
        if source is None:
            print(f"[Reverse] Line {line_descriptor.index} is not under a card")
            return
        if source.reverse_of is not None:
            print(f"[Reverse] Line {line_descriptor.index}: a reverse card cannot be reversed again")
            return

        self.card = Flashcard(
            line_descriptor=line_descriptor,
            text=source.text,
            headers=list(source.headers),
            reverse_of=source,
        )
        study_set.flashcards.append(self.card)

    @property
    def is_valid(self) -> bool:
        return self.card is not None

    def to_json(self):
        return {"name": Reverse.command_name}
