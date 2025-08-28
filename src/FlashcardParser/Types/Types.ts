import FlashcardsScheduler from "@/FlashcardsScheduler";
import { Category } from "../CategoriesFinder";

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
    alias?: string[];
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
    category: Category,
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
