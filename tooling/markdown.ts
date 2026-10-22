import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Marked, type Tokens } from 'marked';
import { escape, highlight, languageOf } from '../src/engine/highlight.ts';
import type { TocEntry } from '../src/content/types.ts';

// Build-time Markdown. Content is authored in this repository and therefore trusted.

const PUBLIC = join(import.meta.dirname, '..', 'public');

/**
 * Width and height of a PNG under public/media/, in CSS pixels: a name ending in `@2x.png` holds twice as many
 * pixels as it shows. Null if the file is missing or no PNG.
 */
function pngSize(root: string, src: string): { width: number; height: number } | null {
  const file = join(root, src);
  if (!/^\/media\/[\w\-/.@]+\.png$/.test(src) || src.includes('..') || !existsSync(file)) return null;
  const head = readFileSync(file).subarray(0, 24);
  if (head.toString('latin1', 1, 4) !== 'PNG') return null;
  const density = Number(src.match(/@(\d)x\.png$/)?.[1] ?? 1);
  return { width: Math.round(head.readUInt32BE(16) / density), height: Math.round(head.readUInt32BE(20) / density) };
}

const CALLOUTS: Record<string, string> = {
  NOTE: 'Hinweis', TIP: 'Tipp', WARNING: 'Achtung', INTERVIEW: 'Im Interview', PRAXIS: 'Aus der Praxis', MERKE: 'Merksatz', DEEP: 'Tiefer graben',
};
export const slug = (value: string) => value.toLowerCase()
  .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c]!)
  .replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'abschnitt';

const LABELS: Record<string, string> = {
  kotlin: 'Kotlin', rust: 'Rust', python: 'Python', shell: 'Shell', console: 'Terminal', yaml: 'YAML', toml: 'TOML', json: 'JSON',
  sql: 'SQL', postgres: 'PostgreSQL', xml: 'XML', dockerfile: 'Dockerfile', ini: 'Konfiguration', diff: 'Diff', text: 'Text',
  excel: 'Excel-Formel', powerquery: 'Power Query (M)', csv: 'CSV', typescript: 'TypeScript', javascript: 'JavaScript', gdscript: 'GDScript',
};

