import { Marked, type Tokens } from 'marked';
import { escape, highlight, languageOf } from '../src/engine/highlight.ts';
import type { TocEntry } from '../src/content/types.ts';

// Build-time Markdown. Content is authored in this repository and therefore trusted.

const CALLOUTS: Record<string, string> = {
  NOTE: 'Hinweis', TIP: 'Tipp', WARNING: 'Achtung', INTERVIEW: 'Im Interview', PRAXIS: 'Aus der Praxis', MERKE: 'Merksatz', DEEP: 'Tiefer graben',
};
export const slug = (value: string) => value.toLowerCase()
  .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[c]!)
  .replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'abschnitt';

const LABELS: Record<string, string> = {
  kotlin: 'Kotlin', rust: 'Rust', python: 'Python', shell: 'Shell', console: 'Terminal', yaml: 'YAML', toml: 'TOML', json: 'JSON',
  sql: 'SQL', postgres: 'PostgreSQL', xml: 'XML', dockerfile: 'Dockerfile', ini: 'Konfiguration', diff: 'Diff', text: 'Text',
  excel: 'Excel-Formel', powerquery: 'Power Query (M)', csv: 'CSV', typescript: 'TypeScript', javascript: 'JavaScript',
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

export function createMarkdown() {
  let toc: TocEntry[] = [];
  const used = new Set<string>();
  const marked = new Marked({
    gfm: true,
    renderer: {
      code({ text, lang }: Tokens.Code) { return codeBlock(text, lang ?? ''); },
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
      return { html, toc };
    },
    block(source: string): string {
      return marked.parse(callouts(source), { async: false }) as string;
    },
    inline(source: string): string {
      return marked.parseInline(source, { async: false }) as string;
    },
  };
}
