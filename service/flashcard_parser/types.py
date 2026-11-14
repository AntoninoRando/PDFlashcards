from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from .categories_finder import Category
from .dates import utc_now


# eq=False: line descriptors reference each other (parent <-> tabbed_under),
# so they must be compared by identity, not field by field.
@dataclass(eq=False)
class LineDescriptor:
    index: int
    trimmed_line: str
    original_line: str
    tabs: int
    category: Optional[Category]
    tabbed_under: List[LineDescriptor] = field(default_factory=list)
    parent: Optional[LineDescriptor] = None
    is_comment: bool = False
    sub_parts: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "trimmedLine": self.trimmed_line,
            "originalLine": self.original_line,
            "tabs": self.tabs,
            "category": (
                {"name": self.category.name, "line": self.category.line}
                if self.category
                else None
            ),
            "tabbedUnder": [ld.index for ld in self.tabbed_under],
            "parent": self.parent.index if self.parent else None,
            "isComment": self.is_comment,
            "subParts": self.sub_parts,
        }


@dataclass(eq=False)
class Flashcard:
    line_descriptor: LineDescriptor
    text: str
    headers: List[str] = field(default_factory=list)
    reviewed_at: Optional[datetime] = None
    next_review_at: datetime = field(default_factory=utc_now)
    ease: float = 5.0
    interval: float = 0.5
    # None until the card is reviewed (0 means "forgot")
    retrieval_success: Optional[int] = None
    review_count: int = 0
    learning_phase: bool = True
    skip_until: Optional[datetime] = None
    alias: Optional[List[str]] = None
    # Reverse card (`<>` under a card): the card it reverses
    reverse_of: Optional[Flashcard] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "lineDescriptor": self.line_descriptor.index,
            "text": self.text,
            "headers": self.headers,
            "reviewedAt": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "nextReviewAt": self.next_review_at.isoformat(),
            "ease": self.ease,
            "interval": self.interval,
            "retrievalSuccess": self.retrieval_success,
            "reviewCount": self.review_count,
            "learningPhase": self.learning_phase,
            "skipUntil": self.skip_until.isoformat() if self.skip_until else None,
            "alias": self.alias,
            # Line of the card it reverses (cards are referenced by line, like `lineDescriptor`)
            "reverseOf": self.reverse_of.line_descriptor.index if self.reverse_of else None,
        }


@dataclass
class StudySet:
    title: str = ""
    resources: Dict[str, str] = field(default_factory=dict)
    default_resource: str = ""
    aliases: List[Dict[str, str]] = field(default_factory=list)
    flashcards: List[Flashcard] = field(default_factory=list)
    headers: List[LineDescriptor] = field(default_factory=list)
    studied_cards: int = 0
    original_lines: List[str] = field(default_factory=list)
    lines_descriptors: List[LineDescriptor] = field(default_factory=list)
    history: List[Any] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "resources": self.resources,
            "defaultResource": self.default_resource,
            "aliases": self.aliases,
            "flashcards": [f.to_dict() for f in self.flashcards],
            "headers": [ld.index for ld in self.headers],
            "studiedCards": self.studied_cards,
            "originalLines": self.original_lines,
            "linesDescriptors": [ld.to_dict() for ld in self.lines_descriptors],
            "history": self.history,
        }
