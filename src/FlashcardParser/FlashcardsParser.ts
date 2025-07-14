import { Header } from "@/commands/allCommands/Header";
import { CommandsFactory } from "@/commands/CommandsFactory";

interface IHeader {
    line: number;
    header: Header;
}

interface IFlashcard {
    line: number;
    headers: string[];
    text: string;
    subParts: ISubPart[];
    reviewedAt: Date;
    ease: number;
    interval: number;
    learningPhase: boolean;
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
    const studySet: IStudySet = {
        title: "",
        flashcards: [],
        resources: [],
        aliases: [],
        headers: []
    };

    try {
        lines = lines.filter((l) => l.trim() !== "");
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

        return studySet;
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

function parseCards(lineDescriptor: LineDescriptor, studySet: IStudySet): boolean {
    const { trimmedLine: line, index: i, tabs } = lineDescriptor;
    console.log(`[studySet] Reached Line: ${line}; Tabs ${tabs}`);
    
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

        const now = new Date();
        const randomHours = Math.floor(Math.random() * 24); // 0-23 hours
        const randomMinutes = Math.floor(Math.random() * 60); // 0-59 minutes

        const card: IFlashcard = {
            line: i,
            headers: [],
            text: text,
            subParts: [],
            reviewedAt: new Date(
                now.getTime() - randomHours * 60 * 60 * 1000 - randomMinutes * 60 * 1000
            ),
            ease: 230,
            interval: 0,
            learningPhase: true,
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