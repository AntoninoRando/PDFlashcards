/*
  The "/" menu of the study-set editor: typing "/" in a field of a card opens a
  list of commands (add a tag, a note, a reverse card, a new card...),
  filtered by what follows the slash. These are the pure parts: finding the
  "/query" being typed, filtering the commands and removing the query once a
  command runs.
*/

export interface SlashCommand {
  id: string;
  label: string;
  /** One line explaining what it does. */
  hint: string;
  /** Other words it is found by (e.g. the symbol written in the study set). */
  keywords: string[];
  /** Shown on the right, e.g. the study-set symbol. */
  shortcut?: string;
}

/** Longest query that still counts as a command being typed. */
const MAX_QUERY_LENGTH = 24;

/**
 * The "/query" right before the caret, if a command is being typed: the
 * slash starts the field or follows a space (so "TCP/IP" or "and/or" are left
 * alone), and nothing after it is a space.
 */
export function findSlashQuery(value: string, caret: number): { start: number; query: string } | null {
  const before = value.slice(0, caret);
  const start = before.lastIndexOf("/");
  if (start === -1) return null;
  if (start > 0 && !/\s/.test(before[start - 1])) return null;
  const query = before.slice(start + 1);
  if (/\s/.test(query) || query.length > MAX_QUERY_LENGTH) return null;
  return { start, query };
}

/**
 * Commands matching the query, best first: the label starts with it, then a
 * word of the label, then a keyword, then the label contains it.
 */
export function filterCommands<T extends SlashCommand>(commands: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...commands];
  const scored: { command: T; score: number; order: number }[] = [];
  commands.forEach((command, order) => {
    const label = command.label.toLowerCase();
    let score: number;
    if (label.startsWith(q)) score = 0;
    else if (label.split(/[\s-]+/).some((word) => word.startsWith(q))) score = 1;
    else if (command.keywords.some((k) => k.toLowerCase().startsWith(q))) score = 2;
    else if (label.includes(q)) score = 3;
    else return;
    scored.push({ command, score, order });
  });
  return scored.sort((a, b) => a.score - b.score || a.order - b.order).map((s) => s.command);
}

/** The value without the "/query" (from `start` to the caret), and where the caret goes. */
export function removeSlashQuery(value: string, start: number, caret: number): { value: string; caret: number } {
  let rest = value.slice(0, start) + value.slice(caret);
  // "What is /tag" leaves "What is ": drop the space left at the end
  if (caret >= value.length) rest = rest.trimEnd();
  return { value: rest, caret: Math.min(start, rest.length) };
}
