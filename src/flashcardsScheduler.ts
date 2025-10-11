import { IFlashcard } from "./FlashcardParser/Types/Types";

export interface CardStats {
  total: number;
  new: number;
  learning: number;
  review: number;
  overdue: number;
  badRecall: number;
}

export enum SortModes {
  learningPriority = 'learning priority', // Default
  byDueDate = 'by due date',
  random = 'random',
  originalOrder= 'original order',
}

export default class FlashcardsScheduler {
  //#region PROPERTIES ---------------------------------------------------------
  flashcards: IFlashcard[];
  sortedFlashcards: IFlashcard[];

  sortMode: SortModes = SortModes.learningPriority;
  
  /* --- Learning settings --- */
  initialLearningPhaseFixedSteps: string[];
  easyIntervalOnExitingLearningMode: string;
  defaultDifficulty: number;
  maximumIntervals: number;
  //#endregion -----------------------------------------------------------------
  


  //#region CONSTRUCTORS -------------------------------------------------------
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
  //#endregion -----------------------------------------------------------------



  //#region METHODS ------------------------------------------------------------
  /**
   * Removes every cards from the scheduler.
   */
  resetCards(): void {
    this.flashcards = [];
  }

  /**
   * 
   * @param flashcard One or more flashcards to add to the scheduler.
   */
  addFlashcards(...flashcard: IFlashcard[]): void {
    this.flashcards.push(...flashcard);
    this.sort();
  }

  /**
   * Returns the first card in the sorted list (i.e., the first card to study),
   * or null if no cards are available.
   */
  getFirstCard(): IFlashcard | null {
    console.log(`[scheduler] Getting first card from ${this.flashcards.length} sorted cards`);
    const now = new Date();
    for (const c of this.flashcards) {
      if (!c?.skippedUntil || c.skippedUntil <= now) {
        return c;
      }
    }
    return null;
  }

  /**
   * 
   * @param timeString A string representing a time duration, e.g. "30m", "2h", 
   * "3d". This string should only contain a number followed by a SINGLE
   * character representing the time unit: 'm' for minutes, 'h' for hours,
   * @returns The time duration in milliseconds.
   */
  static parseTimeString(timeString: string): number {
    const unit = timeString.slice(-1);
    const value = parseInt(timeString.slice(0, -1), 10);

    switch (unit) {
      case "m": return value * 60 * 1000;
      case "h": return value * 60 * 60 * 1000;
      case "d":
      default: return value * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Updates a flashcard's scheduling data after a review session, then sorts
   * the cards of this scheduler.
   * @param flashcard The flashcard to update.
   * @param retrievalSuccess An integer representing the recall quality:
   * 0 = "forgot", 1 = "bad", 2 = "not bad", 3 = "ok".
   * @returns The updated flashcard.
   */
  updateFlashcardAfterReview(
    flashcard: IFlashcard,
    retrievalSuccess: number
  ): IFlashcard {
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

    this.sort();
    console.log(`[scheduler] Updated card '${flashcard.text}' with:
      retrievalSuccess=${retrievalSuccess}, 
      nextReviewAt=${flashcard.nextReviewAt}, 
      interval=${flashcard.interval}, 
      ease=${flashcard.ease}`);

    return flashcard;
  }

  // Get statistics about card distribution
  getCardStats(): CardStats {
    const stats: CardStats = {
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

  static intervalNoise(): number {
    return Math.random() * 0.1 + 0.95; // Random noise between 0.95 and 1.05
  }

  /**
   * Calculate the next interval, ease, and stability for a flashcard based on
   * the Free Spaced Repetition Scheduler (FSRS) algorithm.
   * @param retrievalSuccess 
   * @param currentStability 
   * @param difficulty 
   * @param lastReviewDate 
   * @returns 
   */
  static nextInterval(
    retrievalSuccess: number,
    currentStability = 0,
    difficulty = 5,
    lastReviewDate: Date | null = null
  ): { interval: number; ease: number; stability: number } {
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


  sort(): IFlashcard | null {
    switch (this.sortMode) {
      case SortModes.byDueDate:
        this.flashcards.sort((a, b) => {
          const aTime = a.nextReviewAt ? a.nextReviewAt.getTime() : Infinity;
          const bTime = b.nextReviewAt ? b.nextReviewAt.getTime() : Infinity;
          return aTime - bTime;
        });
        break;
      case SortModes.random:
        this.flashcards.sort(() => Math.random() - 0.5);
        break;
      case SortModes.originalOrder:
        this.flashcards.sort((a, b) => 
          (a.lineDescriptor.index ?? 0) - (b.lineDescriptor.index ?? 0));
        break;
      case SortModes.learningPriority:
      default:
        this.sortFlashcardsBySchedule();
        break;
    }
    return this.getFirstCard();
  }


  // Get flashcards that are due for review
  sortFlashcardsBySchedule(): void {
    const now = new Date();

    this.flashcards.sort((a, b) => {
      // Priority 0: cards currently skipped are deprioritized
      const aSkipped = !!(a?.skippedUntil && a.skippedUntil > now);
      const bSkipped = !!(b?.skippedUntil && b.skippedUntil > now);

      if (aSkipped && !bSkipped) return 1;
      if (!aSkipped && bSkipped) return -1;
      if (aSkipped && bSkipped) {
        const at = a.skippedUntil?.getTime() ?? Infinity;
        const bt = b.skippedUntil?.getTime() ?? Infinity;
        return at - bt; // the one that becomes available sooner comes first among skipped
      }

      // Priority 1: Cards with bad recall (retrievalSuccess 0 or 1) come first
      const aBadRecall = a.retrievalSuccess !== null && a.retrievalSuccess <= 1;
      const bBadRecall = b.retrievalSuccess !== null && b.retrievalSuccess <= 1;

      if (aBadRecall && !bBadRecall) return -1;
      if (!aBadRecall && bBadRecall) return 1;

      // Priority 2: Among bad recalls, sort by how overdue they are
      if (aBadRecall && bBadRecall) {
        const aOverdue = a.nextReviewAt ? now.getTime() - a.nextReviewAt.getTime() : 0;
        const bOverdue = b.nextReviewAt ? now.getTime() - b.nextReviewAt.getTime() : 0;
        return bOverdue - aOverdue; // More overdue first
      }

      // Priority 3: Cards that have been reviewed before (but not badly)
      const aReviewed = a.reviewedAt !== null;
      const bReviewed = b.reviewedAt !== null;

      if (aReviewed && !bReviewed) return -1;
      if (!aReviewed && bReviewed) return 1;

      // Priority 4: Among reviewed cards, sort by next review time
      if (aReviewed && bReviewed) {
        return (
          (a.nextReviewAt?.getTime() ?? 0) - (b.nextReviewAt?.getTime() ?? 0)
        );
      }

      // Priority 5 - New cards (never reviewed): random order or original order
      if (!aReviewed && !bReviewed) {
        return Math.random() - 0.5;
      }

      return 0;
    });
  }
}
