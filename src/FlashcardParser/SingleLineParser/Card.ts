import { CommandsFactory } from "@/Commands/CommandsFactory";
import { IFlashcard, IStudySet, LineDescriptor } from "../Types/Types";
import { PageRef } from "@/Commands/All/PageRef";
import { Header } from "@/Commands/All/Header";

export function parseCardLine(
	lineDescriptor: LineDescriptor,
	studySet: IStudySet
): boolean {
	const { trimmedLine: line } = lineDescriptor;

	let cardFront = line;
	const parts = line.split(PageRef.symbol);
	if (parts.length == 2) {
		const command = CommandsFactory.Make(
			lineDescriptor,
			studySet,
			PageRef.symbol,
			parts[1].trim()
		);
		cardFront = parts[0].trim();
		lineDescriptor.subParts.push({ ...command.toJson(), subParts: [] });
	}

	const card: IFlashcard = {
		lineDescriptor: lineDescriptor,
		text: cardFront,
		headers: [],
		reviewedAt: null,
		// FSRS initial difficulty and stability
		ease: 5,
		interval: 0.5,
		learningPhase: true,
		nextReviewAt: new Date(), // Default to now, will be updated if recall data follows
	};

	addHeaders(card, studySet);

	studySet.flashcards.push(card);

	return true;

	// New card or header line
	//   if (tabs === 0) {

	//   } else if (studySet.flashcards.length === 0) {
	//     console.error(
	//       `[studySet] ERROR AT LINE ${i}: "${line}"\n` +
	//         "Found a command for a flashcard, " +
	//         "but no flashcards has been parsed yet."
	//     );
	//     return false;
	//   } else {
	//     let subParts = studySet.flashcards[studySet.flashcards.length - 1].subParts;

	//     // Navigate to the correct nesting level
	//     for (let j = 1; j < tabs; j++) {
	//       if (subParts.length === 0) {
	//         console.error(`[studySet] Invalid nesting at line ${i}: "${line}"`);
	//         return false;
	//       }
	//       const lastSubPart = subParts[subParts.length - 1];
	//       if (!lastSubPart?.subParts) {
	//         console.error(
	//           `[studySet] Invalid nesting structure at line ${i}: "${line}"`
	//         );
	//         return false;
	//       }
	//       subParts = lastSubPart.subParts;
	//     }

	//     const commandSeparator = line.indexOf(" ");
	//     const commandName =
	//       commandSeparator === -1
	//         ? line.trim()
	//         : line.slice(0, commandSeparator).trim();
	//     const argument =
	//       commandSeparator === -1 ? null : line.slice(commandSeparator).trim();

	//     if (commandName === "alias") {
	//       CommandsFactory.Make(
	//         commandName,
	//         argument,
	//         studySet.flashcards[studySet.flashcards.length - 1]
	//       );
	//       return true;
	//     }

	//     const command = CommandsFactory.Make(commandName, argument, null);

	//     if (!command) {
	//       console.error(`[studySet] Unrecognized command at line: "${line}"`);
	//       return false;
	//     } else if (command instanceof Header) {
	//       command.text =
	//         studySet.flashcards[studySet.flashcards.length - 1].text ||
	//         "NO HEADER TEXT";
	//       studySet.headers.push({
	//         line: i,
	//         header: command,
	//       });
	//     } else {
	//       subParts.push({ ...command.toJson(), subParts: [] });
	//     }

	//     return true;
	//   }
}

/**
 * Adds to the card's headers field the list of all heards inside which the card
 * is contained.
 * @param card
 * @param studySet
 */
function addHeaders(card: IFlashcard, studySet: IStudySet) {
	let j = studySet.headers.length - 1;
	let lastHeaderLevel: number | undefined;

	while (j >= 0) {
		const lineDescriptor = studySet.headers[j];
		j--;

		if (lineDescriptor.index > card.lineDescriptor.index) continue;

		const header = lineDescriptor.subParts.find((x) => x.name === Header.commandName);
		if (lastHeaderLevel !== undefined && header.level >= lastHeaderLevel) {
			break;
		}

		card.headers.unshift(header.text); // Add to beginning to maintain order
		lastHeaderLevel = header.level;
	}
}
