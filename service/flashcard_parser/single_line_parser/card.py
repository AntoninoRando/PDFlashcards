from typing import List
from datetime import datetime

from ..types import Flashcard, StudySet, LineDescriptor
from ..commands.page_ref import PageRef
from .command import parse_command_line


def parse_card_line(line_descriptor: LineDescriptor, study_set: StudySet) -> bool:
    line = line_descriptor.trimmed_line
    card_front = line
    parts = line.split(PageRef.symbol)
    if len(parts) == 2:
        parse_command_line(line_descriptor, study_set, f"{PageRef.symbol}{parts[1]}", True)
        card_front = parts[0].strip()

    card = Flashcard(
        line_descriptor=line_descriptor,
        text=card_front,
        headers=[],
        ease=5,
        interval=0.5,
        learning_phase=True,
        reviewed_at=None,
        retrieval_success=0,
        review_count=0,
        next_review_at=datetime.utcnow(),
    )

    _add_headers(card, study_set)
    study_set.flashcards.append(card)
    return True


def _add_headers(card: Flashcard, study_set: StudySet) -> None:
    j = len(study_set.headers) - 1
    last_header_level = None
    while j >= 0:
        ld = study_set.headers[j]
        j -= 1
        if ld.index > card.line_descriptor.index:
            continue
        header = next((x for x in ld.sub_parts if x.get("name") == "Header"), None)
        if header is None:
            continue
        if last_header_level is not None and header.get("level") >= last_header_level:
            break
        card.headers.insert(0, header.get("text"))
        last_header_level = header.get("level")
