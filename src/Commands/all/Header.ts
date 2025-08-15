import { IStudySet, LineDescriptor } from "@/FlashcardParser/Types/Types";

export class Header {
  public static symbol: string = "^";

  public num: number;
  public text: string;

  constructor(
    lineDescriptor: LineDescriptor,
    studySet: IStudySet,
    num: number | string,
    text?: string
  ) {
    this.num = Number(num);
    this.text = text || "";

    /*
      Search for the paren line of this header-line command and remove it from
      the flashcards.
    */
    const f = studySet.flashcards.find(
      (f) => f.lineDescriptor == lineDescriptor.parent
    );
    if (!f) {
      console.error("[Header] Has no parent!");
      return;
    }

    const i = studySet.flashcards.indexOf(f);
    studySet.flashcards.splice(i, 1);
    studySet.headers.push(lineDescriptor.parent);
  }

  public toJson(): {
    name: string;
    vueComponent: object | null;
    level: number;
    text: string;
  } {
    return {
      name: "Header",
      vueComponent: null,
      level: this.num,
      text: this.text,
    };
  }
}
