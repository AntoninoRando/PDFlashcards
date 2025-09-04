from typing import List

from .categories_finder import categories_of, Category
from .single_line_parser.card import parse_card_line
from .line_tab_counter import count_tabs
from .symbols import CATEGORIES, COMMENT_SYMBOL
from .types import StudySet, LineDescriptor
from .single_line_parser.command import parse_command_line
from .single_line_parser.alias import parse_acronym_line
from .single_line_parser.resource import parse_resource_line


def parse_studyset(lines: List[str]) -> StudySet | None:
    original_lines = list(lines)
    categories = categories_of(lines)
    study_set = StudySet(original_lines=original_lines)
    try:
        last_category_index = 0
        current_category: Category | None = None
        is_under_comment = False
        for i, line in enumerate(lines):
            for j in range(last_category_index, len(categories)):
                category = categories[j]
                if category.line > i:
                    break
                current_category = category
                last_category_index = j
            line_tabs = count_tabs(line)
            trimmed_line = line.strip()
            is_comment = trimmed_line.startswith(COMMENT_SYMBOL)
            if is_comment or (line_tabs > 0 and is_under_comment):
                is_under_comment = True
            else:
                is_under_comment = False
            ld = LineDescriptor(
                index=i,
                original_line=line,
                trimmed_line=trimmed_line,
                tabs=line_tabs,
                category=current_category,
                tabbed_under=[],
                parent=None,
                is_comment=is_comment,
                sub_parts=[],
            )
            study_set.lines_descriptors.append(ld)
        for k, ld in enumerate(study_set.lines_descriptors):
            if ld.is_comment or ld.tabs == 0:
                continue
            for i in range(k - 1, -1, -1):
                prev = study_set.lines_descriptors[i]
                if prev.tabs >= ld.tabs:
                    continue
                if prev.tabs < ld.tabs:
                    ld.parent = prev
                    prev.tabbed_under.append(ld)
                break
        for ld in [x for x in study_set.lines_descriptors if not x.is_comment]:
            result = _parse_line(ld, study_set)
            if result is False:
                print(f"[parser] Fail at line {ld.index}: '{ld.original_line}'")
                return None
        return study_set
    except Exception as e:
        print(f"[parser] ERROR: {e}")
        return None


def _parse_line(line_descriptor: LineDescriptor, study_set: StudySet) -> bool:
    trimmed_line = line_descriptor.trimmed_line
    category = line_descriptor.category
    category_name = category.name if category else None
    category_line = category.line if category else None
    index = line_descriptor.index
    if len(trimmed_line) == 0:
        return True
    if category_line == index:
        return True
    if line_descriptor.is_comment:
        return True
    if line_descriptor.tabs > 0:
        return parse_command_line(line_descriptor, study_set)
    if category_name == CATEGORIES["title"]:
        if study_set.title:
            print(f"[parser] Multiple title lines found: '{study_set.title}' and '{trimmed_line}'")
            return False
        study_set.title = trimmed_line
    elif category_name == CATEGORIES["resources"]:
        return parse_resource_line(line_descriptor, study_set)
    elif category_name == CATEGORIES["cards"]:
        return parse_card_line(line_descriptor, study_set)
    elif category_name == CATEGORIES["acronyms"]:
        return parse_acronym_line(line_descriptor, study_set)
    else:
        print(f"[parser] Unrecognized category: {category_name}")
        return False
    return True
