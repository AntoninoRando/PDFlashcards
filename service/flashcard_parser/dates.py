from datetime import datetime, timezone
from typing import Optional


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_iso_datetime(value: str) -> Optional[datetime]:
    """
    Parses an ISO-8601 timestamp (as written by the web app, e.g.
    `2025-01-15T10:30:00.000Z`). Naive values are assumed to be UTC so that
    every date of the parser can be compared with each other.
    """
    try:
        parsed = datetime.fromisoformat(value.strip())
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed
