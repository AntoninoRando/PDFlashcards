import VueRecap from "../Components/VueRecap.vue";
import { LineDescriptor } from "@/FlashcardParser/Types/Types";

export class Recap {
  public static commandName: string = "Recap";

  public text: string;
  public lineDescriptor: LineDescriptor;

  constructor(lineDescriptor: LineDescriptor, text?: string | null) {
    this.lineDescriptor = lineDescriptor;
    this.text = (text || "").trim();
  }

  public toJson(): object {
    return {
      name: Recap.commandName,
      vueComponent: VueRecap,
      text: this.text,
    };
  }
}

