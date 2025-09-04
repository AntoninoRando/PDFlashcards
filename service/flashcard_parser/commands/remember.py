class Remember:
    symbol = "+"

    def __init__(self, what: str):
        self.what = what

    def to_json(self):
        return {
            "name": "Remember",
            "what": self.what,
        }
