import { IStudySet, LineDescriptor } from "@/FlashcardParser/Types/Types";

export class RecallData {
  public static symbol: string = "***";

  public reviewedAt: Date;
  public ease: number;
  public interval: number;
  public learningPhase: boolean;

  constructor(
    lineDescriptor: LineDescriptor,
    studySet: IStudySet,
    args: string
  ) {
    const recallData = parseRecallData(args);
    if (!recallData) {
      console.error(`[RecallData] Failed to parse recall data: "${args}"`);
      return;
    }

    this.reviewedAt = recallData.reviewedAt;
    this.ease = recallData.ease;
    this.interval = recallData.interval;
    this.learningPhase = recallData.learningPhase;

    var p = lineDescriptor.parent;
    if (!p) {
      console.error("[RecallData] No parent");
      return;
    }

    const f = studySet.flashcards.find((f) => f.lineDescriptor === p);
    if (!f) {
      console.error("[RecallData] No flashcard associated");
      return;
    }

    f.reviewedAt = recallData.reviewedAt;
    f.ease = recallData.ease;
    f.interval = recallData.interval;
    f.learningPhase = recallData.learningPhase;

    // Calculate nextReviewAt based on reviewedAt and interval
    if (f.reviewedAt) {
      f.nextReviewAt = new Date(
        f.reviewedAt.getTime() + recallData.interval * 24 * 60 * 60 * 1000
      );
    }

    console.log(
      `[RecallData] Applied to card at line ${p.index}: "${f.text}".` +
      `\n\t- reviewedAt: ${f.reviewedAt?.toISOString()};` +
      `\n\t- nextReviewAt: ${f.nextReviewAt?.toISOString()};` +
      `\n\t- ease: ${f.ease};` +
      `\n\t- interval: ${f.interval};` +
      `\n\t- learningPhase: ${f.learningPhase}`
    );
  }

  public toJson(): object {
    return {
      name: "RecallData",
      vueComponent: null,
      reviewedAt: this.reviewedAt,
      ease: this.ease,
      interval: this.interval,
      learningPhase: this.learningPhase
    };
  }
}

function parseRecallData(recallString: string): {
  reviewedAt: Date | null;
  ease: number;
  interval: number;
  learningPhase: boolean;
} | null {
  try {
    // Expected format: "2025-01-15T10:30:00.000Z, 5, 1.0, false"
    const parts = recallString.split(",").map((part) => part.trim());

    if (parts.length !== 4) {
      console.error(
        `[parser] Invalid recall data format: expected 4 parts, got ${parts.length}`
      );
      return null;
    }

    const reviewedAt = new Date(parts[0]);
    const ease = parseFloat(parts[1]);
    const interval = parseFloat(parts[2]);
    const learningPhase = parts[3].toLowerCase() === "true";

    // Validate parsed data
    if (isNaN(reviewedAt.getTime())) {
      console.error(`[parser] Invalid date: ${parts[0]}`);
      return null;
    }
    if (isNaN(ease) || ease < 1 || ease > 10) {
      console.error(`[parser] Invalid difficulty: ${parts[1]}`);
      return null;
    }
    if (isNaN(interval) || interval < 0) {
      console.error(`[parser] Invalid interval: ${parts[2]}`);
      return null;
    }

    console.log(
      `[parser] Parsed recall data: reviewedAt=${reviewedAt.toISOString()}, ease=${ease}, interval=${interval}, learningPhase=${learningPhase}`
    );

    return {
      reviewedAt,
      ease,
      interval,
      learningPhase,
    };
  } catch (error) {
    console.error(`[parser] Error parsing recall data: ${error}`);
    return null;
  }
}
