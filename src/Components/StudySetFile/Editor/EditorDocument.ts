/*
  Structured representation of a study-set file used by the in-app editor.

  `documentFromText` turns the `.txt` DSL into an `EditorDocument` the editor
  can bind to, and `documentToText` writes it back. Everything the editor does
  not model (review data, skip dates, comments, nested or unknown commands) is
  kept verbatim as "raw" lines, so opening and saving a study set never loses
  information such as the review progress.
*/

import { countTabs } from "@/FlashcardParser/LineTabCounter";
import { parseStudyset } from "@/FlashcardParser/StudySetParser";
import {
  CATEGORIES,
  CATEGORY_END_SYMBOL,
  CATEGORY_START_SYMBOL,
  COMMENT_SYMBOL,
} from "@/FlashcardParser/Symbols";
import type { IStudySet } from "@/FlashcardParser/Types/Types";
import { extractRegion, formatRegion, splitPageTokens, type PdfRegion } from "@/Utils/PdfRegion";

//#region TYPES ----------------------------------------------------------------
/** Kinds of child lines of a card the editor knows how to edit. */
export type DetailType =
  | "remember"
  | "tag"
  | "note"
  | "example"
  | "recap"
  | "pages"
  | "autoReveal"
  | "reverse"
  | "recall"
  | "skip"
  | "raw";

export interface CardDetail {
  id: number;
  type: DetailType;
  /**
   * The command argument. For `recall` and `skip` it is the whole command line
   * and for `raw` the lines (indented with tabs relative to the detail level).
   */
  value: string;
}

export type AnswerType = "pages" | "textbox";

export interface CardEntry {
  kind: "card";
  id: number;
  front: string;
  answer: AnswerType;
  /** Resource alias (or file name) of the pages; empty for the default one. */
  resource: string;
  /** Page list, e.g. `3-4, 10%50`. */
  pages: string;
  textBox: string;
  details: CardDetail[];
}

export interface HeaderEntry {
  kind: "header";
  id: number;
  text: string;
  level: number;
  /** Other lines tabbed under the header, kept verbatim (relative tabs). */
  extra: string;
}

/** Lines of the cards section the editor does not model (e.g. comments). */
export interface RawEntry {
  kind: "raw";
  id: number;
  text: string;
}

export type Entry = CardEntry | HeaderEntry | RawEntry;

export interface ResourceEntry {
  id: number;
  file: string;
  aliases: string[];
  /** Other lines tabbed under the resource, kept verbatim (relative tabs). */
  extra: string;
}

export interface AcronymEntry {
  id: number;
  alias: string;
  value: string;
}

export interface RawSection {
  name: string;
  lines: string[];
}

export interface EditorDocument {
  title: string;
  resources: ResourceEntry[];
  entries: Entry[];
  acronyms: AcronymEntry[];
  /** Lines before the first category (comments). */
  preamble: string[];
  titleExtra: string[];
  resourcesExtra: string[];
  acronymsExtra: string[];
  /** Categories the editor does not know, kept verbatim. */
  otherSections: RawSection[];
}

export interface DetailKind {
  type: DetailType;
  label: string;
  placeholder: string;
  /** Whether the user can add it from the "Add detail" menu. */
  addable: boolean;
}

export const DETAIL_KINDS: Record<DetailType, DetailKind> = {
  remember: { type: "remember", label: "Remember", placeholder: "Something to keep in mind when revealing", addable: true },
  note: { type: "note", label: "Note", placeholder: "A note shown on the card", addable: true },
  example: { type: "example", label: "Example", placeholder: "An example", addable: true },
  recap: { type: "recap", label: "Recap", placeholder: "A short recap of the answer", addable: true },
  tag: { type: "tag", label: "Tag", placeholder: "tag-name", addable: true },
  pages: { type: "pages", label: "More pages", placeholder: "e.g. other-book: 40-41", addable: true },
  autoReveal: { type: "autoReveal", label: "Auto-reveal", placeholder: "", addable: true },
  reverse: { type: "reverse", label: "Reverse", placeholder: "", addable: true },
  recall: { type: "recall", label: "Review data", placeholder: "", addable: false },
  skip: { type: "skip", label: "Skipped", placeholder: "", addable: false },
  raw: { type: "raw", label: "Raw lines", placeholder: "Lines written in the study-set syntax", addable: false },
};
//#endregion -------------------------------------------------------------------



