class Note:
    def __init__(self, text: str):
        self.text = text

    def to_json(self):
        return {
            "name": "Note",
            # Keep the same key as Remember so frontend component can be reused
            "what": self.text,
        }

