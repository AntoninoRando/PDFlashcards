class Tag:
    symbol = "#"

    def __init__(self, tag: str):
        self.tag = tag

    def to_json(self):
        return {
            "name": "Tag",
            "tag": self.tag,
        }
