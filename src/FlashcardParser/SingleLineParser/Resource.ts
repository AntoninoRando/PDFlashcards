import { LineDescriptor, IStudySet } from "../Types/Types";

export function parseResourceLine(
    lineDescriptor: LineDescriptor,
    studySet: IStudySet
): boolean {
    const { trimmedLine } = lineDescriptor;

    studySet.resources[trimmedLine] = trimmedLine;
    if (!studySet.defaultResource) {
        console.log(`[parser] Using resource as default`);
        studySet.defaultResource = trimmedLine;
    }

    return true;
}