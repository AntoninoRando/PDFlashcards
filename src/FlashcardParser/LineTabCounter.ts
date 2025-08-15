
/**
 * Countes the number of tabs a line starts with. First condifering 
 * tab characters, then looking for spaces.
 * @param line The string line.
 * @returns The number of tabs found.
 */
export function countTabs(line: string): number {
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