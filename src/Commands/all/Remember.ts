import VueRemember from "../components/VueRemember.vue";

// Test your Remember class
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