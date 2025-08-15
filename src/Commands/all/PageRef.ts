import VuePagRef from "../components/VuePagRef.vue";

export class PageRef {
  public static symbol: string = '..';
  
  public pageRef: number;
  public allPageRefs: number[];
  public pagesString: string;
  public resourceAlias?: string;

  constructor(pageRef: string) {
    let alias: string | undefined;
    let pageString = pageRef;

    const idx = pageRef.indexOf(':');
    if (idx !== -1) {
      alias = pageRef.slice(0, idx).trim();
      pageString = pageRef.slice(idx + 1).trim();
    }

    this.pagesString = pageString;
    this.resourceAlias = alias;
    this.allPageRefs = this.parsePageRefs(pageString?.toString() || '0');
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
      pagesString: this.pagesString,
      resourceAlias: this.resourceAlias
    };
  }
}

export interface IPageRef {
  name: string;
  vueComponent: any;
  ref: number;
  allRefs: number[];
  pagesString: string;
  resourceAlias?: string;
}