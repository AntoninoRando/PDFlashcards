from ..types import LineDescriptor, StudySet


def parse_resource_line(line_descriptor: LineDescriptor, study_set: StudySet) -> bool:
    trimmed = line_descriptor.trimmed_line
    study_set.resources[trimmed] = trimmed
    if not study_set.default_resource:
        print("[parser] Using resource as default")
        study_set.default_resource = trimmed
    return True
