import VueExample from "../Components/VueExample.vue";
import { LineDescriptor } from "@/FlashcardParser/Types/Types";

export class Example {
  public static commandName: string = "Example";

  public text: string;
  public lineDescriptor: LineDescriptor;

  constructor(lineDescriptor: LineDescriptor, text?: string | null) {
    this.lineDescriptor = lineDescriptor;
    this.text = (text || "").trim();
  }

  public toJson(): object {
    return {
      name: Example.commandName,
      vueComponent: VueExample,
      text: this.text,
    };
  }
}

