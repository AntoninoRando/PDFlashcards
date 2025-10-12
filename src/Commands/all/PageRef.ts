import VuePagRef from "../Components/VuePagRef.vue";

export class PageRef {
	public static symbol: string = '..';
	public static commandName: string = 'pageref';

	public pageRef: number;
	public allPageRefs: Array<[string | null, number, number?]>;
	public pagesString: string;
	public resourceAlias?: string;

	constructor(pageRef: string) {
		let alias: string | undefined;
		let pageString = pageRef || '';

		// Support alias separator with ':' or ';' (first occurrence)
		const idxColon = pageRef.indexOf(':');
		const idxSemi = pageRef.indexOf(';');
		const idx = [idxColon, idxSemi]
			.filter((i) => i !== -1)
			.sort((a, b) => a - b)[0];

		if (idx !== undefined) {
			alias = pageRef.slice(0, idx).trim();
			pageString = pageRef.slice(idx + 1).trim();
		}

		this.pagesString = pageString;
		this.resourceAlias = alias;
		this.allPageRefs = this.parsePageRefs(pageString?.toString() || '', alias);
		this.pageRef = (this.allPageRefs[0]?.[1] ?? 0);
	}

	private parsePageRefs(pageRefString: string, defaultAlias?: string): Array<[string | null, number, number?]> {
		const result: Array<[string | null, number, number?]> = [];

		// Tokenize by ',' and ';' while allowing alias overrides per token.
		const tokens = pageRefString
			.split(/[;,]/)
			.map((t) => t.trim())
			.filter((t) => t.length > 0);

		let currentAlias: string | null = defaultAlias ?? null;

		for (const token of tokens) {
			// If token has an explicit alias using ':' then it sets/overrides current alias
			let work = token;
			let aliasForToken: string | null = null;
			const pos = token.indexOf(':');
			if (pos !== -1) {
				aliasForToken = token.slice(0, pos).trim() || null;
				work = token.slice(pos + 1).trim();
				// Persist alias for following tokens until changed
				currentAlias = aliasForToken;
			}

			// If token looks like a bare alias (no digits and no colon), treat it as a context switch
			if (pos === -1 && !/[0-9]/.test(work)) {
				currentAlias = work || null;
				continue;
			}

			if (!work) continue;

			// Parse either range "a-b" or single number, with optional scroll percentage "num%scroll"
			let scrollPercent: number | undefined = undefined;
			const percentPos = work.indexOf('%');
			if (percentPos !== -1) {
				const scrollStr = work.slice(percentPos + 1).trim();
				const scrollNum = parseInt(scrollStr, 10);
				if (!isNaN(scrollNum)) {
					scrollPercent = scrollNum;
				}
				work = work.slice(0, percentPos).trim();
			}

			if (work.includes('-')) {
				const [startStr, endStr] = work.split('-').map((s) => s.trim());
				const start = parseInt(startStr, 10);
				const end = parseInt(endStr, 10);
				if (!isNaN(start) && !isNaN(end)) {
					for (let i = start; i <= end; i++) {
						result.push([aliasForToken ?? currentAlias ?? null, i, scrollPercent]);
					}
				}
			} else {
				const num = parseInt(work, 10);
				if (!isNaN(num)) {
					result.push([aliasForToken ?? currentAlias ?? null, num, scrollPercent]);
				}
			}
		}

		return result;
	}

	public toJson(): IPageRef {
		return {
			name: PageRef.commandName,
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
	allRefs: Array<[string | null, number, number?]>;
	pagesString: string;
	resourceAlias?: string;
}
