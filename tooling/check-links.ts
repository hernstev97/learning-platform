// pnpm links [bereich ...]
// Checks every external URL in content/ (lessons, exercises, resources, pages). Anchors (#…) are
// checked too where the page is HTML: the id or name must exist in the document.
import { appendFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Marked } from 'marked';
import { parse as parseYaml } from 'yaml';
import { CONTENT, ROOT } from './content.ts';

const configuredDelay = Number(process.env.LINKS_RETRY_DELAY_MS);
const RETRY_DELAY = Number.isFinite(configuredDelay) && configuredDelay >= 0 && process.env.LINKS_RETRY_DELAY_MS ? configuredDelay : 60_000;
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

const problems = new Map<string, string>();
const unreachable = new Set<string>();
const blocked = new Set<string>();
async function check(url: string) {
  const [page, anchor] = url.split('#');
  const { status, body } = await fetchPage(page);
  if ([403, 418, 429].includes(status)) { blocked.add(url); return; }
  if (status === 0) { unreachable.add(url); return; }
  blocked.delete(url); unreachable.delete(url);
  const where = `\n      in ${[...new Set(uses.get(url))].join(', ')}`;
  if (status < 200 || status >= 400) { problems.set(url, `${status || 'Netzwerkfehler'}  ${url}${where}`); return; }
  if (anchor && body && !/^:~:/.test(anchor)) {
    const escaped = decodeURIComponent(anchor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // GitHub renders README headings with ids prefixed by `user-content-`; the URL leaves the prefix out.
    const prefix = new URL(page).hostname === 'github.com' ? '(?:user-content-)?' : '';
    if (!new RegExp(`(id|name)\\s*=\\s*["']?${prefix}${escaped}["'\\s>]`).test(body)) problems.set(url, `Anker fehlt  ${url}${where}`);
  }
}
async function run(urls: string[]) {
  const queue = [...urls];
  await Promise.all(Array.from({ length: 12 }, async () => { for (let url = queue.shift(); url; url = queue.shift()) await check(url); }));
}
await run([...uses.keys()]);
// Foreign sites have bad minutes. Only what is still broken after a pause counts as broken.
if (problems.size) {
  const again = [...problems.keys()];
  console.log(`${again.length} Probleme im ersten Durchgang, zweiter Durchgang in ${RETRY_DELAY / 1000} s …`);
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
  for (const url of again) { problems.delete(url); pages.delete(url.split('#')[0]); }
  await run(again);
}
console.log(`${uses.size} URLs geprüft, ${problems.size} Probleme.`);
const notes = [
  unreachable.size && `Nicht erreichbar (Zeitüberschreitung, bitte manuell prüfen):\n  ${[...unreachable].join('\n  ')}`,
  blocked.size && `Nicht automatisch prüfbar (HTTP 403/418/429):\n  ${[...blocked].join('\n  ')}`,
].filter(Boolean) as string[];
if (notes.length) console.log(notes.join('\n'));
// In GitHub Actions the same text goes to the run summary, so "not checkable" stays visible on green runs.
if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = [`### Linkcheck: ${uses.size} URLs, ${problems.size} Probleme`, ...notes.map((n) => `<details><summary>${n.split('\n')[0]}</summary>\n\n\`\`\`\n${n.split('\n').slice(1).join('\n')}\n\`\`\`\n</details>`)];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary.join('\n\n')}\n`);
}
if (problems.size) { console.log([...problems.values()].sort().join('\n')); process.exit(1); }
