import { CommandsFactory } from "@/commands/CommandsFactory";
import {
    COMMAND_SEPARATOR,
    INLINE_SUBCOMMAND_START_SYMBOL,
    INLINE_SUBCOMMAND_END_SYMBOL
} from "../Symbols";
import { LineDescriptor, IStudySet } from "../Types/Types";

export function parseCommandLine(
    lineDescriptor: LineDescriptor,
    studySet: IStudySet,
    subCommand?: string,
    inLine: boolean = false
): boolean {
    let { trimmedLine, index } = lineDescriptor;

    if (subCommand) {
        console.log(`[studySet] Start parsing command as sub-command ${subCommand}`);
        trimmedLine = subCommand;
    }

    let endOfCommand = -1;
    let startOfArg = -1;
    let subCommands = [];
    let openCount = 0;
    let openIndex = -1;
    let closeIndex = -1;
    
    for (let i = 0; i < trimmedLine.length; i++) {
        const char = trimmedLine[i];

        if (char == COMMAND_SEPARATOR && openCount === 0) {
            if (endOfCommand === -1) {
                endOfCommand = i;
            }
            startOfArg = i + 1;
            break;
        }

        if (char == INLINE_SUBCOMMAND_START_SYMBOL) {
            if (openCount === 0) {
                openIndex = i;
                if (endOfCommand === -1) {
                    endOfCommand = i;
                }
            }
            openCount++;
        } else if (char == INLINE_SUBCOMMAND_END_SYMBOL) {
            openCount--;
            if (openCount === 0) {
                closeIndex = i;
                const subCommand = trimmedLine.slice(openIndex + 1, closeIndex);
                console.log(`[studySet] Found sub-commands ${subCommand}`);
                subCommands.push(subCommand);
            }
        }
    }


    let cmdName: string;
    let cmdArg: string;
    if (startOfArg === -1) {
        cmdName = trimmedLine;
        cmdArg = null;
        console.log(`[studySet] Found command ${cmdName} with no arg`);
    } else {
        cmdName = trimmedLine.slice(0, endOfCommand).trim();
        cmdArg = trimmedLine.slice(startOfArg).trim();
        console.log(`[studySet] Found command ${cmdName} with arg ${cmdArg}`);
    }

    const command = CommandsFactory.Make(lineDescriptor, studySet, cmdName, cmdArg);

    if (!command) {
        console.error(`[studySet] Unrecognized command at line ${index}: "${trimmedLine}"`);
        return false;
    }

    let receiver = inLine ? lineDescriptor : lineDescriptor.parent;
    receiver.subParts.push({ ...command.toJson(), subParts: [] });

    subCommands.forEach((x) => {
        const ld: LineDescriptor = {
            index: lineDescriptor.index,
            trimmedLine: x,
            originalLine: lineDescriptor.originalLine,
            tabs: lineDescriptor.tabs + 1,
            category: lineDescriptor.category,
            tabbedUnder: [],
            parent: lineDescriptor,
            isComment: lineDescriptor.isComment,
            subParts: []
        };
        parseCommandLine(ld, studySet, x);
    });

    return true;
}