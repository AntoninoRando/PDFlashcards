import { describe, expect, it } from "vitest";
import { parseStudyset } from "@/FlashcardParser/StudySetParser";
import { buildStudySetContent } from "@/Components/Flashcards/StudySetMethods/SaveStudySet";

describe("buildStudySetContent", () => {
  it("replaces the previous recall data instead of duplicating it", () => {
    const lines = [
      "[Cards]",
      "A card .. 3",
      "\t+ remember this",
      "\t*** 2025-01-15T10:30:00.000Z, 5, 1, true",
      "Another card",
    ];
    const set = parseStudyset(lines)!;
    const card = set.flashcards[0];
    card.reviewedAt = new Date("2026-01-01T00:00:00.000Z");
    card.interval = 4;

    const result = buildStudySetContent(set);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const out = result.content.split("\n");
    expect(out.filter((l) => l.trimStart().startsWith("***"))).toEqual([
      "\t*** 2026-01-01T00:00:00.000Z, 5, 4, true",
    ]);
    expect(out).toContain("\t+ remember this");

    // Reloading the saved file keeps the new schedule
    const reloaded = parseStudyset(out)!;
    expect(reloaded.flashcards[0].interval).toBe(4);
  });

  it("skips saving when nothing was reviewed", () => {
    const set = parseStudyset(["[Cards]", "A card"])!;
    expect(buildStudySetContent(set)).toEqual({ ok: false, reason: "no-reviewed-cards" });
  });
});
