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
          - frontText: ${this.flashcards[0].text};
          - reviewedAt: ${this.flashcards[0].reviewedAt}`);
    }
  }

  static intervalNoise() {
    return Math.random() * 0.1 + 0.95; // Random noise between 0.95 and 1.05
  }

  static nextInterval(retrievalSuccess, currentInterval = 0, ease = 250) {
    const minEase = 130;
    let newEase = ease;
    let interval = currentInterval;

    if (retrievalSuccess === 0) {
      interval = 1;
      newEase = Math.max(minEase, ease - 20);
    } else if (retrievalSuccess === 1) {
      interval = Math.max(1, currentInterval * 1.2);
      newEase = Math.max(minEase, ease - 15);
    } else if (retrievalSuccess === 2) {
      interval = currentInterval * (ease / 100);
    } else if (retrievalSuccess === 3) {
      newEase = ease + 15;
      interval = currentInterval * (ease / 100) * 1.3;
    }

    interval = interval * FlashcardsScheduler.intervalNoise();
    interval = Math.min(Math.round(interval), 1825);

    return { interval, ease: newEase };
  }
}