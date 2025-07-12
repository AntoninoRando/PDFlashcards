export class PageRef {
  public pageRef: number;

  constructor(pageRef: number | string) {
    this.pageRef = Number(pageRef);
  }

  public toJson(): IPageRef {
    return {
      name: "pageref",
      vueComponent: null,
      ref: this.pageRef,
    };
  }
}

export interface IPageRef {
  name: string;
  vueComponent: any;
  ref: number;
}