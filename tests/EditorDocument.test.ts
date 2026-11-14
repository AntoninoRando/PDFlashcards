import { describe, expect, it } from "vitest";
import { parseStudyset } from "@/FlashcardParser/StudySetParser";
import type { IStudySet } from "@/FlashcardParser/Types/Types";
import {
  checkParses,
  documentFromText,
  documentToText,
  emptyDocument,
  newCard,
  newDetail,
  newHeader,
  newResource,
  validateDocument,
  type CardEntry,
} from "@/Components/StudySetFile/Editor/EditorDocument";

const STUDY_SET = [
  "// My OS notes",
  "[Title]",
  "Operating Systems",
  "",
  "[Resources]",
  "os-book.pdf",
  "\t@ book",
  "slides.pdf",
  "",
  "[Cards]",
  "Processes",
  "\t^ 1",
  "What is a process? .. 3-4",
  "\t+ It is a program in execution",
  "\t*** 2025-01-15T10:30:00.000Z, 5, 2.5, false",
  "\t# basics",
  "Scheduling .. book: 10%50, 12",
  "\tnote Remember the quantum",
  "\t.. slides.pdf: 7",
  "// a comment",
  "\tstill a comment",
  "Threads",
  "\t^ 2",
  "Define a thread ... The smallest unit of execution",
  "\tSKIP 2099-01-01T00:00:00.000Z",
  "\t+ (nested) with",
  "\t\t# deeper",
  "",
  "[Acronyms]",
  "PCB .. Process Control Block",
].join("\n");

/** What matters of a parsed study set, without functions and components. */
function semantics(set: IStudySet | null) {
  expect(set).not.toBeNull();
  const s = set!;
  const strip = (parts: any[]): any[] =>
    parts.map(({ vueComponent: _v, sourceIndex: _s, subParts, ...rest }) => ({
      ...rest,
      subParts: strip(subParts ?? []),
    }));
  return {
    title: s.title,
    resources: s.resources,
    defaultResource: s.defaultResource,
    aliases: s.aliases.map((a) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k.trim(), v.trim()]))),
    cards: s.flashcards.map((f) => ({
      text: f.text,
      headers: f.headers,
      reviewedAt: f.reviewedAt?.toISOString() ?? null,
      interval: f.interval,
      ease: f.ease,
      skipUntil: f.skipUntil?.toISOString() ?? null,
      subParts: strip(f.lineDescriptor.subParts),
    })),
  };
}

describe("documentFromText", () => {
  const doc = documentFromText(STUDY_SET);

  it("reads title, resources and acronyms", () => {
    expect(doc.title).toBe("Operating Systems");
    expect(doc.resources.map((r) => [r.file, r.aliases])).toEqual([
      ["os-book.pdf", ["book"]],
      ["slides.pdf", []],
    ]);
    expect(doc.acronyms.map((a) => [a.alias, a.value])).toEqual([["PCB", "Process Control Block"]]);
    expect(doc.preamble).toEqual(["// My OS notes"]);
  });

  it("splits headers, cards and raw lines", () => {
    expect(doc.entries.map((e) => e.kind)).toEqual(["header", "card", "card", "raw", "header", "card"]);
    const [h1, c1, c2] = doc.entries;
    expect(h1).toMatchObject({ text: "Processes", level: 1 });
    expect(c1).toMatchObject({ front: "What is a process?", answer: "pages", resource: "", pages: "3-4" });
    expect(c2).toMatchObject({ front: "Scheduling", resource: "book", pages: "10%50, 12" });
  });

  it("keeps details in order and unknown lines verbatim", () => {
    const c1 = doc.entries[1] as CardEntry;
    expect(c1.details.map((d) => d.type)).toEqual(["remember", "recall", "tag"]);
    const c3 = doc.entries[5] as CardEntry;
    expect(c3).toMatchObject({ answer: "textbox", textBox: "The smallest unit of execution" });
    expect(c3.details.map((d) => d.type)).toEqual(["skip", "raw"]);
    expect(c3.details[1].value).toBe("+ (nested) with\n\t# deeper");
  });
});

