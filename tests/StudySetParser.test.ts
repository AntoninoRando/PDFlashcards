import { describe, expect, it } from "vitest";
import { parseStudyset } from "@/FlashcardParser/StudySetParser";

const STUDY_SET = [
  "[Title]",
  "Operating Systems",
  "",
  "[Resources]",
  "os-book.pdf",
  "\t@ book",
  "",
  "[Cards]",
  "Processes",
  "\t^ 1",
  "What is a process? .. 3-4",
  "\t+ It is a program in execution",
  "\t*** 2025-01-15T10:30:00.000Z, 5, 2.5, false",
  "Scheduling .. book: 10%50, 12",
];

describe("parseStudyset", () => {
  it("parses title, resources, headers and cards", () => {
    const set = parseStudyset(STUDY_SET)!;
    expect(set).not.toBeNull();
    expect(set.title).toBe("Operating Systems");
    expect(set.resources.book).toBe("os-book.pdf");
    expect(set.flashcards.map((f) => f.text)).toEqual(["What is a process?", "Scheduling"]);
    expect(set.flashcards.every((f) => f.headers[0] === "Processes")).toBe(true);
  });

  it("does not mark new cards as badly recalled", () => {
    const card = parseStudyset(STUDY_SET)!.flashcards[1];
    expect(card.reviewedAt).toBeNull();
    expect(card.retrievalSuccess).toBeNull();
  });

  it("applies recall data to its card", () => {
    const card = parseStudyset(STUDY_SET)!.flashcards[0];
    expect(card.reviewedAt?.toISOString()).toBe("2025-01-15T10:30:00.000Z");
    expect(card.interval).toBe(2.5);
    expect(card.learningPhase).toBe(false);
  });

  it("supports CRLF files and blank lines before the first category", () => {
    const crlf = ("\r\n" + STUDY_SET.join("\r\n")).split(/\r?\n/);
    const set = parseStudyset(crlf)!;
    expect(set).not.toBeNull();
    expect(set.resources.book).toBe("os-book.pdf");
  });

  it("handles a page reference without argument", () => {
    const set = parseStudyset(["[Cards]", "A card", "\t.."]);
    expect(set).not.toBeNull();
  });

  it("ignores lines tabbed under a comment, but not their siblings", () => {
    const set = parseStudyset([
      "[Cards]",
      "// Commented card .. 1",
      "\tbogus command under the comment",
      "Card .. 2",
      "\t// Commented detail",
      "\t\tbogus command under the comment",
      "\t+ Still a detail of the card",
    ]);
    expect(set).not.toBeNull();
    expect(set!.flashcards.map((f) => f.text)).toEqual(["Card"]);
    const remember = set!.flashcards[0].lineDescriptor.subParts.find((p) => p.name === "Remember");
    expect(remember?.what).toBe("Still a detail of the card");
  });

  it("fails on text outside any category", () => {
    expect(parseStudyset(["stray line", "[Cards]", "card"])).toBeNull();
  });
});
