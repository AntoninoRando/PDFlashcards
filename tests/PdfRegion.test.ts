import { describe, expect, it } from "vitest";
import {
  extractRegion,
  formatRegion,
  parseRegion,
  splitPageTokens,
} from "@/Utils/PdfRegion";
import { PageRef } from "@/Commands/All/PageRef";
import { parseStudyset } from "@/FlashcardParser/StudySetParser";
import {
  addRegionToCard,
  checkPages,
  documentFromText,
  documentToText,
  newCard,
  newRegionCard,
  resourceNames,
  validateDocument,
} from "@/Components/StudySetFile/Editor/EditorDocument";

describe("PdfRegion", () => {
  it("splits page lists without breaking regions", () => {
    expect(splitPageTokens("3, 12{10,20,60,30}; book: 4-5")).toEqual(["3", "12{10,20,60,30}", "book: 4-5"]);
  });

  it("reads and writes regions", () => {
    expect(parseRegion("10, 20.5, 60, 30")).toEqual({ x: 10, y: 20.5, w: 60, h: 30 });
    expect(formatRegion({ x: 10.04, y: 20.55, w: 60, h: 30 })).toBe("{10,20.6,60,30}");
  });

  it("rejects regions that are not on the page", () => {
    expect(parseRegion("10,20,60")).toBeNull();
    expect(parseRegion("50,20,60,30")).toBeNull();
    expect(parseRegion("10,20,0,30")).toBeNull();
    expect(parseRegion("a,20,60,30")).toBeNull();
  });

  it("never rounds a region off the page", () => {
    const text = formatRegion({ x: 33.35, y: 0, w: 66.65, h: 100 });
    expect(parseRegion(text.slice(1, -1))).not.toBeNull();
  });

  it("separates the region from the page", () => {
    expect(extractRegion("12{10,20,60,30}")).toEqual({ rest: "12", region: { x: 10, y: 20, w: 60, h: 30 } });
    expect(extractRegion("12")).toEqual({ rest: "12", region: null });
    expect(extractRegion("12{10,20").error).toBeDefined();
  });
});

describe("PageRef with regions", () => {
  it("adds the region to its page step", () => {
    const ref = new PageRef("book: 3, 12{10,20,60,30}, slides: 7%50");
    expect(ref.allPageRefs).toEqual([
      ["book", 3, undefined],
      ["book", 12, undefined, { x: 10, y: 20, w: 60, h: 30 }],
      ["slides", 7, 50],
    ]);
  });

  it("parses cards with regions", () => {
    const set = parseStudyset(["[Resources]", "a.pdf", "[Cards]", "What is X? .. 12{10,20,60,30}"])!;
    expect(set).not.toBeNull();
    const card = set.flashcards[0];
    expect(card.text).toBe("What is X?");
    expect(card.lineDescriptor.subParts[0].allRefs).toEqual([[null, 12, undefined, { x: 10, y: 20, w: 60, h: 30 }]]);
  });
});

describe("editor support for regions", () => {
  const TEXT = [
    "[Title]",
    "Regions",
    "",
    "[Resources]",
    "book.pdf",
    "slides.pdf",
    "\t@ sl",
    "",
    "[Cards]",
    "Red box .. 1{11.8,26.8,35.9,20.2}",
  ].join("\n");

  it("keeps region cards editable and round-trips them", () => {
    const doc = documentFromText(TEXT);
    const card = doc.entries.find((e) => e.kind === "card");
    expect(card).toMatchObject({ front: "Red box", resource: "", pages: "1{11.8,26.8,35.9,20.2}" });
    expect(documentToText(doc)).toContain("Red box .. 1{11.8,26.8,35.9,20.2}");
    expect(validateDocument(doc).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("validates regions", () => {
    const names = resourceNames(documentFromText(TEXT));
    expect(checkPages("3, 12{10,20,60,30}, sl: 2{0,0,100,100}", names)).toBeNull();
    expect(checkPages("12{10,20,60}", names)).toMatch(/invalid region/);
    expect(checkPages("3-5{10,20,60,30}", names)).toMatch(/single page/);
    expect(checkPages("12{10,20", names)).toMatch(/without/);
  });

  it("creates cards that point to the region's resource", () => {
    const doc = documentFromText(TEXT);
    const region = { x: 10, y: 20, w: 30, h: 40 };
    expect(newRegionCard(doc, "book.pdf", 4, region)).toMatchObject({ resource: "", pages: "4{10,20,30,40}" });
    expect(newRegionCard(doc, "slides.pdf", 2, region)).toMatchObject({ resource: "sl", pages: "2{10,20,30,40}" });
  });

  it("adds regions to existing cards without changing their other pages", () => {
    const doc = documentFromText(TEXT);
    const region = { x: 10, y: 20, w: 30, h: 40 };

    const empty = newCard({ answer: "textbox" });
    addRegionToCard(doc, empty, "slides.pdf", 2, region);
    expect(empty).toMatchObject({ answer: "pages", resource: "sl", pages: "2{10,20,30,40}" });

    const same = newCard({ pages: "3" });
    addRegionToCard(doc, same, "book.pdf", 5, region);
    expect(same).toMatchObject({ resource: "", pages: "3, 5{10,20,30,40}" });

    // Another resource: both resources are named, so the first pages keep theirs
    const other = newCard({ pages: "3" });
    addRegionToCard(doc, other, "slides.pdf", 5, region);
    expect(other).toMatchObject({ resource: "book.pdf", pages: "3, sl: 5{10,20,30,40}" });
    const steps = new PageRef(`${other.resource}: ${other.pages}`).allPageRefs;
    expect(steps).toEqual([
      ["book.pdf", 3, undefined],
      ["sl", 5, undefined, region],
    ]);
  });
});
