import { describe, expect, it } from "vitest";
import { parseStudyset } from "@/FlashcardParser/StudySetParser";
import { contentLineOf, areSiblings } from "@/FlashcardParser/Types/Types";
import { buildStudySetContent } from "@/Components/Flashcards/StudySetMethods/SaveStudySet";
import FlashcardsScheduler, { SortModes } from "@/Scheduler/FlashcardsScheduler";
import { isSubpartShown } from "@/Components/Flashcards/SubpartsVisibility";
import {
  documentFromText,
  documentToText,
  validateDocument,
  type CardEntry,
} from "@/Components/StudySetFile/Editor/EditorDocument";

const LINES = [
  "[Resources]",
  "book.pdf",
  "[Cards]",
  "What is a deadlock? .. 12{10,20,60,30}",
  "\t# os",
  "\t<>",
  "\t\t*** 2025-01-15T10:30:00.000Z, 5, 3, false",
  "Define a thread ... The smallest unit of execution",
  "\t<>",
  "A plain card .. 4",
];

describe("reverse cards", () => {
  it("adds a card studied the other way, with its own review data", () => {
    const set = parseStudyset(LINES)!;
    expect(set).not.toBeNull();
    expect(set.flashcards.map((f) => [f.text, !!f.reverseOf])).toEqual([
      ["What is a deadlock?", false],
      ["What is a deadlock?", true],
      ["Define a thread", false],
      ["Define a thread", true],
      ["A plain card", false],
    ]);

    const [card, reverse] = set.flashcards;
    expect(reverse.reverseOf).toBe(card);
    expect(reverse.lineDescriptor.trimmedLine).toBe("<>");
    // The review data under "<>" is the reverse card's, not the card's
    expect(reverse.interval).toBe(3);
    expect(reverse.reviewedAt?.toISOString()).toBe("2025-01-15T10:30:00.000Z");
    expect(card.reviewedAt).toBeNull();
    // Its pages and details are those of the card it reverses
    expect(contentLineOf(reverse)).toBe(card.lineDescriptor);
    expect(contentLineOf(card)).toBe(card.lineDescriptor);
    expect(areSiblings(card, reverse)).toBe(true);
    expect(areSiblings(card, set.flashcards[2])).toBe(false);
  });

  it("rejects a reverse that is not under a card", () => {
    expect(parseStudyset(["[Cards]", "A card", "\t<>", "\t\t<>"])).toBeNull();
    expect(parseStudyset(["[Cards]", "A card", "\t<> something"])).toBeNull();
  });

  it("saves the progress of each direction in its own place", () => {
    const set = parseStudyset(LINES)!;
    const [card, reverse, thread, threadReverse] = set.flashcards;
    card.reviewedAt = new Date("2026-02-01T00:00:00.000Z");
    card.interval = 7;
    reverse.reviewedAt = new Date("2026-02-02T00:00:00.000Z");
    reverse.interval = 2;
    threadReverse.reviewedAt = new Date("2026-02-03T00:00:00.000Z");

    const result = buildStudySetContent(set);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const out = result.content.split("\n");
    expect(out.slice(3, 12)).toEqual([
      "What is a deadlock? .. 12{10,20,60,30}",
      "\t*** 2026-02-01T00:00:00.000Z, 5, 7, true",
      "\t# os",
      "\t<>",
      "\t\t*** 2026-02-02T00:00:00.000Z, 5, 2, false",
      "Define a thread ... The smallest unit of execution",
      "\t<>",
      "\t\t*** 2026-02-03T00:00:00.000Z, 5, 0.5, true",
      "A plain card .. 4",
    ]);

    const reloaded = parseStudyset(out)!;
    expect(reloaded.flashcards.map((f) => f.interval)).toEqual([7, 2, thread.interval, 0.5, 0.5]);
  });

  it("does not show a card's reverse right after it", () => {
    const set = parseStudyset(["[Cards]", "Card A .. 1", "\t<>", "Card B .. 2"])!;
    const scheduler = new FlashcardsScheduler();
    // New cards are otherwise in random order
    scheduler.sortMode = SortModes.originalOrder;
    scheduler.addFlashcards(...set.flashcards);
    const first = scheduler.getFirstCard()!;
    expect(first.text).toBe("Card A");
    expect(first.reverseOf).toBeUndefined();

    scheduler.updateFlashcardAfterReview(first, 3);
    scheduler.resetCards();
    scheduler.addFlashcards(...set.flashcards);
    // The reverse of A is due too, but B comes first
    expect(scheduler.getFirstCard()?.text).toBe("Card B");
  });

  it("still shows the reverse when it is the only card left", () => {
    const set = parseStudyset(["[Cards]", "Card A .. 1", "\t<>"])!;
    const scheduler = new FlashcardsScheduler();
    // New cards are otherwise in random order
    scheduler.sortMode = SortModes.originalOrder;
    scheduler.addFlashcards(...set.flashcards);
    const first = scheduler.getFirstCard()!;
    scheduler.updateFlashcardAfterReview(first, 3);
    scheduler.resetCards();
    scheduler.addFlashcards(...set.flashcards);
    expect(scheduler.getFirstCard()?.reverseOf).toBe(first);
  });
});

describe("reverse cards in the editor", () => {
  const text = ["[Title]", "OS", "", "[Resources]", "book.pdf", "", "[Cards]", ...LINES.slice(3)].join("\n");

  it("reads them as a detail that keeps the reverse card's progress", () => {
    const doc = documentFromText(text);
    const cards = doc.entries.filter((e): e is CardEntry => e.kind === "card");
    expect(cards[0].details.map((d) => [d.type, d.value])).toEqual([
      ["tag", "os"],
      ["reverse", "*** 2025-01-15T10:30:00.000Z, 5, 3, false"],
    ]);
    expect(cards[1].details.map((d) => [d.type, d.value])).toEqual([["reverse", ""]]);
    expect(validateDocument(doc).filter((i) => i.severity === "error")).toEqual([]);

    // Written back as it was
    expect(documentToText(doc)).toContain(
      ["\t# os", "\t<>", "\t\t*** 2025-01-15T10:30:00.000Z, 5, 3, false"].join("\n"),
    );
    const reparsed = parseStudyset(documentToText(doc).split("\n"))!;
    expect(reparsed.flashcards.filter((f) => f.reverseOf).map((f) => f.interval)).toEqual([3, 0.5]);
  });

  it("warns when the reverse card has no answer to show", () => {
    const doc = documentFromText(["[Cards]", "Just a front", "\t<>"].join("\n"));
    const messages = validateDocument(doc).map((i) => i.message);
    expect(messages).toContain("The reverse card shows the answer first, but this card has none");
  });
});

describe("details shown before the reveal", () => {
  it("hides the text answer of a card until it is revealed", () => {
    const hidden = { revealed: false, reverse: false };
    expect(isSubpartShown("textbox", hidden)).toBe(false);
    expect(isSubpartShown("pageref", hidden)).toBe(true);
    expect(isSubpartShown("Tag", hidden)).toBe(true);
    expect(isSubpartShown("textbox", { revealed: true, reverse: false })).toBe(true);
  });

  it("shows only the question of a reverse card until it is revealed", () => {
    const hidden = { revealed: false, reverse: true };
    expect(isSubpartShown("textbox", hidden)).toBe(true);
    expect(isSubpartShown("pageref", hidden)).toBe(true);
    expect(isSubpartShown("Tag", hidden)).toBe(false);
    expect(isSubpartShown("Tag", { revealed: true, reverse: true })).toBe(true);
  });
});
