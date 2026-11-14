/*
  A rectangular region of a PDF page, written in study sets right after a page
  number: `What is X? .. 12{10,20,60,30}`. The four numbers are the left, top,
  width and height of the region, as percentages of the page size, so they do
  not depend on the zoom the page is shown at.
*/

export interface PdfRegion {
  /** Left edge, % of the page width. */
  x: number;
  /** Top edge, % of the page height. */
  y: number;
  /** Width, % of the page width. */
  w: number;
  /** Height, % of the page height. */
  h: number;
}

export const REGION_START_SYMBOL = "{" as const;
export const REGION_END_SYMBOL = "}" as const;

/** Regions smaller than this (in %) are treated as accidental clicks. */
export const MIN_REGION_SIZE = 1;

/**
 * Splits a page list on `,` and `;`, except inside a region (whose numbers are
 * separated by commas too).
 */
export function splitPageTokens(pages: string): string[] {
  const tokens: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of pages) {
    if (char === REGION_START_SYMBOL) depth++;
    else if (char === REGION_END_SYMBOL) depth = Math.max(0, depth - 1);

    if ((char === "," || char === ";") && depth === 0) {
      tokens.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  tokens.push(current);
  return tokens.map((t) => t.trim()).filter((t) => t.length > 0);
}

/**
 * Separates the region from a page token (`12{10,20,60,30}` -> `12` and the
 * region). `region` is null when the token has none, `error` is set when it
 * has one that cannot be read.
 */
export function extractRegion(token: string): { rest: string; region: PdfRegion | null; error?: string } {
  const start = token.indexOf(REGION_START_SYMBOL);
  if (start === -1) {
    return token.includes(REGION_END_SYMBOL)
      ? { rest: token, region: null, error: `"${token}" has a "}" without "{"` }
      : { rest: token, region: null };
  }
  const end = token.indexOf(REGION_END_SYMBOL, start);
  if (end === -1) return { rest: token, region: null, error: `"${token}" has a "{" without "}"` };

  const rest = (token.slice(0, start) + token.slice(end + 1)).trim();
  const region = parseRegion(token.slice(start + 1, end));
  if (!region) {
    return {
      rest,
      region: null,
      error: `"${token}" has an invalid region: write {left,top,width,height} in % of the page`,
    };
  }
  return { rest, region };
}

/** Reads `x,y,w,h` (percentages); null if it is not a region inside the page. */
export function parseRegion(text: string): PdfRegion | null {
  const parts = text.split(",").map((p) => p.trim());
  if (parts.length !== 4 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return null;
  const [x, y, w, h] = parts.map(Number);
  if (w <= 0 || h <= 0 || x + w > 100.05 || y + h > 100.05) return null;
  return { x, y, w, h };
}

/** Writes a region as it appears in study sets: `{10,20,60,30}`. */
export function formatRegion(region: PdfRegion): string {
  const r = clampRegion(region);
  // Round the edges first, so that rounding cannot push the region off the page
  const x = round(r.x);
  const y = round(r.y);
  const w = Math.min(round(r.w), round(100 - x));
  const h = Math.min(round(r.h), round(100 - y));
  return `${REGION_START_SYMBOL}${[x, y, w, h].join(",")}${REGION_END_SYMBOL}`;
}

/**
 * The smallest region containing all the given ones (e.g. the lines of a text
 * selection), with a little margin so that the highlight does not touch the
 * text. Null for an empty list.
 */
export function regionAround(parts: PdfRegion[], margin = { x: 0.8, y: 0.5 }): PdfRegion | null {
  if (!parts.length) return null;
  const left = Math.min(...parts.map((p) => p.x)) - margin.x;
  const top = Math.min(...parts.map((p) => p.y)) - margin.y;
  const right = Math.max(...parts.map((p) => p.x + p.w)) + margin.x;
  const bottom = Math.max(...parts.map((p) => p.y + p.h)) + margin.y;
  const x = clamp(left, 0, 100);
  const y = clamp(top, 0, 100);
  return clampRegion({ x, y, w: clamp(right, 0, 100) - x, h: clamp(bottom, 0, 100) - y });
}

/** Keeps a region inside the page (0-100%). */
export function clampRegion(region: PdfRegion): PdfRegion {
  const x = clamp(region.x, 0, 100);
  const y = clamp(region.y, 0, 100);
  return { x, y, w: clamp(region.w, 0, 100 - x), h: clamp(region.h, 0, 100 - y) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** One decimal at most: enough precision, short to read. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}
