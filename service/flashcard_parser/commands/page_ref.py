import re
from typing import List, Optional, Tuple

# (resource alias, page, scroll percentage)
PageStep = Tuple[Optional[str], int, Optional[int]]


class PageRef:
    """Port of `src/Commands/All/PageRef.ts`: keep the two in sync."""

    symbol = ".."
    command_name = "pageref"

    def __init__(self, page_ref: Optional[str]):
        raw = page_ref or ""
        alias: Optional[str] = None
        page_string = raw

        # Alias separator is the first ':' or ';'
        separators = [i for i in (raw.find(":"), raw.find(";")) if i != -1]
        if separators:
            idx = min(separators)
            alias = raw[:idx].strip()
            page_string = raw[idx + 1 :].strip()

        self.pages_string = page_string
        self.resource_alias = alias
        self.all_page_refs = self._parse_page_refs(page_string, alias)
        self.page_ref = self.all_page_refs[0][1] if self.all_page_refs else 0

    @staticmethod
    def _parse_page_refs(page_ref_string: str, default_alias: Optional[str]) -> List[PageStep]:
        result: List[PageStep] = []
        tokens = [t.strip() for t in re.split(r"[;,]", page_ref_string) if t.strip()]
        current_alias = default_alias

        for token in tokens:
            work = token
            alias_for_token: Optional[str] = None
            pos = token.find(":")
            if pos != -1:
                # "alias:pages" sets the alias for the following tokens too
                alias_for_token = token[:pos].strip() or None
                work = token[pos + 1 :].strip()
                current_alias = alias_for_token
            elif not re.search(r"[0-9]", work):
                # A bare alias switches the context
                current_alias = work or None
                continue

            if not work:
                continue

            scroll: Optional[int] = None
            percent_pos = work.find("%")
            if percent_pos != -1:
                scroll = _to_int(work[percent_pos + 1 :])
                work = work[:percent_pos].strip()

            step_alias = alias_for_token or current_alias
            if "-" in work:
                start_str, _, end_str = work.partition("-")
                start, end = _to_int(start_str), _to_int(end_str)
                if start is not None and end is not None:
                    result.extend((step_alias, page, scroll) for page in range(start, end + 1))
            else:
                page = _to_int(work)
                if page is not None:
                    result.append((step_alias, page, scroll))
        return result

    def to_json(self):
        return {
            "name": PageRef.command_name,
            "ref": self.page_ref,
            "allRefs": [list(step) for step in self.all_page_refs],
            "pagesString": self.pages_string,
            "resourceAlias": self.resource_alias,
        }


def _to_int(value: str) -> Optional[int]:
    match = re.match(r"\s*(-?\d+)", value)
    return int(match.group(1)) if match else None