//#region IDS AND FACTORIES ----------------------------------------------------
let lastId = 0;
export function nextId(): number {
  return ++lastId;
}

export function newCard(partial: Partial<CardEntry> = {}): CardEntry {
  return {
    kind: "card",
    id: nextId(),
    front: "",
    answer: "pages",
    resource: "",
    pages: "",
    textBox: "",
    details: [],
    ...partial,
  };
}

export function newHeader(partial: Partial<HeaderEntry> = {}): HeaderEntry {
  return { kind: "header", id: nextId(), text: "", level: 1, extra: "", ...partial };
}

export function newDetail(type: DetailType, value = ""): CardDetail {
  return { id: nextId(), type, value };
}

export function newResource(file = ""): ResourceEntry {
  return { id: nextId(), file, aliases: [], extra: "" };
}

export function newAcronym(): AcronymEntry {
  return { id: nextId(), alias: "", value: "" };
}

export function emptyDocument(resourceFiles: string[] = []): EditorDocument {
  return {
    title: "",
    resources: resourceFiles.map((f) => newResource(f)),
    entries: [newCard()],
    acronyms: [],
    preamble: [],
    titleExtra: [],
    resourcesExtra: [],
    acronymsExtra: [],
    otherSections: [],
  };
}

/** Deep copy of an entry with fresh ids (used to duplicate cards). */
export function cloneEntry<T extends Entry>(entry: T): T {
  const copy = JSON.parse(JSON.stringify(entry)) as T;
  copy.id = nextId();
  if (copy.kind === "card") {
    // Review data and skip dates belong to the original card only
    copy.details = copy.details
      .filter((d) => d.type !== "recall" && d.type !== "skip")
      .map((d) => ({ ...d, id: nextId() }));
  }
  return copy;
}
//#endregion -------------------------------------------------------------------



//#region TEXT -> DOCUMENT -----------------------------------------------------
/** A non-blank line together with the lines tabbed under it. */
interface Block {
  head: string;
  tabs: number;
  /** All the lines of the block, the head included. */
  lines: string[];
}

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

function isCategoryLine(line: string): boolean {
  const t = line.trim();
  return !t.startsWith(COMMENT_SYMBOL) && t.startsWith(CATEGORY_START_SYMBOL) && t.endsWith(CATEGORY_END_SYMBOL);
}

/**
 * Splits lines into blocks: a line plus the following lines with more tabs.
 * Blank lines end a block (the parser would not attach what follows to it).
 */
function toBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  for (const line of lines) {
    if (isBlank(line)) {
      current = null;
      continue;
    }
    const tabs = countTabs(line);
    if (current && tabs > current.tabs) {
      current.lines.push(line);
    } else {
      current = { head: line.trim(), tabs, lines: [line] };
      blocks.push(current);
    }
  }
  return blocks;
}

/** Re-indents lines so that `baseTabs` becomes zero tabs. */
function relativeLines(lines: string[], baseTabs: number): string[] {
  return lines.map((l) => "\t".repeat(Math.max(0, countTabs(l) - baseTabs)) + l.trim());
}

function splitCommand(line: string): { token: string; arg: string } {
  const space = line.indexOf(" ");
  let token = space === -1 ? line : line.slice(0, space);
  const arg = space === -1 ? "" : line.slice(space + 1).trim();
  if (token.startsWith("\\")) token = token.slice(1);
  return { token, arg };
}

const DETAIL_TOKENS: Record<string, DetailType> = {
  "+": "remember",
  remember: "remember",
  "#": "tag",
  tag: "tag",
  note: "note",
  Note: "note",
  example: "example",
  Example: "example",
  recap: "recap",
  Recap: "recap",
  "..": "pages",
  page: "pages",
  autoReveal: "autoReveal",
  auto_reveal: "autoReveal",
  "<>": "reverse",
  reverse: "reverse",
  "***": "recall",
  recall_data: "recall",
  SKIP: "skip",
  Skip: "skip",
  skip: "skip",
};

