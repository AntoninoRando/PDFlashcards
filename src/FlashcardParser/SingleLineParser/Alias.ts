import { LineDescriptor, IStudySet } from "../Types/Types";
import { PageRef } from "@/Commands/All/PageRef";

export function parseAcronymLine(
    lineDescriptor: LineDescriptor,
    studySet: IStudySet
): boolean {
    const { trimmedLine } = lineDescriptor;

    const parts = trimmedLine.split(PageRef.symbol);
    if (parts.length != 2) {
        console.log(`[parser] Alias is not in 2-part format`);
        return false;
    }
    const alias = parts[0];
    const value = parts[1];
    const aliasRecord = {} as Record<string, string>;
    aliasRecord[alias] = value;
    studySet.aliases.push(aliasRecord);

    return true;
}
