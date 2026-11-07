import VueRemember from "../Components/VueRemember.vue";

export class Remember {
    public static symbol: string = '+';
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