const HEADER_TOKENS = ["^", "header"];

function detailFromBlock(block: Block): CardDetail {
  const raw = (): CardDetail => newDetail("raw", relativeLines(block.lines, block.tabs).join("\n"));

  // A reverse card: its review data (nested lines) is kept as written, under it
  const head = splitCommand(block.head);
  if (block.lines.length > 1 && DETAIL_TOKENS[head.token] === "reverse" && !head.arg) {
    return newDetail("reverse", relativeLines(block.lines.slice(1), block.tabs + 1).join("\n"));
  }

  // Nested lines or inline sub-commands: keep them as written
  if (block.lines.length > 1 || block.head.startsWith(COMMENT_SYMBOL)) return raw();
  const { token, arg } = splitCommand(block.head);
  if (token.includes("(")) return raw();

  const type = DETAIL_TOKENS[token];
  if (!type) return raw();
  if (type === "recall" || type === "skip") return newDetail(type, block.head);
  if (type === "autoReveal" || type === "reverse") return arg ? raw() : newDetail(type);
  if (!arg) return raw();
  return newDetail(type, arg);
}

/** Splits `alias: pages` into its parts, when it is unambiguous. */
export function splitResource(ref: string): { resource: string; pages: string } {
  const colon = ref.indexOf(":");
  const semi = ref.indexOf(";");
  const idx = [colon, semi].filter((i) => i !== -1).sort((a, b) => a - b)[0];
  if (idx !== undefined) {
    const prefix = ref.slice(0, idx).trim();
    if (prefix && !/[,;:]/.test(prefix)) {
      return { resource: prefix, pages: ref.slice(idx + 1).trim() };
    }
  }
  return { resource: "", pages: ref.trim() };
}

