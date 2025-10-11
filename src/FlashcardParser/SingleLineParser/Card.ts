import { IFlashcard, IStudySet, LineDescriptor } from "../Types/Types";
import { PageRef } from "@/Commands/All/PageRef";
import { Header } from "@/Commands/All/Header";
import { parseCommandLine } from "./Command";

export function parseCardLine(
	lineDescriptor: LineDescriptor,
	studySet: IStudySet
): boolean {
	const { trimmedLine: line } = lineDescriptor;

	let cardFront = line;
	const parts = line.split(PageRef.symbol);
	if (parts.length == 2) {
		parseCommandLine(lineDescriptor, studySet, `${PageRef.symbol}${parts[1]}`, true);
		cardFront = parts[0].trim();
	}

	const card: IFlashcard = {
		lineDescriptor: lineDescriptor,
		text: cardFront,
		headers: [],
		// FSRS initial difficulty and stability
		ease: 5,
		interval: 0.5,
		learningPhase: true,
		reviewedAt: null,
		retrievalSuccess: 0,
		reviewCount: 0,
		nextReviewAt: new Date(), // Default to now, will be updated if recall data follows
		skippedUntil: null,
	};

	addHeaders(card, studySet);

	studySet.flashcards.push(card);

	return true;
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
