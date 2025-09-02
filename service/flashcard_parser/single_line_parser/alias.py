from ..types import LineDescriptor, StudySet
from ..commands.page_ref import PageRef


def parse_acronym_line(line_descriptor: LineDescriptor, study_set: StudySet) -> bool:
    trimmed = line_descriptor.trimmed_line
    parts = trimmed.split(PageRef.symbol)
    if len(parts) != 2:
        print("[parser] Alias is not in 2-part format")
        return False
    alias, value = parts[0], parts[1]
    alias_record = {alias: value}
    study_set.aliases.append(alias_record)
    return True
