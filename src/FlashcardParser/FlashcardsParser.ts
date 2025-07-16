import { Header } from "@/commands/allCommands/Header";
import { CommandsFactory } from "@/commands/CommandsFactory";

const commentSymbol: string = '//'

interface IHeader {
    line: number;
    header: Header;
}

interface IFlashcard {
    line: number;
    headers: string[];
    text: string;
    subParts: ISubPart[];
    reviewedAt: Date | null;
    ease: number;
    interval: number;
    learningPhase: boolean;
    nextReviewAt: Date;
}

interface ISubPart {
    subParts: ISubPart[];
    [key: string]: any; // For command-specific properties
}

interface IAlias {
    [key: string]: any; // Define based on your alias structure
}

export interface IStudySet {
    title: string;
    flashcards: IFlashcard[];
    resources: string[];
    aliases: IAlias[];
    headers: IHeader[];
    studiedCards: number;
    originalLines: string[];
}

interface LineDescriptor {
    index: number;
    trimmedLine: string;
    originalLine: string;
    tabs: number;
}

const categories = {
    title: "[Title]",
    resources: "[Resources]",
    cards: "[Cards]",
    aliases: "[Aliases]",
} as const;

export function parseStudyset(lines: string[]): IStudySet | null {
    const original = lines.filter((l) => l.trim() !== "");
    const studySet: IStudySet = {
        title: "",
        flashcards: [],
        resources: [],
        aliases: [],
        headers: [],
        studiedCards: 0,
        originalLines: [...original]
    };

    try {
        lines = [...original];
        const categoriesValues = Object.values(categories);
        let category = "";

        for (let i = 0; i < lines.length; i++) {
            const lineDescriptor: LineDescriptor = {
                index: i,
                originalLine: lines[i],
                trimmedLine: lines[i].trim(),
                tabs: countTabs(lines[i]),
            };

            // Check if this is a section header
            if (categoriesValues.includes(lineDescriptor.trimmedLine as any)) {
                console.log(
                    `[studySet] Reached SECTION '${lineDescriptor.trimmedLine}'`
                );
                category = lineDescriptor.trimmedLine;
            } else {
                const result = parseCategory(category, lineDescriptor, studySet);
                if (result === false) {
                    console.error(`[parseStudySet] Failed to parse line ${i}: "${lineDescriptor.trimmedLine}"`);
                    return null;
                }
            }
        }

        // Return a copy of studySet excluding flashcards with text starting with //
        const filteredStudySet: IStudySet = {
          ...studySet,
          flashcards: studySet.flashcards.filter(
            (card) => !card.text.trim().startsWith(commentSymbol)
          ),
        };
        return filteredStudySet;
    } catch (error) {
        console.error(`[parseStudySet] ERROR: ${error}`);
        return null;
    }
}

function parseCategory(
    category: string,
    lineDescriptor: LineDescriptor,
    studySet: IStudySet
): boolean {
    const { trimmedLine } = lineDescriptor;
    
    if (category === categories.title) {
        console.log(`[studySet] Reading title '${trimmedLine}'`);
        studySet.title = trimmedLine;
        return true;
    } else if (category === categories.resources) {
        console.log(`[studySet] Reading resource '${trimmedLine}'`);
        studySet.resources.push(trimmedLine);
        return true;
    } else if (category === categories.cards) {
        return parseCards(lineDescriptor, studySet);
    } else if (category === categories.aliases) {
        // Handle aliases parsing if needed
        console.log(`[studySet] Reading alias '${trimmedLine}'`);
        // Add alias parsing logic here
        return true;
    }
    
    return true;
}

function parseRecallData(recallString: string): { reviewedAt: Date | null, ease: number, interval: number, learningPhase: boolean } | null {
    try {
        // Expected format: "2025-01-15T10:30:00.000Z, 5, 1.0, false"
        const parts = recallString.split(',').map(part => part.trim());
        
        if (parts.length !== 4) {
            console.error(`[parseRecallData] Invalid recall data format: expected 4 parts, got ${parts.length}`);
            return null;
        }

        const reviewedAt = new Date(parts[0]);
        const ease = parseFloat(parts[1]);
        const interval = parseFloat(parts[2]);
        const learningPhase = parts[3].toLowerCase() === 'true';

        // Validate parsed data
        if (isNaN(reviewedAt.getTime())) {
            console.error(`[parseRecallData] Invalid date: ${parts[0]}`);
            return null;
        }
        if (isNaN(ease) || ease < 1 || ease > 10) {
            console.error(`[parseRecallData] Invalid difficulty: ${parts[1]}`);
            return null;
        }
        if (isNaN(interval) || interval < 0) {
            console.error(`[parseRecallData] Invalid interval: ${parts[2]}`);
            return null;
        }

        console.log(`[parseRecallData] Parsed recall data: reviewedAt=${reviewedAt.toISOString()}, ease=${ease}, interval=${interval}, learningPhase=${learningPhase}`);
        
        return {
            reviewedAt,
            ease,
            interval,
            learningPhase
        };
    } catch (error) {
        console.error(`[parseRecallData] Error parsing recall data: ${error}`);
        return null;
    }
}

