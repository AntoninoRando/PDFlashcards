import { IFlashcard, IStudySet, LineDescriptor } from "@/FlashcardParser/Types/Types";

/**
 * `<>` under a card: also study the card the other way. It adds a second
 * card that shows the answer first (the pages, the region or the text) and
 * asks for the front. Its review data goes under the `<>` line, so the two
 * directions are scheduled independently:
 *
 *     What is a deadlock? .. 12{10,20,60,30}
 *         <>
 *             *** 2026-01-15T10:30:00.000Z, 5, 2.5, false
 */
export class Reverse {
  public static symbol: string = "<>";
  public static commandName: string = "Reverse";

  public readonly card: IFlashcard | null = null;

  constructor(lineDescriptor: LineDescriptor, studySet: IStudySet) {
    const parent = lineDescriptor.parent;
    const source = parent ? studySet.flashcards.find((f) => f.lineDescriptor === parent) : undefined;
    if (!source) {
      console.error(`[Reverse] Line ${lineDescriptor.index} is not under a card`);
      return;
    }
    if (source.reverseOf) {
      console.error(`[Reverse] Line ${lineDescriptor.index}: a reverse card cannot be reversed again`);
      return;
    }

    this.card = {
      lineDescriptor,
      text: source.text,
      headers: [...source.headers],
      // Same initial values as a new card (see `parseCardLine`)
      ease: 5,
      interval: 0.5,
      learningPhase: true,
      reviewedAt: null,
      retrievalSuccess: null,
      reviewCount: 0,
      nextReviewAt: new Date(),
      skipUntil: null,
      reverseOf: source,
    };
    studySet.flashcards.push(this.card);
  }

  public get isValid(): boolean {
    return this.card !== null;
  }

  public toJson(): object {
    return {
      name: Reverse.commandName,
      vueComponent: null,
    };
  }
}