describe("documentToText", () => {
  it("round-trips without changing the meaning", () => {
    const text = documentToText(documentFromText(STUDY_SET));
    expect(semantics(parseStudyset(text.split("\n")))).toEqual(semantics(parseStudyset(STUDY_SET.split("\n"))));
  });

  it("is stable once normalized", () => {
    const once = documentToText(documentFromText(STUDY_SET));
    expect(documentToText(documentFromText(once))).toBe(once);
  });

  it("keeps the review progress written by the app", () => {
    const text = documentToText(documentFromText(STUDY_SET));
    expect(text).toContain("\t*** 2025-01-15T10:30:00.000Z, 5, 2.5, false");
    expect(text).toContain("\tSKIP 2099-01-01T00:00:00.000Z");
  });

  it("writes a study set built from scratch", () => {
    const doc = emptyDocument(["book.pdf"]);
    doc.title = "Biology";
    doc.resources[0].aliases.push("bio");
    doc.entries = [
      newHeader({ text: "Cells" }),
      newCard({ front: "What is a cell?", resource: "bio", pages: "4-5", details: [newDetail("tag", "cells")] }),
      newCard({ front: "Mitochondria", answer: "textbox", textBox: "Powerhouse of the cell" }),
    ];
    const text = documentToText(doc);
    expect(text).toBe(
      [
        "[Title]",
        "Biology",
        "",
        "[Resources]",
        "book.pdf",
        "\t@ bio",
        "",
        "[Cards]",
        "Cells",
        "\t^ 1",
        "What is a cell? .. bio: 4-5",
        "\t# cells",
        "Mitochondria ... Powerhouse of the cell",
        "",
      ].join("\n"),
    );
    const set = parseStudyset(text.split("\n"))!;
    expect(set.flashcards.map((f) => [f.text, f.headers])).toEqual([
      ["What is a cell?", ["Cells"]],
      ["Mitochondria", ["Cells"]],
    ]);
    expect(set.resources.bio).toBe("book.pdf");
  });

  it("skips untouched empty cards", () => {
    const doc = emptyDocument();
    expect(documentToText(doc)).toBe("[Title]\n\n[Cards]\n");
  });
});

describe("validateDocument", () => {
  const base = () => {
    const doc = emptyDocument();
    doc.title = "T";
    doc.resources = [newResource("a.pdf")];
    return doc;
  };

  it("accepts a valid study set", () => {
    const doc = base();
    doc.entries = [newCard({ front: "Q", pages: "1-2, 5%30" })];
    expect(validateDocument(doc).filter((i) => i.severity === "error")).toEqual([]);
    expect(checkParses(documentToText(doc)).studySet).not.toBeNull();
  });

  it("reports card errors on the card", () => {
    const doc = base();
    const card = newCard({ front: "a .. b", resource: "nope", pages: "3-x" });
    doc.entries = [card];
    const errors = validateDocument(doc).filter((i) => i.severity === "error");
    expect(errors.every((e) => e.targetId === card.id)).toBe(true);
    expect(errors.map((e) => e.message)).toEqual([
      'The front cannot contain ".." (it starts the page reference)',
      'Unknown resource "nope"',
      '"3-x" is not a page, a range (3-5), a page with scroll (3%50) or with a region (3{10,20,60,30})',
    ]);
  });

  it("reports duplicated resource names", () => {
    const doc = base();
    doc.resources.push(newResource("a.pdf"));
    expect(validateDocument(doc).some((i) => i.message === '"a.pdf" is used by two resources')).toBe(true);
  });
});

describe("checkParses", () => {
  it("captures the parser errors", () => {
    const result = checkParses("stray line\n[Cards]\ncard");
    expect(result.studySet).toBeNull();
    expect(result.messages[0]).toContain("not under any category");
  });
});
