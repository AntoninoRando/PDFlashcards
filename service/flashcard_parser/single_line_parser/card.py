from ..commands.page_ref import PageRef
from ..commands.text_box import TextBox
from ..types import Flashcard, LineDescriptor, StudySet
from .command import parse_command_line


def parse_card_line(line_descriptor: LineDescriptor, study_set: StudySet) -> bool:
    line = line_descriptor.trimmed_line
    card_front = line

    # TextBox first, since "..." contains ".."
    for symbol in (TextBox.symbol, PageRef.symbol):
        parts = line.split(symbol)
        if len(parts) == 2:
            parse_command_line(line_descriptor, study_set, f"{symbol}{parts[1]}", True)
            card_front = parts[0].strip()
            break

    card = Flashcard(line_descriptor=line_descriptor, text=card_front)
    _add_headers(card, study_set)
    study_set.flashcards.append(card)
    return True


def _add_headers(card: Flashcard, study_set: StudySet) -> None:
    """Adds the headers the card is nested in, outermost first."""
    last_header_level = None
    for ld in reversed(study_set.headers):
        if ld.index > card.line_descriptor.index:
            continue
        header = next((x for x in ld.sub_parts if x.get("name") == "Header"), None)
        if header is None:
            continue
        if last_header_level is not None and header.get("level") >= last_header_level:
            break
        card.headers.insert(0, header.get("text"))
        last_header_level = header.get("level")
