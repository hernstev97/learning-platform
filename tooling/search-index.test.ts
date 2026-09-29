import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { loadContent, type Loaded } from './content.ts';
import { buildSearchIndex, plainText } from './search-index.ts';
import { parseRoute } from '../src/router.ts';

/** Every entry must lead to an existing page and, with a fragment, to an element on it. */
function brokenLinks(loaded: Loaded): string[] {
  return buildSearchIndex(loaded).flatMap(({ href }) => {
    const [path, hash] = href.split('#');
    const route = parseRoute(path);
    const area = 'area' in route ? loaded.areas[route.area] : undefined;
    if (!area) return [href];
    const found = route.name === 'lesson' ? area.modules[route.module] && (!hash || area.modules[route.module].toc.some((entry) => entry.id === hash))
      : route.name === 'reference' && route.page === 'glossar' ? area.glossary.some((entry) => entry.id === hash)
      : route.name === 'reference' && route.page === 'spickzettel' ? !!area.cheatsheet && (!hash || area.cheatsheet.includes(`<h2 id="${hash}">`))
      : route.name === 'project' ? !hash && area.projects.some((project) => project.id === route.project)
      : route.name === 'cards' ? area.cards.some((card) => `karte-${card.id}` === hash)
      : false;
    return found ? [] : [href];
  });
}

describe('search index', () => {
  it('extracts the visible text of rendered Markdown', () => {
    const html = '<h2 id="x"><a class="anchor" href="#x" aria-hidden="true" tabindex="-1">#</a>Titel</h2><p>Siehe <a href="https://a.b" class="external">Doku<span class="sr-only"> (neuer Tab)</span></a>.</p>'
      + '<div class="codeblock" data-lang="rust"><div class="codeblock-bar"><span>Rust</span></div><pre tabindex="0"><code><span class="syntax-type">Vec</span>&lt;T&gt; &amp;&#39;a</code></pre></div>'
      + '<aside class="callout callout-tip"><p class="callout-title"><span>Tipp</span> Kurz</p><ul><li>eins</li><li>zwei</li></ul></aside>';
    expect(plainText(html)).toBe("Titel Siehe Doku. Vec<T> &'a Kurz eins zwei");
  });

  it('covers every kind of fixture content with plain text and working links', () => {
    const loaded = loadContent(undefined, join(import.meta.dirname, 'fixtures'));
    const docs = buildSearchIndex(loaded);
    expect([...new Set(docs.map((doc) => doc.kind))].sort()).toEqual(['card', 'cheatsheet', 'glossary', 'lesson', 'module', 'project']);
    expect(docs).toContainEqual(expect.objectContaining({ kind: 'lesson', title: 'Rust im Playground', context: 'Alle Übungsarten', href: '/beispiel/alle-typen#rust-im-playground' }));
    expect(docs).toContainEqual(expect.objectContaining({ kind: 'glossary', title: 'REPL', href: '/beispiel/glossar#begriff-repl' }));
    expect(docs).toContainEqual(expect.objectContaining({ kind: 'card', title: 'Was ist der GIL?', href: '/beispiel/karten#karte-gil' }));
    for (const doc of docs) expect(`${doc.title} ${doc.context} ${doc.text}`, doc.href).not.toMatch(/<\/?[a-z][^>]*>|&[a-z#0-9]+;|neuer Tab/);
    expect(brokenLinks(loaded)).toEqual([]);
  });

  it('links every published entry to an existing page and anchor', () => {
    const loaded = loadContent();
    const docs = buildSearchIndex(loaded);
    for (const area of loaded.catalog.areas) {
      const own = docs.filter((doc) => doc.area === area.id);
      expect(own.filter((doc) => doc.kind === 'module'), area.id).toHaveLength(area.modules.length);
      expect(own.filter((doc) => doc.kind === 'glossary'), area.id).toHaveLength(area.counts.glossary);
      expect(own.filter((doc) => doc.kind === 'card'), area.id).toHaveLength(area.counts.cards);
      expect(own.filter((doc) => doc.kind === 'project'), area.id).toHaveLength(area.counts.projects);
      const anchors = loaded.areas[area.id].glossary.map((entry) => entry.id);
      expect(new Set(anchors).size, `${area.id}: Glossar-Anker`).toBe(anchors.length);
    }
    expect(brokenLinks(loaded)).toEqual([]);
  });
});
