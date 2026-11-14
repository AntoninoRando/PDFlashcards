import { describe, expect, it } from "vitest";
import {
  filterCommands,
  findSlashQuery,
  removeSlashQuery,
  type SlashCommand,
} from "@/Components/StudySetFile/Editor/SlashCommands";

const command = (id: string, label: string, keywords: string[] = []): SlashCommand => ({
  id,
  label,
  hint: "",
  keywords,
});

const COMMANDS = [
  command("tag", "Tag", ["#", "label"]),
  command("remember", "Remember", ["+", "hint"]),
  command("note", "Note"),
  command("pages", "More pages", ["..", "pdf"]),
  command("reverse", "Reverse card", ["<>", "flip", "both ways"]),
  command("text", "Text answer"),
];

describe("findSlashQuery", () => {
  it("finds a command typed at the start or after a space", () => {
    expect(findSlashQuery("/", 1)).toEqual({ start: 0, query: "" });
    expect(findSlashQuery("/ta", 3)).toEqual({ start: 0, query: "ta" });
    expect(findSlashQuery("What is X? /no", 14)).toEqual({ start: 11, query: "no" });
  });

  it("leaves slashes inside words alone", () => {
    expect(findSlashQuery("TCP/IP", 6)).toBeNull();
    expect(findSlashQuery("and/or", 4)).toBeNull();
  });

  it("stops at a space, and only looks before the caret", () => {
    expect(findSlashQuery("/tag done", 9)).toBeNull();
    expect(findSlashQuery("/tag done", 4)).toEqual({ start: 0, query: "tag" });
    expect(findSlashQuery("no slash", 8)).toBeNull();
  });
});

describe("filterCommands", () => {
  const ids = (q: string) => filterCommands(COMMANDS, q).map((c) => c.id);

  it("lists everything for an empty query", () => {
    expect(ids("")).toEqual(COMMANDS.map((c) => c.id));
  });

  it("ranks label prefixes, then words, then keywords, then substrings", () => {
    // "More pages" only contains "re": last
    expect(ids("re")).toEqual(["remember", "reverse", "pages"]);
    expect(ids("pa")).toEqual(["pages"]);
    expect(ids("an")).toEqual(["text"]);
    expect(ids("#")).toEqual(["tag"]);
    expect(ids("flip")).toEqual(["reverse"]);
    expect(ids("ver")).toEqual(["reverse"]);
    expect(ids("zzz")).toEqual([]);
  });
});

describe("removeSlashQuery", () => {
  it("removes the query and the space it leaves at the end", () => {
    expect(removeSlashQuery("What is X? /tag", 11, 15)).toEqual({ value: "What is X?", caret: 10 });
    expect(removeSlashQuery("/note", 0, 5)).toEqual({ value: "", caret: 0 });
  });

  it("keeps the text after the caret", () => {
    expect(removeSlashQuery("a /ta b", 2, 5)).toEqual({ value: "a  b", caret: 2 });
  });
});
