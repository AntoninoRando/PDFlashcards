from ..types import LineDescriptor, StudySet


class Header:
    symbol = "^"
    command_name = "Header"

    def __init__(self, line_descriptor: LineDescriptor, study_set: StudySet, num: int | str):
        self.level = int(num)
        parent = line_descriptor.parent
        if parent is None:
            print("[Header] Has no parent!")
            self.text = ""
            return
        f = next((f for f in study_set.flashcards if f.line_descriptor == parent), None)
        if f:
            study_set.flashcards.remove(f)
        self.text = parent.trimmed_line
        study_set.headers.append(parent)

    def to_json(self):
        return {
            "name": Header.command_name,
            "level": self.level,
            "text": self.text,
        }
