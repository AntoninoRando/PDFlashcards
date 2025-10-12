import { IStudySet, LineDescriptor } from "@/FlashcardParser/Types/Types";

export class Skip {
  public static symbol: string = "SKIP";
  public static commandName: string = "Skip";

  public readonly skipUntil: Date | null;

  constructor(
    lineDescriptor: LineDescriptor,
    studySet: IStudySet,
    argument?: string | null,
  ) {
    const parsed = Skip.parseDate(argument);
    this.skipUntil = parsed;

    const parent = lineDescriptor.parent;
    if (!parent) {
      console.error("[Skip] Command has no parent line descriptor");
      return;
    }

    const flashcard = studySet.flashcards.find(
      (card) => card.lineDescriptor === parent,
    );
    if (!flashcard) {
      console.error("[Skip] Could not find associated flashcard");
      return;
    }

    flashcard.skipUntil = parsed;
    if (parsed && (!flashcard.nextReviewAt || flashcard.nextReviewAt.getTime() < parsed.getTime())) {
      flashcard.nextReviewAt = parsed;
    }
  }

  private static parseDate(argument?: string | null): Date | null {
    if (!argument) {
      console.error("[Skip] Missing ISO timestamp argument");
      return null;
    }

    const trimmed = argument.trim();
    if (!trimmed) {
      console.error("[Skip] Empty ISO timestamp argument");
      return null;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      console.error(`[Skip] Invalid ISO timestamp: "${argument}"`);
      return null;
    }

    return parsed;
  }

  public toJson(): object {
    return {
      name: Skip.commandName,
      vueComponent: null,
      skipUntil: this.skipUntil ? this.skipUntil.toISOString() : null,
    };
  }
}
