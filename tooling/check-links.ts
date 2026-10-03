// pnpm links [bereich ...]
// Checks every external URL in content/ (lessons, exercises, resources, pages). Anchors (#…) are
// checked too where the page is HTML: the id or name must exist in the document.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Marked } from 'marked';
import { parse as parseYaml } from 'yaml';
import { CONTENT, ROOT } from './content.ts';

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) { if (name !== 'bear') walk(path); }
    else if (/\.(ya?ml|md)$/.test(name)) files.push(path);
  }
};
for (const area of readdirSync(CONTENT)) if (!only.length || only.includes(area)) walk(join(CONTENT, area));

const uses = new Map<string, string[]>();
const markdown = new Marked({ gfm: true });
const proseFields = new Set(['lesson', 'prompt', 'explanation', 'summary', 'description', 'outcomes', 'goals', 'hints', 'hint', 'wiki', 'body', 'text', 'why', 'q', 'a', 'brief', 'detail', 'acceptance', 'stretch', 'portfolio', 'definition', 'checklist', 'points']);
for (const file of files) {
  const add = (url: string) => {
    if (!url.startsWith('https://')) return;
    const host = new URL(url).hostname;
    if (url.includes('${') || /(^|\.)example\.(com|org|net)$|\.(example|invalid|test)$|^(localhost|127\.0\.0\.1)$/.test(host)) return;
    uses.set(url, [...(uses.get(url) ?? []), relative(ROOT, file)]);
  };
  const linksIn = (source: string) => markdown.walkTokens(markdown.lexer(source), (token) => {
    if (token.type === 'link') add(token.href);
  });
  const visit = (value: unknown, field = '') => {
    if (typeof value === 'string') {
      if (field === 'url') add(value);
      else if (proseFields.has(field)) linksIn(value);
    } else if (Array.isArray(value)) value.forEach((item) => visit(item, field));
    else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) visit(item, key);
  };
  const source = readFileSync(file, 'utf8');
  // Parse actual links, not API endpoints in sample code. Markdown also preserves method anchors
  // containing parentheses, which the previous whole-file URL regex truncated.
  if (file.endsWith('.md')) linksIn(source); else visit(parseYaml(source));
}
const pages = new Map<string, Promise<{ status: number; body: string | null }>>();
const fetchPage = (url: string) => {
  if (!pages.has(url)) pages.set(url, (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (link check for learn.kiumu.app)', accept: 'text/html,*/*' }, signal: AbortSignal.timeout(20000) });
        const type = response.headers.get('content-type') ?? '';
        const body = type.includes('html') ? await response.text() : null;
        if (response.status >= 500 && attempt === 0) continue;
        return { status: response.status, body };
      } catch { /* retry once */ }
    }
    return { status: 0, body: null };
  })());
  return pages.get(url)!;
};

const problems: string[] = [];
const unreachable: string[] = [];
const blocked: string[] = [];
const queue = [...uses.keys()];
async function worker() {
  for (let url = queue.shift(); url; url = queue.shift()) {
    const [page, anchor] = url.split('#');
    const { status, body } = await fetchPage(page);
    if ([403, 418, 429].includes(status)) { blocked.push(url); continue; }
    if (status === 0) { unreachable.push(url); continue; }
    if (status < 200 || status >= 400) { problems.push(`${status || 'Netzwerkfehler'}  ${url}\n      in ${[...new Set(uses.get(url))].join(', ')}`); continue; }
    if (anchor && body && !/^:~:/.test(anchor)) {
      const escaped = decodeURIComponent(anchor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // GitHub renders README headings with ids prefixed by `user-content-`; the URL leaves the prefix out.
      if (!new RegExp(`(id|name)\\s*=\\s*["']?(?:user-content-)?${escaped}["'\\s>]`).test(body)) problems.push(`Anker fehlt  ${url}\n      in ${[...new Set(uses.get(url))].join(', ')}`);
    }
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
console.log(`${uses.size} URLs geprüft, ${problems.length} Probleme.`);
if (unreachable.length) console.log(`Nicht erreichbar (Zeitüberschreitung, bitte manuell prüfen):\n  ${unreachable.join('\n  ')}`);
if (blocked.length) console.log(`Nicht automatisch prüfbar (HTTP 403/418/429):\n  ${blocked.join('\n  ')}`);
if (problems.length) { console.log(problems.sort().join('\n')); process.exit(1); }
