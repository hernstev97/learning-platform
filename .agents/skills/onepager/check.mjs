#!/usr/bin/env node
// Checks a onepager before upload: Postplan's upload policy, what its serving CSP silently breaks,
// and whether both contents lists match the numbered sections.
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node check.mjs <file.html>');
  process.exit(2);
}
const html = readFileSync(file, 'utf8');
const errors = [];
const warnings = [];

const bytes = Buffer.byteLength(html, 'utf8');
if (bytes > 512 * 1024) errors.push(`${bytes} bytes; Postplan accepts at most 524288.`);
else if (bytes > 400 * 1024) warnings.push(`${bytes} bytes; close to Postplan's 512 KB limit.`);

// Rejected by the upload.
for (const tag of ['form', 'iframe', 'object', 'embed', 'applet', 'base', 'link']) {
  if (new RegExp(`<${tag}[\\s>/]`, 'i').test(html)) errors.push(`<${tag}> is rejected by Postplan.`);
}
const handler = html.match(/<[a-z][^>]*\son[a-z]+\s*=/i);
if (handler) errors.push(`Inline event handler: ${handler[0].slice(0, 80)}`);
if (/(href|src|action)\s*=\s*["']?\s*(javascript|vbscript|file):/i.test(html)) errors.push('javascript:, vbscript: or file: URL.');
if (/http-equiv\s*=\s*["']?refresh/i.test(html)) errors.push('Meta refresh is rejected by Postplan.');

// Accepted by the upload but dead in the browser (script-src 'none', no font-src, img-src https: data: only).
if (/<script[\s>]/i.test(html)) errors.push('<script> never runs on Postplan. Replace the interaction with HTML and CSS.');
if (/@font-face/i.test(html)) errors.push('@font-face never loads on Postplan. Keep the system font stack.');
if (/<img[^>]+src\s*=\s*["']http:/i.test(html)) errors.push('http: image; only https: and data: images load.');
if (/url\(\s*["']?https?:/i.test(html)) errors.push('CSS url() to the network; only data: URLs load.');

// Leaks.
if (/data-template[\s>=]/.test(html)) errors.push('data-template is still on <body>. Replace the showcase content, then remove the attribute.');
const local = html.match(/(?:\/home\/|\/Users\/|[A-Z]:\\Users\\|file:\/\/)[^\s"'<]*/);
if (local) errors.push(`Local path: ${local[0]}`);
const secret = html.match(/\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})/);
if (secret) errors.push(`Looks like a secret: ${secret[0].slice(0, 12)}…`);
if (/\b(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(html)) warnings.push('localhost URL; nobody else can open it.');

// Document basics.
if (!/<html[^>]*\slang=/i.test(html)) errors.push('<html> has no lang attribute.');
const title = html.match(/<title>([^<]*)<\/title>/i)?.[1].trim();
if (!title) errors.push('No <title>.');

// IDs and contents lists.
const ids = [...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
const seen = new Set();
for (const id of ids) {
  if (seen.has(id)) errors.push(`Duplicate id "${id}".`);
  seen.add(id);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) warnings.push(`id "${id}" is not lowercase kebab-case.`);
}
const hrefsIn = (block) => [...(block ?? '').matchAll(/href\s*=\s*["']#([^"']+)["']/g)].map((m) => m[1]);
const toc = hrefsIn(html.match(/<nav class="toc"[\s\S]*?<\/nav>/)?.[0]);
const tocMobile = hrefsIn(html.match(/<details class="toc-mobile"[\s\S]*?<\/details>/)?.[0]);
const sections = [...html.matchAll(/<section class="doc-section" id="([^"]+)"/g)].map((m) => m[1]);
if (!toc.length) errors.push('No <nav class="toc"> with links.');
if (!tocMobile.length) errors.push('No <details class="toc-mobile"> with links.');
if (!sections.length) errors.push('No <section class="doc-section" id="…">.');
if (toc.join() !== sections.join()) errors.push(`Sidebar contents [${toc}] do not match the sections [${sections}].`);
if (tocMobile.join() !== sections.join()) errors.push(`Mobile contents [${tocMobile}] do not match the sections [${sections}].`);
for (const target of hrefsIn(html)) {
  if (!seen.has(target)) errors.push(`Link to #${target}, but no element has that id.`);
}
for (const name of new Set([...html.matchAll(/popovertarget\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]))) {
  if (!seen.has(name)) errors.push(`popovertarget="${name}" has no matching id.`);
}

for (const w of warnings) console.log(`warn   ${w}`);
for (const e of errors) console.log(`error  ${e}`);
console.log(errors.length ? `${errors.length} error(s) in ${file}` : `ok     ${title} · ${sections.length} sections · ${(bytes / 1024).toFixed(0)} KB`);
process.exit(errors.length ? 1 : 0);
