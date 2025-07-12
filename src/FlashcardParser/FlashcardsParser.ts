import { CommandsFactory } from "@/commands/CommandsFactory";

interface StudySet {
  title: string;
  flashcards: any[];
  resources: string[];
  aliases: any[];
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
};

export function parseContent(lines: string[]): StudySet | null {
  const studySet: StudySet = {
    title: "",
    flashcards: [],
    resources: [],
    aliases: [],
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
      if (categoriesValues.includes(lineDescriptor.trimmedLine)) {
        console.log(
          `[studySet] Reached SECTION '${lineDescriptor.trimmedLine}'`
        );
        category = lineDescriptor.trimmedLine;
      } else {
        parseCategory(category, lineDescriptor, studySet);
      }
    }

    return studySet;
  } catch (error) {
    console.log(error);
    return null;
  }
}

function parseCategory(
  category: string,
  lineDescriptor: LineDescriptor,
  studySet: StudySet
): void {
  const { trimmedLine } = lineDescriptor;
  if (category === categories.title) {
    console.log(`[studySet] Reading title '${trimmedLine}'`);
    studySet.title = trimmedLine;
  } else if (category === categories.resources) {
    console.log(`[studySet] Reading resource '${trimmedLine}'`);
    studySet.resources.push(trimmedLine);
  } else if (category === categories.cards) {
    parseCards(lineDescriptor, studySet);
  }
}

function parseCards(lineDescriptor: LineDescriptor, studySet: StudySet): void {
  const { trimmedLine: line, index: i, tabs } = lineDescriptor;

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

    const card = {
      text: text,
      subParts: [],
    };
    if (command) {
      card.subParts.push(command);
    }
    studySet.flashcards.push(card);
  } else if (studySet.flashcards.length == 0) {
    console.error(
      `[studySet] ERROR AT LINE ${i}: "${line}"\n` +
        "Found a command for a flashcard, " +
        "but no flashcards has been parsed yet."
    );
    return null;
  } else {
    let subParts = studySet.flashcards[studySet.flashcards.length - 1].subParts;
    // The first subpart has already been set, so we start counting from 1
    for (let j = 1; j < tabs; j++) {
      const lastSubPart = subParts[subParts.length - 1];
      subParts = lastSubPart?.subParts;
    }

    if (subParts === undefined) {
      console.error(`[studySet] Too many tabs: "${line}"`);
      return null;
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
      return null;
    }

    const commandElement = {
      command: command,
      subParts: [],
    };

    subParts.push(commandElement);
  }
}

function countTabs(line: string): number {
  let tabs = 0;
  for (let char of line) {
    if (char !== "\t") break;
    tabs++;
  }
  return tabs;
}
