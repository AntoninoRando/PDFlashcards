from dataclasses import dataclass
from typing import List

from .symbols import (
    COMMENT_SYMBOL,
    CATEGORY_START_SYMBOL,
    CATEGORY_END_SYMBOL,
    CATEGORIES,
)

@dataclass
class Category:
    name: str
    line: int


def categories_of(lines: List[str]) -> List[Category]:
    categories: List[Category] = []
    known_categories = set(CATEGORIES.values())
    for line_num, raw in enumerate(lines):
        trimmed = raw.strip()
        if trimmed.startswith(COMMENT_SYMBOL):
            continue
        if not trimmed.startswith(CATEGORY_START_SYMBOL):
            continue
        if not trimmed.endswith(CATEGORY_END_SYMBOL):
            continue
        name = trimmed[1:-1]
        categories.append(Category(name=name, line=line_num))
        if name not in known_categories:
            print(f"[categoriesFinder] Categories not previously known found: {name}")
    return categories
