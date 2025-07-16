# PDFlashcards

A study web app oriented towards flashcards, but with a twist: _flashcards have no back text!_ Instead, each flashcard references one or more pages of a PDF resource, which is a replecament for a text. In this way, there is no need to paste from the study resources in order to create flashcards.

# Scheduling Algorithm

The scheduling of [Flashcards](src/components/Flashcards/Flashcard.vue) is handled by these files:
- [`flashcardsScheduler.js`](src/flashcardsScheduler.js): implements the scheduling logic;
- [`StudySet.vue`](src/components/Flashcards/StudySet.vue): manages the UI aspects of the studyset, and uses the logic inside the `flashcardsScheduler.js` to schedule cards as the user reviews cards;
- [`FlashcardsParser.ts`](src/FlashcardParser/FlashcardsParser.ts): converts a .txt studyset representation to its code aspect. In doing so, sets some initial study value for the flahscards, which will be used for scheduling.

[FSRS (Free Spaced Repetition Scheduler)](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm)