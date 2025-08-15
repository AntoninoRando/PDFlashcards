import VueTag from "../Components/VueTag.vue";

export class Tag {
    public static symbol: string = '#';

    public tag: string;

    constructor(tag: string) {
        this.tag = tag;
    }

    public toJson(): object {
        return {
            name: "Tag",
            vueComponent: VueTag,
            tag: this.tag,
        };
    }
}
