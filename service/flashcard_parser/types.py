from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any

from .scheduler import FlashcardsScheduler
from .categories_finder import Category


@dataclass
class LineDescriptor:
    index: int
    trimmed_line: str
    original_line: str
    tabs: int
    category: Optional[Category]
    tabbed_under: List['LineDescriptor'] = field(default_factory=list)
    parent: Optional['LineDescriptor'] = None
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


@dataclass
class Flashcard:
    line_descriptor: LineDescriptor
    text: str
    headers: List[str] = field(default_factory=list)
    reviewed_at: Optional[datetime] = None
    next_review_at: datetime = field(default_factory=datetime.utcnow)
    ease: float = 5.0
    interval: float = 0.5
    retrieval_success: Optional[int] = 0
    review_count: int = 0
    learning_phase: bool = True
    alias: Optional[List[str]] = None

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
            "alias": self.alias,
        }


@dataclass
class StudySet:
    title: str = ""
    resources: Dict[str, str] = field(default_factory=dict)
    default_resource: str = ""
    aliases: List[Dict[str, str]] = field(default_factory=list)
    flashcards: List[Flashcard] = field(default_factory=list)
    scheduler: FlashcardsScheduler = field(default_factory=FlashcardsScheduler)
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
