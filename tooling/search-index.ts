// Builds the global search index (virtual:search-index) from the normalised content.
// Every entry points to a place the learner can open: a module, a lesson or cheatsheet section, a glossary term,
// a project or an interview card. Text is extracted from the already rendered HTML, so it matches what the pages show.
import type { SearchDoc } from '../src/content/types.ts';
import type { Loaded } from './content.ts';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (text: string) => text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) =>
  name[0] !== '#' ? ENTITIES[name] ?? entity : String.fromCodePoint(name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1))));
const BLOCK = /<\/?(?:p|div|pre|ul|ol|li|dl|dt|dd|table|thead|tbody|tr|th|td|h[1-6]|blockquote|aside|details|summary|br|hr)\b[^>]*>/g;

/** The visible text of build-time HTML. Heading anchors, screen reader additions and code block captions are not content. */
export function plainText(html: string): string {
  return decode(html
    .replace(/<a class="anchor"[^>]*>#<\/a>/g, '')
    .replace(/<span class="sr-only">[^<]*<\/span>/g, '')
    .replace(/<div class="codeblock-bar">[\s\S]*?<\/div>/g, '')
    .replace(/<p class="callout-title"><span>[^<]*<\/span>/g, '<p>')
    .replace(BLOCK, ' ')
    .replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ').trim();
}

/** Splits rendered Markdown at its `##` headings, the same ones the lesson's table of contents links to. */
export function sections(html: string): { intro: string; parts: { id: string; title: string; html: string }[] } {
  const headings = [...html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)];
  return {
    intro: html.slice(0, headings[0]?.index ?? html.length),
    parts: headings.map((heading, i) => ({
      id: heading[1], title: plainText(heading[2]), html: html.slice(heading.index + heading[0].length, headings[i + 1]?.index ?? html.length),
    })),
  };
}

export function buildSearchIndex({ catalog, areas }: Pick<Loaded, 'catalog' | 'areas'>): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const summary of catalog.areas) {
    const area = areas[summary.id];
    const base = `/${summary.id}`;
    const add = (kind: SearchDoc['kind'], title: string, context: string, text: string[], href: string) =>
      docs.push({ area: summary.id, kind, title, context, text: text.filter(Boolean).join(' '), href });

    for (const track of summary.tracks) for (const id of track.modules) {
      const module = area.modules[id];
      const { intro, parts } = sections(module.lesson);
      add('module', module.title, track.title, [module.summary, ...module.goals.map(plainText), plainText(intro)], `${base}/${id}`);
      for (const part of parts) add('lesson', part.title, module.title, [plainText(part.html)], `${base}/${id}#${part.id}`);
    }
    for (const entry of area.glossary) add('glossary', entry.term, '', [plainText(entry.definition)], `${base}/glossar#${entry.id}`);
    if (area.cheatsheet) {
      const { intro, parts } = sections(area.cheatsheet);
      const lead = plainText(intro.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, ''));
      if (lead) add('cheatsheet', 'Spickzettel', '', [lead], `${base}/spickzettel`);
      for (const part of parts) add('cheatsheet', part.title, '', [plainText(part.html)], `${base}/spickzettel#${part.id}`);
    }
    for (const project of area.projects) {
      add('project', project.title, project.capstone ? 'Abschlussprojekt' : '', [
        ...[project.summary, project.brief, ...project.steps.flatMap((step) => [step.title, step.detail])].map(plainText),
        project.skills.join(', '), ...[...project.acceptance.map((item) => item.text), ...project.stretch, project.portfolio].map(plainText),
      ], `${base}/projekte/${project.id}`);
    }
    for (const card of area.cards) add('card', plainText(card.question), card.tags.join(', '), [plainText(card.answer)], `${base}/karten#karte-${card.id}`);
  }
  return docs;
}
