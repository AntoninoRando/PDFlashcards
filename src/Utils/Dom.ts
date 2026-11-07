/**
 * Whether the user is currently typing in an editable element. Global keyboard
 * shortcuts must be ignored in that case, otherwise typing in the study-set
 * editor would reveal/grade cards or change PDF pages.
 */
export function isTypingInInput(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = (el.tagName || "").toUpperCase();
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}
