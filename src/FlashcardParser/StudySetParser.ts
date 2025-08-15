import { categoriesOf, Category } from "./CategoriesFinder";
import { parseCardLine } from "./SingleLineParser/Card";
import { countTabs } from "./LineTabCounter";
import {
    CATEGORIES,
    COMMENT_SYMBOL
} from './Symbols';
import {
    IStudySet,
    LineDescriptor
} from "./Types/Types";
import { parseCommandLine } from "./SingleLineParser/Command";
import { parseAcronymLine } from "./SingleLineParser/Alias";
import { parseResourceLine } from "./SingleLineParser/Resource";

export function parseStudyset(lines: string[]): IStudySet | null {
    const originalLines = lines;
    const categories = categoriesOf(lines);
    const categoriesAmount = categories.length;
    const studySet: IStudySet = {
        title: "",
        flashcards: [],
        resources: {},
        defaultResource: "",
        aliases: [],
        headers: [],
        studiedCards: 0,
        originalLines: [...originalLines],
        linesDescriptors: []
    };

    try {
        let lastCategoryIndex = 0;
        let currentCategory: Category = undefined;
        let isUnderComment: boolean = false;


        for (let i = 0; i < lines.length; i++) {
            /*
                Check if the current line is under a different category from
                old lines.
            */
            for (let j = lastCategoryIndex; j < categoriesAmount; j++) {
                const category = categories[j];
                const { line } = category;
                if (line > i) break;

                if (j != lastCategoryIndex) {
                    console.log(`[parser] Reached SECTION '${JSON.stringify(category)}'`);
                }
                currentCategory = category;
                lastCategoryIndex = j;
            }

            /*
                A line is considered a commet if it starts with a comment symbol
                or is tabbed under a commented line.
            */
            const lineTabs = countTabs(lines[i]);
            const trimmedLine = lines[i].trim();
            const isComment = trimmedLine.startsWith(COMMENT_SYMBOL);

            if (isComment || (lineTabs > 0 && isUnderComment)) {
                isUnderComment = true;
            } else {
                isUnderComment = false;
            }

            /*
                Creates the LineDescriptor object for this line and add it
                to the study set.
            */
            const lineDescriptor: LineDescriptor = {
                index: i,
                originalLine: lines[i],
                trimmedLine: trimmedLine,
                tabs: lineTabs,
                category: currentCategory,
                tabbedUnder: [],
                parent: null,
                isComment: isComment,
                subParts: []
            };
            studySet.linesDescriptors.push(lineDescriptor);
        }

        /*
            For each line, we need to know what lines are tabbed under it and
            who is the parent.
        */
       for (let k = 0; k < studySet.linesDescriptors.length; k++) {
            const lineDescriptor = studySet.linesDescriptors[k];
            const { tabs } = lineDescriptor;

            if (lineDescriptor.isComment) continue;
            if (tabs === 0) continue;
            
            for (let i = k - 1; i >= 0; i--) {
                const previousLd = studySet.linesDescriptors[i];
                if (previousLd.tabs == tabs) continue;
                if (previousLd.tabs < tabs) {
                    lineDescriptor.parent = previousLd;
                    previousLd.tabbedUnder.push(lineDescriptor);
                }
                break;
            }
        }

        /*
            Parse these lines. What the line does heavily depends
            on the context of this line, i.e. it's content and what there
            is around it. All these information are gathered in the
            LineContext object.
        */
        
        for (let lineDescriptor of studySet.linesDescriptors.filter(ld => !ld.isComment)) {
            const result = parseLine(lineDescriptor, studySet);

            if (result === false) {
                console.error(`[parser] Fail at line ${lineDescriptor.index}:` +
                    `"${lineDescriptor.originalLine}"`);
                return null;
            }
        }


        return studySet;
    } catch (error) {
        console.error(`[parser] ERROR: ${error}`);
        return null;
    }
}



function parseLine(
    lineDescriptor: LineDescriptor,
    studySet: IStudySet
): boolean {
    const { trimmedLine, category, index } = lineDescriptor;
    const { name: categoryName, line: categoryLine } = category;
    
    if (trimmedLine.length == 0) return true;
    if (index == categoryLine) return true;
    if (lineDescriptor.isComment) return true;

    if (lineDescriptor.tabs > 0) {
        return parseCommandLine(lineDescriptor, studySet);
    }

    switch (categoryName) {
        case CATEGORIES.title:
            console.log(`[parser] Reading title '${trimmedLine}'`);
        
            if (studySet.title) {
                console.error(`[parser] Multiple title lines found: ` +
                    `"${studySet.title}" and "${trimmedLine}"`);
                return false;
            }
            studySet.title = trimmedLine;
            break;
        case CATEGORIES.resources:
            console.log(`[parser] Reading resource '${trimmedLine}'`);
            return parseResourceLine(lineDescriptor, studySet);
        case CATEGORIES.cards:
            console.log(`[parser] Read card at line ${index}`);
            return parseCardLine(lineDescriptor, studySet);
        case CATEGORIES.acronyms:
            console.log(`[parser] Reading acronym '${trimmedLine}'`);
            return parseAcronymLine(lineDescriptor, studySet);
        default:
            console.log('[parser] Unrecognized category: '+ categoryName);
            return false;
    }

    return true;
}
