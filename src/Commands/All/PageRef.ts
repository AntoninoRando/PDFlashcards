import VuePageRef from "../Components/VuePageRef.vue";
import { extractRegion, splitPageTokens, type PdfRegion } from "@/Utils/PdfRegion";

/** A page to show: resource alias (null for the default one), page, scroll % and region. */
export type PageStepRef = [string | null, number, number?, PdfRegion?];

export class PageRef {
	public static symbol: string = '..';
	public static commandName: string = 'pageref';

	public pageRef: number;
	public allPageRefs: PageStepRef[];
	public pagesString: string;
	public resourceAlias?: string;

	constructor(pageRef: string | null | undefined) {
		const raw = pageRef || '';
		let alias: string | undefined;
		let pageString = raw;

		// Support alias separator with ':' or ';' (first occurrence)
		const idxColon = raw.indexOf(':');
		const idxSemi = raw.indexOf(';');
		const idx = [idxColon, idxSemi]
			.filter((i) => i !== -1)
			.sort((a, b) => a - b)[0];

		if (idx !== undefined) {
			alias = raw.slice(0, idx).trim();
			pageString = raw.slice(idx + 1).trim();
		}

		this.pagesString = pageString;
		this.resourceAlias = alias;
		this.allPageRefs = this.parsePageRefs(pageString?.toString() || '', alias);
		this.pageRef = (this.allPageRefs[0]?.[1] ?? 0);
	}

	private parsePageRefs(pageRefString: string, defaultAlias?: string): PageStepRef[] {
		const result: PageStepRef[] = [];

		// Tokenize by ',' and ';' while allowing alias overrides per token.
		// Commas inside a region ({x,y,w,h}) do not separate tokens
		const tokens = splitPageTokens(pageRefString);

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

			// A single page can show a region of it: "num{x,y,w,h}"
			const { rest, region } = extractRegion(work);
			work = rest;

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
					const step: PageStepRef = [aliasForToken ?? currentAlias ?? null, num, scrollPercent];
					if (region) step[3] = region;
					result.push(step);
				}
			}
		}

		return result;
	}

	public toJson(): IPageRef {
		return {
			name: PageRef.commandName,
			vueComponent: VuePageRef,
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
	allRefs: PageStepRef[];
	pagesString: string;
	resourceAlias?: string;
}