function parseCards(lineDescriptor: LineDescriptor, studySet: IStudySet): boolean {
    const { trimmedLine: line, index: i, tabs } = lineDescriptor;
    console.log(`[studySet] Reached Line: ${line}; Tabs ${tabs}`);
    
    // Check if this is a recall data command
    if (tabs === 1 && line.startsWith("***") && studySet.flashcards.length > 0) {
        const recallDataString = line.substring(3).trim(); // Remove "***" prefix
        const recallData = parseRecallData(recallDataString);
        
        if (recallData) {
            // Apply recall data to the last flashcard
            const lastCard = studySet.flashcards[studySet.flashcards.length - 1];
            lastCard.reviewedAt = recallData.reviewedAt;
            lastCard.ease = recallData.ease;
            lastCard.interval = recallData.interval;
            lastCard.learningPhase = recallData.learningPhase;
            
            // Calculate nextReviewAt based on reviewedAt and interval
            if (lastCard.reviewedAt) {
                lastCard.nextReviewAt = new Date(
                    lastCard.reviewedAt.getTime() + recallData.interval * 24 * 60 * 60 * 1000
                );
            }
            
            console.log(`[studySet] Applied recall data to card: "${lastCard.text}"`);
            console.log(`[studySet] - reviewedAt: ${lastCard.reviewedAt?.toISOString()}`);
            console.log(`[studySet] - nextReviewAt: ${lastCard.nextReviewAt?.toISOString()}`);
            console.log(`[studySet] - ease: ${lastCard.ease}, interval: ${lastCard.interval}, learningPhase: ${lastCard.learningPhase}`);
        } else {
            console.error(`[studySet] Failed to parse recall data: "${recallDataString}"`);
        }
        
        return true;
    }
    
    // New card
    if (tabs === 0) {
        let text: string;
        let command: any;

        const pageSplit = line.split("..");
        if (pageSplit.length > 1) {
            text = pageSplit.slice(0, -1).join("..").trim();
            const commandArgument = pageSplit[pageSplit.length - 1];
            command = CommandsFactory.Make("..", commandArgument);
        } else {
            text = line;
        }

        const card: IFlashcard = {
            line: i,
            headers: [],
            text: text,
            subParts: [],
            reviewedAt: null,
            // FSRS initial difficulty and stability
            ease: 5,
            interval: 0.5,
            learningPhase: true,
            nextReviewAt: new Date(), // Default to now, will be updated if recall data follows
        };

        // Fix header parsing logic - reverse the order and correct the level comparison
        let j = studySet.headers.length - 1;
        let lastHeaderLevel: number | undefined;
        
        while (j >= 0) {
            const iHeader = studySet.headers[j];
            // If we have a last header level and current header level is greater or equal, break
            if (lastHeaderLevel !== undefined && iHeader.header.num >= lastHeaderLevel) {
                break;
            }
            
            card.headers.unshift(iHeader.header.text); // Add to beginning to maintain order
            lastHeaderLevel = iHeader.header.num;
            j--;
        }

        if (command) {
            card.subParts.push({ ...command.toJson(), subParts: [] });
        }
        studySet.flashcards.push(card);
        return true;
        
    } else if (studySet.flashcards.length === 0) {
        console.error(
            `[studySet] ERROR AT LINE ${i}: "${line}"\n` +
            "Found a command for a flashcard, " +
            "but no flashcards has been parsed yet."
        );
        return false;
    } else {
        let subParts = studySet.flashcards[studySet.flashcards.length - 1].subParts;
        
        // Navigate to the correct nesting level
        for (let j = 1; j < tabs; j++) {
            if (subParts.length === 0) {
                console.error(`[studySet] Invalid nesting at line ${i}: "${line}"`);
                return false;
            }
            const lastSubPart = subParts[subParts.length - 1];
            if (!lastSubPart?.subParts) {
                console.error(`[studySet] Invalid nesting structure at line ${i}: "${line}"`);
                return false;
            }
            subParts = lastSubPart.subParts;
        }

        let command: any;
        const commandSeparator = line.indexOf(" ");
        if (commandSeparator === -1) {
            command = CommandsFactory.Make(line, null);
        } else {
            const commandName = line.slice(0, commandSeparator).trim();
            const argument = line.slice(commandSeparator).trim();
            command = CommandsFactory.Make(commandName, argument);
        }

        if (!command) {
            console.error(`[studySet] Unrecognized command at line: "${line}"`);
            return false;
        } else if (command instanceof Header) {
            command.text = studySet.flashcards[studySet.flashcards.length - 1].text || 'NO HEADER TEXT';
            studySet.headers.push({
                line: i,
                header: command
            });
        } else {
            subParts.push({ ...command.toJson(), subParts: [] });
        }

        return true;
    }
}

function countTabs(line: string): number {
    let count = 0;
    let i = 0;

    while (i < line.length) {
        if (line[i] === '\t') {
            count++;
            i++;
        } else if (line[i] === ' ') {
            // Check if we have 4 consecutive spaces
            if (i + 3 < line.length &&
                line[i + 1] === ' ' &&
                line[i + 2] === ' ' &&
                line[i + 3] === ' ') {
                count++;
                i += 4; // Skip the 4 spaces
            } else {
                // Not 4 consecutive spaces, stop counting
                break;
            }
        } else {
            // Hit a non-whitespace character, stop counting
            break;
        }
    }

    return count;
}