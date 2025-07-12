import VueRemember from "../allCommandsComponent/VueRemember.vue";

export class Remember {
  public what: string;

  constructor(what: string) {
    this.what = what;
  }

  public toJson(): object {
    return {
      name: "Remember",
      vueComponent: VueRemember,
      what: this.what,
    };
  }
}
