class FlashcardsScheduler:
    def __init__(self) -> None:
        self.flashcards = []

    def add_flashcards(self, *flashcards):
        self.flashcards.extend(flashcards)
