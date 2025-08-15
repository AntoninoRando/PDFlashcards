import { Category } from "../CategoriesFinder";

export interface IFlashcard {
    lineDescriptor: LineDescriptor,
    headers: string[];
    text: string;
    reviewedAt: Date | null;
    ease: number;
    interval: number;
    learningPhase: boolean;
    nextReviewAt: Date;
    alias?: string[];
}

export interface ISubPart {
    subParts: ISubPart[];
    [key: string]: any; // For command-specific properties
}

export interface IStudySet {
    title: string;
    flashcards: IFlashcard[];
    resources: Record<string, string>;
    defaultResource: string;
    aliases: Record<string, string>[];
    headers: LineDescriptor[];
    studiedCards: number;
    originalLines: string[];
    linesDescriptors: LineDescriptor[];
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
