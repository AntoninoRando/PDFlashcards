import type FlashcardsScheduler from "@/Scheduler/FlashcardsScheduler";
import type { Category } from "../CategoriesFinder";

export interface IFlashcard {
    lineDescriptor: LineDescriptor,
    headers: string[];
    text: string;
    reviewedAt: Date | null;
    nextReviewAt: Date;
    ease: number;
    interval: number;
    retrievalSuccess: number | null;
    reviewCount: number;
    learningPhase: boolean;
    skipUntil?: Date | null;
    alias?: string[];
    /**
     * Set on a reverse card (`<>` under a card): the card it reverses. It is
     * studied the other way (its answer first, `text` to recall) and its
     * `lineDescriptor` is the `<>` line, which holds its own review data.
     */
    reverseOf?: IFlashcard;
}

/** The line holding a card's answer and details (for a reverse card, the line of the card it reverses). */
export function contentLineOf(card: IFlashcard): LineDescriptor {
    return card.reverseOf?.lineDescriptor ?? card.lineDescriptor;
}

/** Whether two cards are the two directions of the same card. */
export function areSiblings(a: IFlashcard, b: IFlashcard): boolean {
    return a !== b && (a.reverseOf === b || b.reverseOf === a || (!!a.reverseOf && a.reverseOf === b.reverseOf));
}

export interface ISubPart {
    subParts: ISubPart[];
    [key: string]: any; // For command-specific properties
}

export interface IStudySet {
    title: string;
    resources: Record<string, string>;
    defaultResource: string;
    aliases: Record<string, string>[];
    flashcards: IFlashcard[];
    scheduler: FlashcardsScheduler,
    headers: LineDescriptor[];
    studiedCards: number;
    originalLines: string[];
    linesDescriptors: LineDescriptor[];
    history: any[];
}
export interface LineDescriptor {
    index: number;
    trimmedLine: string;
    originalLine: string;
    tabs: number;
    category: Category | undefined,
    tabbedUnder: LineDescriptor[],
    parent: LineDescriptor | null,
    isComment: boolean,
    subParts: ISubPart[];
}

export enum RecallOption {
    forgot = 'forgot',
    bad = 'bad',
    notBad = 'not bad',
    ok = 'ok'
}

export enum HideOption {
    hide = 'hide',
    forgot = 'forgot',
    bad = 'bad',
    notBad = 'not bad',
    ok = 'ok'
}
