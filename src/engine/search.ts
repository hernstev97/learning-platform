// Global search over the build-time index (tooling/search-index.ts). Plain substring matching is enough for this
// amount of text and also finds code such as `Box::new` or `--force-with-lease`; the ranking prefers titles and word starts.
import type { SearchDoc, SearchKind } from '../content/types.ts';

/**
 * Lower case without accents (Ü → u), one UTF-16 code unit for one, so positions found in folded text also apply to the
 * original text for highlighting.
 */
export function fold(text: string): string {
  let lower = text.toLowerCase();
  // A few characters grow when lower-cased (İ → i̇).
  if (lower.length !== text.length) lower = text.replace(/[\s\S]/g, (char) => char.toLowerCase()[0]);
  return lower.replace(/[^\x00-\x7f]/g, (char) => char.normalize('NFD')[0]);
}

export type Prepared = { doc: SearchDoc; title: string; context: string; text: string };
export const prepare = (docs: SearchDoc[]): Prepared[] => docs.map((doc) => ({ doc, title: fold(doc.title), context: fold(doc.context), text: fold(doc.text) }));

/** Text with ranges to highlight. */
export type Marked = { text: string; marks: [number, number][] };
export type Hit = { doc: SearchDoc; score: number; title: Marked; snippet: Marked };

export const MIN_QUERY = 2;
export const queryTerms = (query: string) => [...new Set(fold(query).split(/\s+/).filter(Boolean))];

const WORD = /[\p{L}\p{N}]/u;
const isWord = (char: string | undefined) => char !== undefined && WORD.test(char);

/** The best occurrence of `term`. Quality 3: a whole word ("GIL"), 2: the start of a word ("gilt"), 1: anywhere, 0: none. */
function find(text: string, term: string): { at: number; quality: number } {
  let best = { at: -1, quality: 0 };
  for (let at = text.indexOf(term); at !== -1 && best.quality < 3; at = text.indexOf(term, at + 1)) {
    const quality = isWord(text[at - 1]) ? 1 : isWord(text[at + term.length]) ? 2 : 3;
    if (quality > best.quality) best = { at, quality };
  }
  return best;
}

function occurrences(text: string, term: string, max: number): number {
  let count = 0;
  for (let at = text.indexOf(term); at !== -1 && count < max; at = text.indexOf(term, at + term.length)) count++;
  return count;
}

// Small tie-breakers for title matches: a module or glossary term is usually the better entry point than a paragraph.
const KIND_BONUS: Record<SearchKind, number> = { module: 3, glossary: 2, project: 1, card: 1, cheatsheet: 1, lesson: 0 };

function score(entry: Prepared, terms: string[], phrase: string): number {
  let total = 0;
  let inTitle = 0;
  for (const term of terms) {
    const title = find(entry.title, term);
    const context = find(entry.context, term);
    const text = find(entry.text, term);
    // Every term has to occur somewhere.
    if (!title.quality && !context.quality && !text.quality) return 0;
    if (title.quality) { inTitle++; total += [0, 4, 9, 12][title.quality] + (title.at === 0 ? 4 : 0); }
    total += context.quality;
    if (text.quality) total += text.quality + occurrences(entry.text, term, 8) * 0.5;
  }
  if (entry.title === phrase) total += 40;
  else if (terms.length > 1 && entry.title.includes(phrase)) total += 15;
  else if (terms.length > 1 && entry.text.includes(phrase)) total += 6;
  if (inTitle) total += KIND_BONUS[entry.doc.kind];
  if (inTitle === terms.length) total += 8 + 4 * (1 - Math.min(entry.title.length, 80) / 80);
  return total;
}

/** Non-overlapping ranges of all occurrences of the terms. One-letter terms are only marked if nothing longer is searched. */
export function markRanges(folded: string, terms: string[]): [number, number][] {
  const longer = terms.filter((term) => term.length > 1);
  const found: [number, number][] = [];
  for (const term of longer.length ? longer : terms) {
    for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + term.length)) found.push([at, at + term.length]);
  }
  found.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: [number, number][] = [];
  for (const range of found) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  return merged;
}

const SNIPPET = 180;
const LEAD = 60;
/** A window of the text around the first match (the whole phrase if it occurs), cut at spaces. */
export function snippet(text: string, folded: string, terms: string[], phrase: string): Marked {
  let at = terms.length > 1 ? folded.indexOf(phrase) : -1;
  if (at === -1) {
    const positions = terms.map((term) => find(folded, term).at).filter((position) => position !== -1);
    at = positions.length ? Math.min(...positions) : 0;
  }
  let start = Math.max(0, at - LEAD);
  if (start > 0) {
    const space = text.indexOf(' ', start);
    start = space !== -1 && space < at ? space + 1 : start;
  }
  let end = Math.min(text.length, start + SNIPPET);
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    if (space > at) end = space;
  }
  const prefix = start > 0 ? '… ' : '';
  return {
    text: prefix + text.slice(start, end) + (end < text.length ? ' …' : ''),
    marks: markRanges(folded.slice(start, end), terms).map(([from, to]) => [from + prefix.length, to + prefix.length]),
  };
}

/** All entries containing every term, best first; titles and snippets are only prepared for the first `limit`. */
export function search(index: Prepared[], query: string, limit = 50): { hits: Hit[]; total: number } {
  const terms = queryTerms(query);
  if (terms.join(' ').length < MIN_QUERY) return { hits: [], total: 0 };
  const phrase = terms.join(' ');
  const ranked: { entry: Prepared; score: number }[] = [];
  for (const entry of index) {
    const value = score(entry, terms, phrase);
    if (value > 0) ranked.push({ entry, score: value });
  }
  // Stable: equal scores keep the index order (areas, then the order of their content).
  ranked.sort((a, b) => b.score - a.score);
  return {
    total: ranked.length,
    hits: ranked.slice(0, limit).map(({ entry, score }) => ({
      doc: entry.doc, score,
      title: { text: entry.doc.title, marks: markRanges(entry.title, terms) },
      snippet: snippet(entry.doc.text, entry.text, terms, phrase),
    })),
  };
}
