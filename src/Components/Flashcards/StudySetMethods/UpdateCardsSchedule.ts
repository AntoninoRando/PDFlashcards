import {
  HideOption,
  IFlashcard,
  IStudySet
} from "@/FlashcardParser/Types/Types";

const grades: Record<string, number> = {
  'forgot': 0,
  'bad': 1,
  'not bad': 2,
  'ok': 3,
};
  
export function updateCardsSchedule(
    flashcard: IFlashcard,
    recall: HideOption,
    studySet: IStudySet
) {
  if (!flashcard || recall === 'hide') return;

  // Special handling: Skip means postpone this card by 30 minutes without affecting recall data
  if (recall === 'skip') {
    const snapshot = {
      reviewedAt: flashcard.reviewedAt,
      nextReviewAt: flashcard.nextReviewAt,
      interval: flashcard.interval,
      ease: flashcard.ease,
      retrievalSuccess: flashcard.retrievalSuccess,
      reviewCount: flashcard.reviewCount,
      learningPhase: flashcard.learningPhase,
      skippedUntil: flashcard.skippedUntil ?? null,
    };
    studySet.history.push({
      index: studySet.flashcards.indexOf(flashcard),
      snapshot,
    });

    const until = new Date(Date.now() + 30 * 60 * 1000);
    flashcard.skippedUntil = until;

    // Also attach a command-like subpart for runtime visibility
    try {
      const receiver: any = flashcard.lineDescriptor;
      receiver?.subParts?.push({ name: 'Skipped', vueComponent: null, until });
    } catch { /* noop */ }

    // Recompute order in scheduler so this card drops down
    studySet.scheduler.resetCards();
    studySet.scheduler.addFlashcards(...studySet.flashcards);
    return;
  }

  const retrievalSuccess = grades[recall] ?? 0;

  const snapshot = {
    reviewedAt: flashcard.reviewedAt,
    nextReviewAt: flashcard.nextReviewAt,
    interval: flashcard.interval,
    ease: flashcard.ease,
    retrievalSuccess: flashcard.retrievalSuccess,
    reviewCount: flashcard.reviewCount,
    learningPhase: flashcard.learningPhase
  }
  studySet.history.push({
    index: studySet.flashcards.indexOf(flashcard), 
    snapshot
  });

  // Use the scheduler's updateFlashcardAfterReview method on the original flashcard
  studySet.scheduler.updateFlashcardAfterReview(flashcard, retrievalSuccess);
  // Update learning phase status
  flashcard.learningPhase = flashcard.interval < 1;

  console.log(
    '[studySet/updateCardsSchedule] Card updated:\n' +
    `\t-reviewedAt=${flashcard.reviewedAt};\n` +
    `\t-nextReviewAt=${flashcard.nextReviewAt};\n` +
    `\t-interval=${flashcard.interval};\n` +
    `\t-ease=${flashcard.ease},`);

  const n = studySet.flashcards.filter((f: any) => f !== undefined).length;
  if (n === 0) {
    console.log("No cards to update");
    return;
  }

  if (studySet) {
    studySet.studiedCards = (studySet.studiedCards || 0) + 1;
  }

  // Reset and repopulate scheduler with updated flashcards
  studySet.scheduler.resetCards();
  studySet.scheduler.addFlashcards(...studySet.flashcards);
};
