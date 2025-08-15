import {
    CATEGORIES,
    COMMENT_SYMBOL,
    CATEGORY_START_SYMBOL,
    CATEGORY_END_SYMBOL
} from './Symbols';

export interface Category {
    name: string;
    line: number;
}

/**
 * Reads a list of lines and looks for every category.
 * @param lines 
 * @returns A sorted list of (category, lineNumber) elements.
 */
export function categoriesOf(lines: string[]): Array<Category> {
    const categories: Array<Category> = [];
    const knownCategories: ReadonlyArray<string> = Object.values(CATEGORIES) as ReadonlyArray<string>;

    try {
        for (let line = 0; line < lines.length; line++) {
            const trimmedLine = lines[line].trim();
            if (trimmedLine.startsWith(COMMENT_SYMBOL)) continue;
            if (!trimmedLine.startsWith(CATEGORY_START_SYMBOL)) continue;
            if (!trimmedLine.endsWith(CATEGORY_END_SYMBOL)) continue;

            const name = trimmedLine.substring(1, trimmedLine.length - 1) as string;
            categories.push({ name, line });

            if (!knownCategories.includes(name)) {
                console.warn('[categoriesFinder] Categories not previously known found: ' + name);
            }
        }

    } catch (error) {
        console.error(`[categoriesFinder] ERROR: ${error}`);
    }

    return categories;
}