import { describe, expect, it } from "vitest";
import FlashcardsScheduler from "@/Scheduler/FlashcardsScheduler";
import { parseStudyset } from "@/FlashcardParser/StudySetParser";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("FlashcardsScheduler.nextInterval", () => {
  it("uses grade-dependent stability on the first review", () => {
    const forgot = FlashcardsScheduler.nextInterval(0, 0.5, 5, null);
    const ok = FlashcardsScheduler.nextInterval(3, 0.5, 5, null);
    expect(forgot.interval).toBeLessThan(1);
    expect(ok.interval).toBeGreaterThan(5);
  });

  it("never produces a zero interval", () => {
    for (let i = 0; i < 50; i++) {
      const { interval } = FlashcardsScheduler.nextInterval(2, 0, 5, null);
      expect(interval).toBeGreaterThan(0);
    }
  });

  it("grows the interval when a card is recalled after its due date", () => {
    const reviewedAt = new Date(Date.now() - 3 * DAY_MS);
    const { interval } = FlashcardsScheduler.nextInterval(3, 2.4, 5, reviewedAt);
    expect(interval).toBeGreaterThan(2.4 * 1.5);
  });
});

describe("FlashcardsScheduler review flow", () => {
  it("computes the elapsed time from the previous review date", () => {
    const set = parseStudyset([
      "[Cards]",
      "A card",
      `\t*** ${new Date(Date.now() - 10 * DAY_MS).toISOString()}, 5, 3, false`,
    ])!;
    const card = set.flashcards[0];
    set.scheduler.addFlashcards(...set.flashcards);

    set.scheduler.updateFlashcardAfterReview(card, 3);

    // Reviewed 10 days after the previous review with stability 3: must grow
    expect(card.interval).toBeGreaterThan(3);
    expect(card.reviewCount).toBe(1);
  });

  it("serves new cards first in the active section", () => {
    const set = parseStudyset(["[Cards]", "First", "Second"])!;
    set.scheduler.addFlashcards(...set.flashcards);
    expect(set.scheduler.getFirstCard()).not.toBeNull();
  });
});
