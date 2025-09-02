from ..types import LineDescriptor


class Example:
    command_name = "Example"

    def __init__(self, line_descriptor: LineDescriptor, text: str | None):
        self.line_descriptor = line_descriptor
        self.text = (text or "").strip()

    def to_json(self):
        return {
            "name": Example.command_name,
            "text": self.text,
        }