/** Render a fenced code block; shared by lessons and exercise code. */
export function codeBlock(text: string, info = ''): string {
  const [lang = '', ...flags] = info.trim().split(/\s+/);
  const name = languageOf(lang);
  // Python runs as a script (or, marked `pytest`, as a test file under pytest); SQL runs statement by statement
  // against a fresh in-memory SQLite database, `postgres` against a fresh PostgreSQL database (PGlite).
  const pytest = flags.includes('pytest') && name === 'python';
  const runnable = pytest || (flags.includes('run') && (name === 'python' || name === 'sql' || name === 'postgres'));
  // Shell commands that run unchanged in the Linux VM get a button that types them into the lesson's terminal.
  const vm = flags.includes('vm') && (name === 'shell' || name === 'console');
  const playground = name === 'rust' && /\bfn main\s*\(/.test(text) && !flags.includes('norun') && !flags.includes('nocheck');
  const title = flags.find((flag) => flag.startsWith('title='))?.slice(6).replace(/_/g, ' ');
  const label = title ?? (pytest ? 'Python · pytest' : LABELS[name]) ?? (lang || 'Text');
  // `postgres run continue`: like psql without ON_ERROR_STOP, a failing statement does not end the block.
  const keepGoing = runnable && name === 'postgres' && flags.includes('continue');
  const attrs = [`data-lang="${escape(name)}"`, runnable ? `data-run="${pytest ? 'pytest' : name}"` : '', keepGoing ? 'data-continue' : '', vm ? 'data-vm' : '', playground ? 'data-playground="rust"' : ''].filter(Boolean).join(' ');
  const body = runnable
    ? `<textarea class="code-editor" wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="${name === 'python' ? 'Python' : 'SQL'}-Code, editierbar">${escape(text)}</textarea>`
    : `<pre tabindex="0"><code>${highlight(text, name)}</code></pre>`;
  return `<div class="codeblock" ${attrs}><div class="codeblock-bar"><span>${escape(label)}</span></div>${body}</div>`;
}

export function createMarkdown({ media = PUBLIC }: { media?: string } = {}) {
  let toc: TocEntry[] = [];
  const used = new Set<string>();
  let imageProblems: string[] = [];
  /** `![Alt](/media/…png "Caption")`: the size comes from the file, so the page does not jump while it loads. A tap opens the full image. */
  function image({ href, title, text }: Tokens.Image): string {
    const size = pngSize(media, href);
    if (!size) imageProblems.push(`Bild ${href} fehlt: erlaubt sind PNG-Dateien unter public/media/`);
    if (!text.trim()) imageProblems.push(`Bild ${href} braucht einen Alt-Text, der beschreibt, was zu sehen ist`);
    const img = `<img src="${escape(href)}" alt="${escape(text)}"${size ? ` width="${size.width}" height="${size.height}"` : ''} loading="lazy" decoding="async">`;
    return `<a class="figure-link" href="${escape(href)}" target="_blank" rel="noopener">${img}<span class="sr-only"> (in voller Größe, neuer Tab)</span></a>${title ? `<figcaption>${escape(title)}</figcaption>` : ''}`;
  }
  const marked = new Marked({
    gfm: true,
    renderer: {
      code({ text, lang }: Tokens.Code) { return codeBlock(text, lang ?? ''); },
      image,
      // An image on its own line is a figure; its title becomes the caption.
      paragraph(this: any, { tokens }: Tokens.Paragraph) {
        if (tokens.length === 1 && tokens[0].type === 'image') return `<figure class="figure">${image(tokens[0] as Tokens.Image)}</figure>\n`;
        return `<p>${this.parser.parseInline(tokens)}</p>\n`;
      },
      heading(this: any, { tokens, depth }: Tokens.Heading) {
        const html = this.parser.parseInline(tokens);
        const level = Math.min(depth + 0, 6);
        let id = slug(html);
        for (let n = 2; used.has(id); n++) id = `${slug(html)}-${n}`;
        used.add(id);
        if (depth === 2) toc.push({ id, title: html.replace(/<[^>]+>/g, '') });
        return `<h${level} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${html}</h${level}>\n`;
      },
      link(this: any, { href, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        return `<a href="${escape(href)}"${title ? ` title="${escape(title)}"` : ''}${external ? ' target="_blank" rel="noopener noreferrer" class="external"' : ''}>${text}${external ? '<span class="sr-only"> (neuer Tab)</span>' : ''}</a>`;
      },
      table(this: any, token: Tokens.Table) {
        const cell = (c: Tokens.TableCell) => this.parser.parseInline(c.tokens);
        const align = (a: string | null) => a ? ` style="text-align:${a}"` : '';
        const head = `<tr>${token.header.map((c, i) => `<th${align(token.align[i])}>${cell(c)}</th>`).join('')}</tr>`;
        const rows = token.rows.map((row) => `<tr>${row.map((c, i) => `<td${align(token.align[i])}>${cell(c)}</td>`).join('')}</tr>`).join('');
        return `<div class="table-wrap"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });
  /** `> [!TIP] Title` blocks become <aside> elements whose body is regular Markdown. */
  function callouts(source: string): string {
    const lines = source.split('\n');
    const out: string[] = [];
    let fence: string | null = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fenceMatch = line.match(/^\s*(```+|~~~+)/);
      if (fenceMatch) fence = fence === null ? fenceMatch[1] : line.trim().startsWith(fence) ? null : fence;
      const match = fence === null ? line.match(/^> ?\[!([A-Z]+)\][ \t]*(.*)$/) : null;
      if (!match || !CALLOUTS[match[1]]) { out.push(line); continue; }
      const body: string[] = [];
      while (i + 1 < lines.length && /^>/.test(lines[i + 1])) body.push(lines[++i].replace(/^> ?/, ''));
      const heading = match[2] ? ` ${marked.parseInline(match[2], { async: false })}` : '';
      out.push('', `<aside class="callout callout-${match[1].toLowerCase()}"><p class="callout-title"><span>${CALLOUTS[match[1]]}</span>${heading}</p>`, '', ...body, '', '</aside>', '');
    }
    return out.join('\n');
  }
  return {
    /** Full document; collects `## ` headings for a table of contents. */
    document(source: string): { html: string; toc: TocEntry[] } {
      toc = [];
      used.clear();
      const html = marked.parse(callouts(source), { async: false }) as string;
      const result = { html, toc };
      // Later block() calls (exercise prompts, project briefs) must not add their headings to this lesson's table of contents.
      toc = [];
      return result;
    },
    block(source: string): string {
      return marked.parse(callouts(source), { async: false }) as string;
    },
    inline(source: string): string {
      return marked.parseInline(source, { async: false }) as string;
    },
    /** Missing files and alt texts of the images rendered since the last call. */
    takeImageProblems(): string[] {
      const problems = imageProblems;
      imageProblems = [];
      return problems;
    },
  };
}
