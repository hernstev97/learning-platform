import { describe, expect, it } from 'vitest';
import type { SearchDoc } from '../content/types.ts';
import { fold, markRanges, prepare, search, snippet, type Marked } from './search.ts';

const doc = (title: string, text: string, extra: Partial<SearchDoc> = {}): SearchDoc => ({ area: 'rust', kind: 'lesson', title, context: '', text, href: `/rust/${title}`, ...extra });
const marked = ({ text, marks }: Marked) => marks.map(([from, to]) => text.slice(from, to));

describe('search', () => {
  it('folds case and accents without changing positions', () => {
    expect(fold('Übergröße École')).toBe('ubergroße ecole');
    for (const text of ['Straße', 'İstanbul', 'Emoji 🦀 bleibt']) expect(fold(text)).toHaveLength(text.length);
  });

  it('requires every term, anywhere in title, context or text', () => {
    const index = prepare([doc('Ownership', 'Wer besitzt den Wert?'), doc('Borrowing', 'Referenzen leihen', { context: 'Ownership & Borrowing' }), doc('Traits', 'Nichts davon')]);
    expect(search(index, 'ownership').hits.map((hit) => hit.doc.title)).toEqual(['Ownership', 'Borrowing']);
    expect(search(index, 'borrowing leihen').hits.map((hit) => hit.doc.title)).toEqual(['Borrowing']);
    expect(search(index, 'ownership traits').total).toBe(0);
  });

  it('ranks exact titles, then title matches, then whole words before word parts', () => {
    const index = prepare([
      doc('Nebenläufigkeit', 'Hier gilt eine andere Regel.'),
      doc('Threads', 'Der GIL erlaubt einen Thread.'),
      doc('Threads und der GIL', 'Bytecode'),
      doc('GIL', 'Global Interpreter Lock', { kind: 'glossary' }),
    ]);
    expect(search(index, 'gil').hits.map((hit) => hit.doc.title)).toEqual(['GIL', 'Threads und der GIL', 'Threads', 'Nebenläufigkeit']);
  });

  it('finds umlauts without typing them and code with punctuation', () => {
    const index = prepare([doc('Überblick', 'let b = Box::new(5);'), doc('Andere', 'git push --force-with-lease')]);
    expect(search(index, 'uberblick').hits[0].doc.title).toBe('Überblick');
    expect(search(index, 'box::new').hits[0].doc.title).toBe('Überblick');
    expect(search(index, '--force-with-lease').hits[0].doc.title).toBe('Andere');
  });

  it('needs two characters and reports the total beyond the limit', () => {
    const index = prepare(Array.from({ length: 30 }, (_, i) => doc(`Modul ${i}`, 'Iterator')));
    expect(search(index, ' i ').total).toBe(0);
    const result = search(index, 'iterator', 10);
    expect(result.hits).toHaveLength(10);
    expect(result.total).toBe(30);
  });

  it('marks every occurrence in title and snippet, also across accents', () => {
    const [hit] = search(prepare([doc('Über Iteratoren', 'Ein Iterator liefert Werte über next().')]), 'uber iter').hits;
    expect(marked(hit.title)).toEqual(['Über', 'Iter']);
    expect(marked(hit.snippet)).toEqual(['Iter', 'über']);
    expect(markRanges('aaa', ['aa'])).toEqual([[0, 2]]);
    expect(markRanges('rebase -i', ['rebase', 'i'])).toEqual([[0, 6]]);
  });

  it('cuts the snippet around the first match at word boundaries', () => {
    const text = `${'Vorher '.repeat(40)}Hier steht der Borrow Checker im Satz.${' Danach'.repeat(40)}`;
    const result = snippet(text, fold(text), ['borrow', 'checker'], 'borrow checker');
    expect(result.text.startsWith('… ')).toBe(true);
    expect(result.text.endsWith(' …')).toBe(true);
    expect(result.text).toMatch(/^… (Vorher )+Hier steht der Borrow Checker/);
    expect(marked(result)).toEqual(['Borrow', 'Checker']);
    expect(snippet('kurz', 'kurz', ['x'], 'x')).toEqual({ text: 'kurz', marks: [] });
  });
});
