import { CommandsFactory } from "@/commands/CommandsFactory";
import { COMMAND_SEPARATOR } from "../Symbols";
import { LineDescriptor, IStudySet } from "../Types/Types";

export function parseCommandLine(
    lineDescriptor: LineDescriptor,
    studySet: IStudySet
): boolean {
    const { trimmedLine, index } = lineDescriptor;

    const commandSeparator = trimmedLine.indexOf(COMMAND_SEPARATOR);

    let cmdName: string;
    let cmdArg: string;
    if (commandSeparator === -1) {
        cmdName = trimmedLine;
        cmdArg = null;
    } else {
        cmdName = trimmedLine.slice(0, commandSeparator).trim();
        cmdArg = trimmedLine.slice(commandSeparator).trim();
    }

    const command = CommandsFactory.Make(lineDescriptor, studySet, cmdName, cmdArg);

    if (!command) {
        console.error(`[studySet] Unrecognized command at line ${index}: "${trimmedLine}"`);
        return false;
    }
    
    lineDescriptor.parent.subParts.push({ ...command.toJson(), subParts: [] });
    return true;
}