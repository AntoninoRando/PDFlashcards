from ..symbols import CATEGORIES
from ..types import LineDescriptor, StudySet


class Alias:
    symbol = "@"

    def __init__(self, alias: str, line_descriptor: LineDescriptor, study_set: StudySet):
        self.alias = alias
        self.line_descriptor = line_descriptor
        self.study_set = study_set
        self.is_valid = True
        if line_descriptor.category and line_descriptor.category.name == CATEGORIES["resources"]:
            parent = line_descriptor.parent
            if parent is None:
                print("[Alias] No parent")
                self.is_valid = False
                return
            if parent.tabs != 0:
                print("[Alias] Parent is not a resource")
                self.is_valid = False
                return
            study_set.resources[alias] = parent.original_line

    def to_json(self):
        return {
            "name": "Alias",
            "alias": self.alias,
        }
