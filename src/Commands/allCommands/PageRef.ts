import VuePagRef from "../allCommandsComponent/VuePagRef.vue";

export class PageRef {
  public pageRef: number;
  public allPageRefs: number[];
  public pagesString: string;

  constructor(pageRef: string) {
    this.pagesString = pageRef;
    this.allPageRefs = this.parsePageRefs(pageRef?.toString() || '0');
    this.pageRef = this.allPageRefs[0] || 0;
  }

  private parsePageRefs(pageRefString: string): number[] {
    const result: number[] = [];
    
    // Split by comma to handle multiple parts
    const parts = pageRefString.split(',').map(part => part.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        // Handle range like "3-5"
        const [start, end] = part.split('-').map(num => parseInt(num.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            result.push(i);
          }
        }
      } else {
        // Handle single number
        const num = parseInt(part, 10);
        if (!isNaN(num)) {
          result.push(num);
        }
      }
    }
    
    return result;
  }

  public toJson(): IPageRef {
    return {
      name: "pageref",
      vueComponent: VuePagRef,
      ref: this.pageRef,
      allRefs: this.allPageRefs,
      pagesString: this.pagesString
    };
  }
}

export interface IPageRef {
  name: string;
  vueComponent: any;
  ref: number;
  allRefs: number[];
  pagesString: string;
}