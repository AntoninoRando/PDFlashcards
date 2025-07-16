export default class FlashcardsScheduler {
  constructor() {
    this.flashcards = [];
    this.initialLearningPhaseFixedSteps = ["30m", "2h", "2d"];
    this.easyIntervalOnExitingLearningMode = "4d";
    // Default difficulty used by the Free Spaced Repetition Scheduler (FSRS)
    // Difficulty is scaled between 1 and 10. 5 represents a medium difficulty.
    this.defaultDifficulty = 5;
    // Maximum allowed interval expressed in days
    this.maximumIntervals = 1825; // Days
  }

  resetCards() {
    this.flashcards = [];
  }

  addFlashcard(flashcard) {
    // Initialize new flashcard with default values if not present
    const defaultFlashcard = {
      reviewedAt: null,
      nextReviewAt: new Date(),
      // 'ease' is used to keep track of FSRS difficulty
      ease: this.defaultDifficulty,
      interval: 0,
      retrievalSuccess: null,
      reviewCount: 0,
      ...flashcard,
    };
    this.flashcards.push(defaultFlashcard);
  }

  addMoreFlashcards(flashcards) {
    flashcards.forEach((flashcard) => this.addFlashcard(flashcard));
  }

  // Parse time strings like '30m', '2h', '2d' into milliseconds
  parseTimeString(timeStr) {
    const unit = timeStr.slice(-1);
    const value = parseInt(timeStr.slice(0, -1));

    switch (unit) {
      case "m":
        return value * 60 * 1000; // minutes to ms
      case "h":
        return value * 60 * 60 * 1000; // hours to ms
      case "d":
        return value * 24 * 60 * 60 * 1000; // days to ms
      default:
        return value * 24 * 60 * 60 * 1000; // default to days
    }
  }

  // Update flashcard after review
  updateFlashcardAfterReview(flashcard, retrievalSuccess) {
    const now = new Date();
    const lastReview = flashcard.reviewedAt;
    flashcard.reviewedAt = now;
    flashcard.retrievalSuccess = retrievalSuccess;
    flashcard.reviewCount = (flashcard.reviewCount || 0) + 1;

    // Calculate next review time based on performance
    const result = FlashcardsScheduler.nextInterval(
      retrievalSuccess,
      flashcard.interval || 0,
      flashcard.ease ?? this.defaultDifficulty,
      lastReview
    );

    flashcard.interval = result.interval;
    flashcard.ease = result.ease;

    // Set next review time
    const nextReviewTime = new Date(
      now.getTime() + result.interval * 24 * 60 * 60 * 1000
    );
    flashcard.nextReviewAt = nextReviewTime;

    return flashcard;
  }

  // Get flashcards that are due for review
  scheduleFlashcards() {
    const now = new Date();
    const dueFlashcards = this.flashcards.filter((flashcard) => {
      // Cards without nextReviewAt or with nextReviewAt <= now are due
      return !flashcard.nextReviewAt || flashcard.nextReviewAt <= now;
    });

    // Sort by priority: bad recalls first, then by due time, then random for new cards
    return this.prioritizeFlashcards(dueFlashcards);
  }

  // Prioritize flashcards based on recall performance
  prioritizeFlashcards(flashcards) {
    const now = new Date();

    return flashcards.sort((a, b) => {
      // Priority 1: Cards with bad recall (retrievalSuccess 0 or 1) come first
      const aBadRecall = a.retrievalSuccess !== null && a.retrievalSuccess <= 1;
      const bBadRecall = b.retrievalSuccess !== null && b.retrievalSuccess <= 1;

      if (aBadRecall && !bBadRecall) return -1;
      if (!aBadRecall && bBadRecall) return 1;

      // Priority 2: Among bad recalls, sort by how overdue they are
      if (aBadRecall && bBadRecall) {
        const aOverdue = a.nextReviewAt ? now - a.nextReviewAt : 0;
        const bOverdue = b.nextReviewAt ? now - b.nextReviewAt : 0;
        return bOverdue - aOverdue; // More overdue first
      }

      // Priority 3: Cards that have been reviewed before (but not badly)
      const aReviewed = a.reviewedAt !== null;
      const bReviewed = b.reviewedAt !== null;

      if (aReviewed && !bReviewed) return -1;
      if (!aReviewed && bReviewed) return 1;

      // Priority 4: Among reviewed cards, sort by next review time
      if (aReviewed && bReviewed) {
        return (a.nextReviewAt || 0) - (b.nextReviewAt || 0);
      }

      // Priority 5: New cards (never reviewed) - add some randomness
      if (!aReviewed && !bReviewed) {
        return Math.random() - 0.5; // Random order for new cards
      }

      return 0;
    });
  }

  // Sort all cards for display/debugging purposes
  sortCards() {
    const n = this.flashcards.filter((f) => f !== undefined).length;
    console.log(`Sorting ${n} flashcard(s) by priority`);

    this.flashcards = this.prioritizeFlashcards(this.flashcards);

    if (n > 0) {
      console.log(`First flashcard:
        - frontText: ${this.flashcards[0].text};
        - reviewedAt: ${this.flashcards[0].reviewedAt};
        - nextReviewAt: ${this.flashcards[0].nextReviewAt};
        - retrievalSuccess: ${this.flashcards[0].retrievalSuccess};
        - interval: ${this.flashcards[0].interval} days`);
    }
  }

  // Get statistics about card distribution
  getCardStats() {
    const stats = {
      total: this.flashcards.length,
      new: 0,
      learning: 0,
      review: 0,
      overdue: 0,
      badRecall: 0,
    };

    const now = new Date();

    this.flashcards.forEach((card) => {
      if (card.reviewedAt === null) {
        stats.new++;
      } else if (card.interval < 1) {
        stats.learning++;
      } else {
        stats.review++;
      }

      if (card.nextReviewAt && card.nextReviewAt < now) {
        stats.overdue++;
      }

      if (card.retrievalSuccess !== null && card.retrievalSuccess <= 1) {
        stats.badRecall++;
      }
    });

    return stats;
  }

  static intervalNoise() {
    return Math.random() * 0.1 + 0.95; // Random noise between 0.95 and 1.05
  }

  static nextInterval(
    retrievalSuccess,
    currentStability = 0,
    difficulty = 5,
    lastReviewDate = null
  ) {
    // Implementation of a simplified Free Spaced Repetition Scheduler (FSRS)
    // https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
    const now = new Date();
    const elapsedDays = lastReviewDate
      ? (now.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    const retrievability = currentStability
      ? Math.exp(Math.log(0.9) * (elapsedDays / currentStability))
      : 0;

    // weights tuned roughly according to the public implementation
    const AGAIN_DIFFICULTY_DELTA = 0.8;
    const HARD_DIFFICULTY_DELTA = 0.4;
    const GOOD_DIFFICULTY_DELTA = -0.1;
    const EASY_DIFFICULTY_DELTA = -0.2;

    const HARD_FACTOR = 1.2;
    const GOOD_FACTOR = 1.8;
    const EASY_FACTOR = 2.5;

    let newDifficulty = difficulty;
    let newStability = currentStability;

    switch (retrievalSuccess) {
      case 0: // Again
        newDifficulty = Math.min(10, difficulty + AGAIN_DIFFICULTY_DELTA);
        newStability = 0.5; // restart learning
        break;
      case 1: // Hard
        newDifficulty = Math.min(10, difficulty + HARD_DIFFICULTY_DELTA);
        newStability =
          currentStability *
          (1 + HARD_FACTOR * (10 - difficulty) * (1 - retrievability));
        break;
      case 2: // Good
        newDifficulty = Math.max(1, difficulty + GOOD_DIFFICULTY_DELTA);
        newStability =
          currentStability *
          (1 + GOOD_FACTOR * (10 - difficulty) * (1 - retrievability));
        break;
      case 3: // Easy
        newDifficulty = Math.max(1, difficulty + EASY_DIFFICULTY_DELTA);
        newStability =
          currentStability *
          (1 + EASY_FACTOR * (10 - difficulty) * (1 - retrievability));
        break;
    }

    newStability = Math.min(
      Math.max(newStability * FlashcardsScheduler.intervalNoise(), 0.5),
      1825
    );

    const interval = Math.round(newStability);

    return { interval, ease: newDifficulty, stability: newStability };
  }
}
