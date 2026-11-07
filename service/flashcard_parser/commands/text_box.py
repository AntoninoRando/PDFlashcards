from typing import Optional


class TextBox:
    symbol = "..."
    command_name = "textbox"

    def __init__(self, text: Optional[str]):
        self.text = text or ""

    def to_json(self):
        return {
            "name": TextBox.command_name,
            "text": self.text,
        }
