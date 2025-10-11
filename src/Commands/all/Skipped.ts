import { IStudySet, LineDescriptor } from "@/FlashcardParser/Types/Types";

export class Skipped {
  public static symbol: string = "SKIPPED";

  public until: Date | null = null;

  constructor(
    lineDescriptor: LineDescriptor,
    studySet: IStudySet,
    args: string
  ) {
    // args must be an ISO date string
    try {
      const parsed = new Date((args || "").trim());
      if (isNaN(parsed.getTime())) {
        console.error(`[Skipped] Invalid ISO date: "${args}"`);
        return;
      }
      this.until = parsed;
    } catch (e) {
      console.error(`[Skipped] Failed to parse date: ${e}`);
      return;
    }

    const parent = lineDescriptor.parent;
    if (!parent) {
      console.error("[Skipped] No parent line for command");
      return;
    }

    const card = studySet.flashcards.find((f) => f.lineDescriptor === parent);
    if (!card) {
      console.error("[Skipped] No flashcard associated with command");
      return;
    }

    // Apply to card
    card.skippedUntil = this.until;

    console.log(
      `[Skipped] Card at line ${parent.index} skipped until ${this.until?.toISOString()}`
    );
  }

  public toJson(): object {
    return {
      name: "Skipped",
      vueComponent: null,
      until: this.until,
    };
  }
}