/** Builds the entry for a top-level line of the cards section. */
function entryFromBlock(block: Block): Entry {
  const asRaw = (): RawEntry => ({ kind: "raw", id: nextId(), text: block.lines.join("\n") });

  // Orphan lines (tabbed under nothing) and comments
  if (block.tabs > 0 || block.head.startsWith(COMMENT_SYMBOL)) return asRaw();

  const children = toBlocks(block.lines.slice(1));

  // A line with a header command under it is a section header
  const headerIdx = children.findIndex((c) => {
    const { token } = splitCommand(c.head);
    return c.lines.length === 1 && HEADER_TOKENS.includes(token);
  });
  if (headerIdx !== -1) {
    const { arg } = splitCommand(children[headerIdx].head);
    const level = Number(arg || 1);
    if (!Number.isInteger(level) || level < 1) return asRaw();
    const others = children.filter((_, i) => i !== headerIdx);
    const extra = others.flatMap((c) => relativeLines(c.lines, c.tabs)).join("\n");
    return newHeader({ text: block.head, level, extra });
  }

  // Front text and inline answer, following the card parser
  const card = newCard();
  const line = block.head;
  const textBoxParts = line.split("...");
  const pageParts = line.split("..");
  if (textBoxParts.length === 2) {
    card.front = textBoxParts[0].trim();
    card.answer = "textbox";
    card.textBox = textBoxParts[1].trim();
    if (card.front.includes("..") || /^\S*\(/.test(textBoxParts[1].trimStart())) return asRaw();
  } else if (pageParts.length === 2) {
    card.front = pageParts[0].trim();
    const ref = pageParts[1].trim();
    if (/^\S*\(/.test(ref)) return asRaw();
    Object.assign(card, splitResource(ref));
  } else if (pageParts.length > 2) {
    // The front text itself contains ".." and cannot be edited as a field
    return asRaw();
  } else {
    card.front = line;
  }

  card.details = children.map(detailFromBlock);
  return card;
}

export function documentFromText(text: string): EditorDocument {
  const doc: EditorDocument = { ...emptyDocument(), entries: [] };
  const lines = text.split(/\r?\n/);

  // Group lines by category
  const sections: RawSection[] = [];
  let current: RawSection | null = null;
  for (const line of lines) {
    if (isCategoryLine(line)) {
      const t = line.trim();
      current = { name: t.slice(1, -1), lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else if (!isBlank(line)) {
      doc.preamble.push(line);
    }
  }

  for (const section of sections) {
    const blocks = toBlocks(section.lines);
    switch (section.name) {
      case CATEGORIES.title:
        for (const b of blocks) {
          if (!doc.title && b.tabs === 0 && !b.head.startsWith(COMMENT_SYMBOL) && b.lines.length === 1) {
            doc.title = b.head;
          } else {
            doc.titleExtra.push(...b.lines);
          }
        }
        break;

      case CATEGORIES.resources:
        for (const b of blocks) {
          if (b.tabs > 0 || b.head.startsWith(COMMENT_SYMBOL)) {
            doc.resourcesExtra.push(...b.lines);
            continue;
          }
          const resource = newResource(b.head);
          const extra: string[] = [];
          for (const child of toBlocks(b.lines.slice(1))) {
            const { token, arg } = splitCommand(child.head);
            if (child.lines.length === 1 && (token === "@" || token === "alias") && arg) {
              resource.aliases.push(arg);
            } else {
              extra.push(...relativeLines(child.lines, child.tabs));
            }
          }
          resource.extra = extra.join("\n");
          doc.resources.push(resource);
        }
        break;

      case CATEGORIES.cards:
        doc.entries.push(...blocks.map(entryFromBlock));
        break;

      case CATEGORIES.acronyms:
        for (const b of blocks) {
          const parts = b.head.split("..");
          if (b.tabs === 0 && b.lines.length === 1 && parts.length === 2 && !b.head.startsWith(COMMENT_SYMBOL)) {
            doc.acronyms.push({ id: nextId(), alias: parts[0].trim(), value: parts[1].trim() });
          } else {
            doc.acronymsExtra.push(...b.lines);
          }
        }
        break;

      default:
        doc.otherSections.push(section);
    }
  }

  return doc;
}
//#endregion -------------------------------------------------------------------



//#region DOCUMENT -> TEXT -----------------------------------------------------
function oneLine(value: string): string {
  return value.replace(/\s*\r?\n\s*/g, " ").trim();
}

function indent(text: string, tabs: number): string[] {
  if (!text.trim()) return [];
  return text
    .split(/\r?\n/)
    .filter((l) => !isBlank(l))
    .map((l) => "\t".repeat(tabs) + l.trimEnd());
}

/** A card the user added but did not fill: it is not written to the file. */
export function isEmptyCard(card: CardEntry): boolean {
  return !card.front.trim() && !card.details.length && !card.pages.trim() && !card.textBox.trim();
}

export function pageRefOf(card: Pick<CardEntry, "resource" | "pages">): string {
  const pages = oneLine(card.pages);
  const resource = oneLine(card.resource);
  return resource ? `${resource}: ${pages}` : pages;
}

/** File of the default resource (the first one), or "" when there is none. */
export function defaultResourceFile(doc: EditorDocument): string {
  return doc.resources.find((r) => r.file.trim())?.file.trim() ?? "";
}

/** Shortest name a card can use for a resource file: its first alias, else the file name. */
export function resourceNameFor(doc: EditorDocument, file: string): string {
  const resource = doc.resources.find((r) => r.file.trim() === file);
  return resource?.aliases.find((a) => a.trim())?.trim() ?? file;
}

/** A page with a region, as written in a page list: `12{10,20,60,30}`. */
export function regionToken(page: number, region: PdfRegion): string {
  return `${page}${formatRegion(region)}`;
}

/** A new card whose answer is a region of a page of `file`. */
export function newRegionCard(doc: EditorDocument, file: string, page: number, region: PdfRegion): CardEntry {
  const resource = file === defaultResourceFile(doc) ? "" : resourceNameFor(doc, file);
  return newCard({ answer: "pages", resource, pages: regionToken(page, region) });
}

/**
 * Adds a region of a page of `file` to the pages a card opens (the card's
 * answer becomes "PDF pages" if it was a text).
 */
export function addRegionToCard(
  doc: EditorDocument,
  card: CardEntry,
  file: string,
  page: number,
  region: PdfRegion,
): void {
  const token = regionToken(page, region);
  const defaultFile = defaultResourceFile(doc);
  card.answer = "pages";

  if (!card.pages.trim()) {
    card.resource = file === defaultFile ? "" : resourceNameFor(doc, file);
    card.pages = token;
    return;
  }

  const names = resourceNames(doc);
  const cardFile = card.resource.trim() ? (names.get(card.resource.trim()) ?? card.resource.trim()) : defaultFile;
  // An alias inside the list ("other: 5") applies to the pages after it too:
  // only a list without aliases can take a bare page of the card's resource.
  if (cardFile === file && !card.pages.includes(":")) {
    card.pages = `${card.pages.trim()}, ${token}`;
    return;
  }

  // Name the resource explicitly. The card's own resource must be explicit
  // too: "3, book: 5" would read "3, book" as the resource name.
  if (!card.resource.trim()) card.resource = resourceNameFor(doc, defaultFile);
  card.pages = `${card.pages.trim()}, ${resourceNameFor(doc, file)}: ${token}`;
}

/**
 * Turns text selected in a PDF into a card front: one line, and nothing the
 * study-set syntax would read as something else.
 */
export function cardFrontFromText(text: string): string {
  let front = text
    // Words hyphenated at the end of a line ("dead-\nlock")
    .replace(/(\p{Ll})-\s*\n\s*(\p{Ll})/gu, "$1$2")
    .replace(/\s+/g, " ")
    .trim()
    // ".." starts the page reference: an ellipsis keeps the meaning
    .replace(/\.{2,}/g, "…")
    // The front is shown as HTML: keep "<" and ">" as text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // A comment or a category line
  while (front.startsWith(COMMENT_SYMBOL)) front = front.slice(COMMENT_SYMBOL.length).trim();
  if (front.startsWith(CATEGORY_START_SYMBOL) && front.endsWith(CATEGORY_END_SYMBOL)) {
    front = front.slice(1, -1).trim();
  }
  return front;
}

function detailLines(detail: CardDetail): string[] {
  const value = detail.type === "raw" ? detail.value : oneLine(detail.value);
  switch (detail.type) {
    case "remember": return value ? [`\t+ ${value}`] : [];
    case "tag": return value ? [`\t# ${value}`] : [];
    case "note": return value ? [`\tnote ${value}`] : [];
    case "example": return value ? [`\texample ${value}`] : [];
    case "recap": return value ? [`\trecap ${value}`] : [];
    case "pages": return value ? [`\t.. ${value}`] : [];
    case "autoReveal": return ["\tautoReveal"];
    // Its value: the lines under it (the reverse card's review data), kept as written
    case "reverse": return ["\t<>", ...indent(detail.value, 2)];
    case "recall":
    case "skip": return value ? [`\t${value}`] : [];
    case "raw": return indent(value, 1);
  }
}

export function cardLines(card: CardEntry): string[] {
  let line = oneLine(card.front);
  if (card.answer === "textbox") {
    const text = oneLine(card.textBox);
    if (text) line += ` ... ${text}`;
  } else {
    const ref = pageRefOf(card);
    if (ref) line += ` .. ${ref}`;
  }
  return [line, ...card.details.flatMap(detailLines)];
}

export function documentToText(doc: EditorDocument): string {
  const out: string[] = [];
  const blank = () => {
    if (out.length && out[out.length - 1] !== "") out.push("");
  };

  out.push(...doc.preamble);
  blank();

  out.push(`[${CATEGORIES.title}]`);
  if (oneLine(doc.title)) out.push(oneLine(doc.title));
  out.push(...doc.titleExtra);
  blank();

  if (doc.resources.length || doc.resourcesExtra.length) {
    out.push(`[${CATEGORIES.resources}]`);
    for (const r of doc.resources) {
      if (!oneLine(r.file)) continue;
      out.push(oneLine(r.file));
      for (const a of r.aliases) if (oneLine(a)) out.push(`\t@ ${oneLine(a)}`);
      out.push(...indent(r.extra, 1));
    }
    out.push(...doc.resourcesExtra);
    blank();
  }

  out.push(`[${CATEGORIES.cards}]`);
  doc.entries.forEach((entry, i) => {
    if (entry.kind === "card") {
      if (isEmptyCard(entry)) return;
      out.push(...cardLines(entry));
    } else if (entry.kind === "header") {
      if (i > 0) blank();
      out.push(oneLine(entry.text), `\t^ ${entry.level}`, ...indent(entry.extra, 1));
    } else if (entry.text.trim()) {
      // A blank line keeps tabbed raw lines from attaching to the previous card
      blank();
      out.push(...entry.text.split(/\r?\n/).filter((l) => !isBlank(l)));
      out.push("");
    }
  });
  blank();

  if (doc.acronyms.length || doc.acronymsExtra.length) {
    out.push(`[${CATEGORIES.acronyms}]`);
    for (const a of doc.acronyms) {
      if (oneLine(a.alias) || oneLine(a.value)) out.push(`${oneLine(a.alias)} .. ${oneLine(a.value)}`);
    }
    out.push(...doc.acronymsExtra);
    blank();
  }

  for (const s of doc.otherSections) {
    out.push(`[${s.name}]`, ...s.lines);
    blank();
  }

  while (out.length && out[out.length - 1] === "") out.pop();
  return out.join("\n") + "\n";
}
//#endregion -------------------------------------------------------------------



//#region VALIDATION -----------------------------------------------------------
export type Severity = "error" | "warning";

export interface Issue {
  severity: Severity;
  message: string;
  /** Entry (card/header/raw) or resource the issue is about. */
  targetId?: number;
}

export interface ParseCheck {
  studySet: IStudySet | null;
  /** Errors reported by the parser (also for study sets that parse). */
  messages: string[];
}

/**
 * Runs the real study-set parser on `text`, capturing what it reports instead
 * of flooding the console (the editor validates on every change).
 */
export function checkParses(text: string): ParseCheck {
  const messages: string[] = [];
  const saved = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = (...args: unknown[]) => {
    messages.push(args.map(String).join(" ").replace(/^\[\w+\]\s*/, ""));
  };
  try {
    return { studySet: parseStudyset(text.split(/\r?\n/)), messages };
  } finally {
    Object.assign(console, saved);
  }
}

/** Resource names (aliases and file names) a page reference can use. */
export function resourceNames(doc: EditorDocument): Map<string, string> {
  const names = new Map<string, string>();
  for (const r of doc.resources) {
    const file = r.file.trim();
    if (!file) continue;
    names.set(file, file);
    for (const a of r.aliases) if (a.trim()) names.set(a.trim(), file);
  }
  return names;
}

const PAGE_TOKEN = /^\d+(\s*-\s*\d+)?(\s*%\s*\d+)?$/;

/** Checks a page list; returns an error message or null. */
export function checkPages(pages: string, names: Map<string, string>): string | null {
  for (const token of splitPageTokens(pages)) {
    const colon = token.indexOf(":");
    const alias = colon === -1 ? (/\d/.test(token) ? "" : token) : token.slice(0, colon).trim();
    let work = colon === -1 ? (alias ? "" : token) : token.slice(colon + 1).trim();
    if (alias && !names.has(alias)) return `Unknown resource "${alias}"`;

    const { rest, region, error } = extractRegion(work);
    if (error) return error;
    if (region) {
      if (!/^\d+$/.test(rest)) return `"${token}": a region goes right after a single page, like 12{10,20,60,30}`;
      continue;
    }
    work = rest;

    if (work && !PAGE_TOKEN.test(work)) {
      return `"${token}" is not a page, a range (3-5), a page with scroll (3%50) or with a region (3{10,20,60,30})`;
    }
    const range = work.match(/^(\d+)\s*-\s*(\d+)/);
    if (range && Number(range[1]) > Number(range[2])) return `Range "${work}" goes backwards`;
  }
  return null;
}

function checkLineText(text: string, what: string): string | null {
  const t = text.trim();
  if (t.startsWith(COMMENT_SYMBOL)) return `${what} cannot start with "${COMMENT_SYMBOL}" (it would be a comment)`;
  if (t.startsWith(CATEGORY_START_SYMBOL) && t.endsWith(CATEGORY_END_SYMBOL)) {
    return `${what} cannot be wrapped in [ ] (it would be a category)`;
  }
  return null;
}

export function validateDocument(doc: EditorDocument): Issue[] {
  const issues: Issue[] = [];
  const add = (severity: Severity, message: string, targetId?: number) =>
    issues.push({ severity, message, targetId });
  const names = resourceNames(doc);

  if (!doc.title.trim()) add("warning", "The study set has no title");

  // Resources
  const seen = new Map<string, number>();
  for (const r of doc.resources) {
    if (!r.file.trim()) add("error", "A resource has no file name", r.id);
    for (const name of [r.file.trim(), ...r.aliases.map((a) => a.trim())].filter(Boolean)) {
      if (seen.has(name) && seen.get(name) !== r.id) add("error", `"${name}" is used by two resources`, r.id);
      seen.set(name, r.id);
    }
    for (const a of r.aliases) {
      if (/[\s:;,]/.test(a.trim())) add("error", `Alias "${a.trim()}" cannot contain spaces, ":", ";" or ","`, r.id);
    }
  }

  const cards = doc.entries.filter((e): e is CardEntry => e.kind === "card" && !isEmptyCard(e));
  const hasPageCards = cards.some((c) => c.answer === "pages" && c.pages.trim());
  if (!doc.resources.length && hasPageCards) add("warning", "Add a PDF resource: cards point to its pages");
  if (!cards.length) add("error", "Add at least one card");

  for (const entry of doc.entries) {
    if (entry.kind === "header") {
      if (!entry.text.trim()) add("error", "Section title is empty", entry.id);
      const e = checkLineText(entry.text, "A section title");
      if (e) add("error", e, entry.id);
      continue;
    }
    if (entry.kind !== "card" || isEmptyCard(entry)) continue;

    const front = entry.front.trim();
    if (!front) add("error", "The front of the card is empty", entry.id);
    if (front.includes("..")) add("error", 'The front cannot contain ".." (it starts the page reference)', entry.id);
    const e = checkLineText(front, "The front");
    if (e) add("error", e, entry.id);

    if (entry.answer === "pages") {
      if (!entry.pages.trim()) {
        add("warning", "No page: revealing this card will show nothing", entry.id);
      } else {
        const resource = entry.resource.trim();
        if (resource && !names.has(resource)) add("error", `Unknown resource "${resource}"`, entry.id);
        const pe = checkPages(entry.pages, names);
        if (pe) add("error", pe, entry.id);
      }
    } else {
      if (!entry.textBox.trim()) add("warning", "The text answer is empty", entry.id);
      if (entry.textBox.includes("...")) add("error", 'The text answer cannot contain "..."', entry.id);
    }

    for (const d of entry.details) {
      if (d.type === "pages" && d.value.trim()) {
        const { resource, pages } = splitResource(d.value);
        if (resource && !names.has(resource)) add("error", `Unknown resource "${resource}"`, entry.id);
        const pe = checkPages(pages, names);
        if (pe) add("error", pe, entry.id);
      }
      if (d.type === "tag" && /\s/.test(d.value.trim())) add("warning", "Tags work best without spaces", entry.id);
    }

    const reverses = entry.details.filter((d) => d.type === "reverse").length;
    if (reverses > 1) add("error", "A card can have only one reverse", entry.id);
    const hasAnswer = entry.answer === "pages" ? !!entry.pages.trim() : !!entry.textBox.trim();
    if (reverses && !hasAnswer) {
      add("warning", "The reverse card shows the answer first, but this card has none", entry.id);
    }
  }

  return issues;
}
//#endregion -------------------------------------------------------------------



//#region HELPERS --------------------------------------------------------------
export function downloadText(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function fileNameFor(title: string): string {
  const base = title.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toLowerCase();
  return `${base || "study_set"}_flashcards.txt`;
}
//#endregion -------------------------------------------------------------------
