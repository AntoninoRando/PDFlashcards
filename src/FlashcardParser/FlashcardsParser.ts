import { CommandsFactory } from "@/Commands/CommandsFactory";

interface StudySet {
  title: string;
  flashcards: any[];
  resources: string[];
  aliases: any[];
}

const categories = {
  title: "[Title]",
  resources: "[Resources]",
  cards: "[Cards]",
  aliases: "[Aliases]",
};

export function parseContent(lines: string[]): StudySet | null {
  try {
    console.log("Parse content invoked");

    const studySet: StudySet = {
      title: "",
      flashcards: [],
      resources: [],
      aliases: [],
    };

    lines = lines.filter((l) => l.trim() !== "");
    const categoriesValues = Object.values(categories);
    let category = "";

    for (let i = 0; i < lines.length; i++) {
      const originalLine = lines[i]; // Preserves tabs
      const line = lines[i].trim();

      // Check if this is a section header
      if (categoriesValues.includes(line)) {
        category = line;
        console.log(`[studySet] Reached section '${line}'`);
        continue;
      }

      // Parse based on current category
      if (category === categories.title) {
        console.log(`[studySet] Reading title '${line}'`);
        studySet.title = line;
        continue;
      }

      if (category === categories.resources) {
        console.log(`[studySet] Reading resource '${line}'`);
        studySet.resources.push(line);
        continue;
      }

      if (category === categories.cards) {
        let tabs = 0;
        for (let char of originalLine) {
          if (char !== "\t") break;
          tabs++;
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
          let subParts =
            studySet.flashcards[studySet.flashcards.length - 1].subParts;
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
    }

    return studySet;
  } catch (error) {
    console.log(error);
    return null;
  }
}
