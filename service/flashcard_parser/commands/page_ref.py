import re
from typing import Dict, List, Optional, Tuple, Union

# Region of a page, in % of its size: {"x", "y", "w", "h"}
Region = Dict[str, float]

# (resource alias, page, scroll percentage) plus the region, when there is one
PageStep = Union[
    Tuple[Optional[str], int, Optional[int]],
    Tuple[Optional[str], int, Optional[int], Region],
]


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
        tokens = _split_page_tokens(page_ref_string)
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

            # A single page can show a region of it: "num{x,y,w,h}"
            work, region = _extract_region(work)

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
                    if region is not None:
                        result.append((step_alias, page, scroll, region))
                    else:
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


def _split_page_tokens(pages: str) -> List[str]:
    """Splits on ',' and ';', except inside a region (port of `splitPageTokens`)."""
    tokens: List[str] = []
    depth = 0
    current = ""
    for char in pages:
        if char == "{":
            depth += 1
        elif char == "}":
            depth = max(0, depth - 1)
        if char in ",;" and depth == 0:
            tokens.append(current)
            current = ""
        else:
            current += char
    tokens.append(current)
    return [t.strip() for t in tokens if t.strip()]


def _extract_region(token: str) -> Tuple[str, Optional[Region]]:
    """Separates "12{10,20,60,30}" into "12" and the region (port of `extractRegion`)."""
    start = token.find("{")
    end = token.find("}", start) if start != -1 else -1
    if start == -1 or end == -1:
        return token, None
    rest = (token[:start] + token[end + 1 :]).strip()
    return rest, _parse_region(token[start + 1 : end])


def _parse_region(text: str) -> Optional[Region]:
    parts = [p.strip() for p in text.split(",")]
    if len(parts) != 4 or not all(re.fullmatch(r"\d+(\.\d+)?", p) for p in parts):
        return None
    x, y, w, h = (_number(p) for p in parts)
    if w <= 0 or h <= 0 or x + w > 100.05 or y + h > 100.05:
        return None
    return {"x": x, "y": y, "w": w, "h": h}


def _number(value: str) -> float:
    # Integers stay integers, so that the JSON matches the web app's numbers
    number = float(value)
    return int(number) if number.is_integer() else number


def _to_int(value: str) -> Optional[int]:
    match = re.match(r"\s*(-?\d+)", value)
    return int(match.group(1)) if match else None
