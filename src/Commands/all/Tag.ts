import VueTag from "../components/VueTag.vue";

export class Tag {
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
