export class PageCard {
    public pageRef: number;

    constructor(pageRef: number | string) {
        this.pageRef = Number(pageRef);
    }
}