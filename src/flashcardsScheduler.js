export default class FlashcardsScheduler {
  constructor() {
    this.flashcards = [];
    this.initialLearningPhaseFixedSteps = ['30m', '2h', '2d'];
    this.easyIntervalOnExitingLearningMode = '4d';
    this.exponentialPhaseStartingEase = 230; // Percentaage
    this.easyBonus = 130; // Percentage
    this.intervalMultiplier = 100; // Percentage
    this.maximumIntervals = 1825; // Days
  }

  resetCards() {
    this.flashcards = [];
  }

  addFlashcard(flashcard) {
    this.flashcards.push(flashcard);
  }

  addMoreFlashcards(flashcards) {
    this.flashcards.push(...flashcards);
  }

  scheduleFlashcards() {
    const now = new Date();
    const scheduledFlashcards = this.flashcards.filter(flashcard => {
      return flashcard.reviewedAt <= now;
    });

    return scheduledFlashcards;
  }

  sortCards() {
    const n = this.flashcards.filter((f) => f !== undefined).length
    console.log(`Sorting ${n} flashcard(s) by last review time`);
    this.flashcards = this.flashcards.sort((a, b) => {
      return a.reviewedAt - b.reviewedAt;
    });
    if (n > 0) {
      console.log(`First flashcard: 
          - frontText: ${this.flashcards[0].frontText};
          - pageRef: ${this.flashcards[0].pageRef};
          - reviewedAt: ${this.flashcards[0].reviewedAt}`);
    }
  }

  static intervalNoise() {
    return Math.random() * 0.1 + 0.95; // Random noise between 0.95 and 1.05
  }

  static nextInterval(learningPhase, retrievalSuccess, currentInterval, ease) {
  }
}