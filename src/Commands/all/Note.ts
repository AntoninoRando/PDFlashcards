import VueNote from "../Components/VueNote.vue";

export class Note {
  public static commandName: string = "Note";

  public text: string;

  constructor(text?: string | null) {
    this.text = (text || "").trim();
  }

  public toJson(): object {
    return {
      name: Note.commandName,
      vueComponent: VueNote,
      // Reuse VueRemember prop name for identical display
      what: this.text,
    };
  }
}

