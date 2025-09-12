import VueRemember from "../Components/VueRemember.vue";

export class Note {
  public static commandName: string = "Note";

  public text: string;

  constructor(text?: string | null) {
    this.text = (text || "").trim();
  }

  public toJson(): object {
    return {
      name: Note.commandName,
      vueComponent: VueRemember,
      // Reuse VueRemember prop name for identical display
      what: this.text,
    };
  }
}

