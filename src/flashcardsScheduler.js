export default class FlashcardsScheduler {
  constructor() {
    this.flashcards = [];
    this.initialLearningPhaseFixedSteps = ["30m", "2h", "2d"];
    this.easyIntervalOnExitingLearningMode = "4d";
    this.exponentialPhaseStartingEase = 230; // Percentage
    this.easyBonus = 130; // Percentage
    this.intervalMultiplier = 100; // Percentage
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
      ease: this.exponentialPhaseStartingEase,
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
    flashcard.reviewedAt = now;
    flashcard.retrievalSuccess = retrievalSuccess;
    flashcard.reviewCount = (flashcard.reviewCount || 0) + 1;

    // Calculate next review time based on performance
    const result = FlashcardsScheduler.nextInterval(
      retrievalSuccess,
      flashcard.interval || 0,
      flashcard.ease || this.exponentialPhaseStartingEase
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

  static nextInterval(retrievalSuccess, currentInterval = 0, ease = 250) {
    const minEase = 130;
    let newEase = ease;
    let interval = currentInterval;

    if (retrievalSuccess === 0) {
      // Again/Failed - reset to 1 day, decrease ease significantly
      interval = 1;
      newEase = Math.max(minEase, ease - 20);
    } else if (retrievalSuccess === 1) {
      // Hard - increase slightly, decrease ease
      interval = Math.max(1, currentInterval * 1.2);
      newEase = Math.max(minEase, ease - 15);
    } else if (retrievalSuccess === 2) {
      // Good - normal interval based on ease
      interval = Math.max(
        1,
        currentInterval === 0 ? 1 : currentInterval * (ease / 100)
      );
    } else if (retrievalSuccess === 3) {
      // Easy - longer interval, increase ease
      newEase = ease + 15;
      interval = Math.max(
        1,
        currentInterval === 0 ? 4 : currentInterval * (ease / 100) * 1.3
      );
    }

    // Apply noise and constraints
    interval = interval * FlashcardsScheduler.intervalNoise();
    interval = Math.min(Math.round(interval), 1825);

    return { interval, ease: newEase };
  }
}
