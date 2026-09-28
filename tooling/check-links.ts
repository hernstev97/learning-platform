// pnpm links [bereich ...]
// Checks every external URL in content/ (lessons, exercises, resources, pages). Anchors (#…) are
// checked too where the page is HTML: the id or name must exist in the document.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
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
for (const file of files) {
  for (const match of readFileSync(file, 'utf8').matchAll(/https:\/\/[^\s)"'<>`\]]+/g)) {
    const url = match[0].replace(/[.,;:]+$/, '');
    if (url.includes("${") || /^https:\/\/([\w-]+\.)*example\.(com|org|net)\b|^https:\/\/(localhost|127\.0\.0\.1)/.test(url)) continue; // placeholders in examples
    uses.set(url, [...(uses.get(url) ?? []), relative(ROOT, file)]);
  }
}
const pages = new Map<string, Promise<{ status: number; body: string | null }>>();
const fetchPage = (url: string) => {
  if (!pages.has(url)) pages.set(url, (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (link check for learn.kiumu.app)', accept: 'text/html,*/*' }, signal: AbortSignal.timeout(20000) });
        const type = response.headers.get('content-type') ?? '';
        return { status: response.status, body: type.includes('html') ? await response.text() : null };
      } catch { /* retry once */ }
    }
    return { status: 0, body: null };
  })());
  return pages.get(url)!;
};

const problems: string[] = [];
const unreachable: string[] = [];
const queue = [...uses.keys()];
async function worker() {
  for (let url = queue.shift(); url; url = queue.shift()) {
    const [page, anchor] = url.split('#');
    const { status, body } = await fetchPage(page);
    if ([403, 418, 429].includes(status)) continue; // bot protection – not a broken link
    if (status === 0) { unreachable.push(url); continue; }
    if (status < 200 || status >= 400) { problems.push(`${status || 'Netzwerkfehler'}  ${url}\n      in ${[...new Set(uses.get(url))].join(', ')}`); continue; }
    if (anchor && body && !/^:~:/.test(anchor)) {
      const escaped = decodeURIComponent(anchor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`(id|name)=["']?${escaped}["'\\s>]`).test(body)) problems.push(`Anker fehlt  ${url}\n      in ${[...new Set(uses.get(url))].join(', ')}`);
    }
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
console.log(`${uses.size} URLs geprüft, ${problems.length} Probleme.`);
if (unreachable.length) console.log(`Nicht erreichbar (Zeitüberschreitung, bitte manuell prüfen):\n  ${unreachable.join('\n  ')}`);
if (problems.length) { console.log(problems.sort().join('\n')); process.exit(1); }
