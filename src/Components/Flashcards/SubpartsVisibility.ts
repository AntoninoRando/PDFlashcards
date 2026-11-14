import { PageRef } from "@/Commands/All/PageRef";
import { TextBox } from "@/Commands/All/TextBox";

/* Which details (subparts) of a card are shown before it is revealed. Once
   revealed, a card shows all of them. */

/** Details shown before revealing a reverse card: they are its question. The others could give the answer away. */
const REVERSE_PROMPT_PARTS: readonly string[] = [TextBox.commandName, PageRef.commandName];

/** Details that are the answer of a normal card: hidden until it is revealed. */
const ANSWER_PARTS: readonly string[] = [TextBox.commandName];

export function isSubpartShown(
  name: string | undefined,
  card: { revealed: boolean; reverse: boolean },
): boolean {
  if (card.revealed) return true;
  if (card.reverse) return REVERSE_PROMPT_PARTS.includes(name ?? "");
  return !ANSWER_PARTS.includes(name ?? "");
}
