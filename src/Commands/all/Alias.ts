import { CATEGORIES } from "@/FlashcardParser/Symbols";
import { IStudySet, LineDescriptor } from "../../FlashcardParser/Types/Types";

export class Alias {
  public static symbol: string = "@";

  public alias: string;
  public lineDescriptor: LineDescriptor;
  public studySet: IStudySet;
  public isValid: boolean = true;

  constructor(
    alias: string,
    lineDescriptor: LineDescriptor,
    studySet: IStudySet
  ) {
    this.alias = alias;
    this.lineDescriptor = lineDescriptor;
    this.studySet = studySet;

    if (lineDescriptor.category.name === CATEGORIES.resources) {
      let parent = lineDescriptor.parent;
      if (parent == null) {
        console.error("[Alias] No parent");
        this.isValid = false;
        return;
      }
      if (parent.tabs != 0) {
        console.error("[Alias] Parent is not a resource");
        this.isValid = false;
        return;
      }

      this.studySet.resources[alias] = parent.originalLine;
    }
  }

  public toJson(): object {
    return {
      name: "Alias",
      vueComponent: null,
      alias: this.alias,
    };
  }
}
