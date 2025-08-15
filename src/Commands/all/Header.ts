import { IStudySet, LineDescriptor } from "@/FlashcardParser/Types/Types";

export class Header {
	public static symbol: string = '^';
	public static commandName: string = 'Header';

	public level: number;
	public text: string = '';

	constructor(
		lineDescriptor: LineDescriptor,
		studySet: IStudySet,
		num: number | string
	) {
		this.level = Number(num);

		/*
		  Search for the paren line of this header-line command and remove it from
		  the flashcards.
		*/
		const f = studySet.flashcards.find(
			(f) => f.lineDescriptor == lineDescriptor.parent
		);
		if (!f) {
			console.error(`[${Header.commandName}] Has no parent!`);
			return;
		}
		
		/*
			Remove the parent as a flashcard: it is just an header!
		*/
		const i = studySet.flashcards.indexOf(f);
		if (i != -1) {
			studySet.flashcards.splice(i, 1);
		}
		
		this.text = lineDescriptor.parent.trimmedLine;
		studySet.headers.push(lineDescriptor.parent);
	}

	public toJson(): {
		name: string;
		vueComponent: object | null;
		level: number;
		text: string;
	} {
		return {
			name: Header.commandName,
			vueComponent: null,
			level: this.level,
			text: this.text,
		};
	}
}
