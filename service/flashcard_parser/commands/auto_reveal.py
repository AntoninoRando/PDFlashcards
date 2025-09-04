class AutoReveal:
    symbol = "autoReveal"

    def to_json(self):
        return {
            "name": "AutoReveal",
            "autoReveal": True,
        }
