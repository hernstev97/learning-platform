import { chromium } from '@playwright/test';
// node tooling/screenshots.mjs /pfad[@breite] …  (Dev-Server muss laufen)
const base = process.env.BASE_URL ?? 'http://127.0.0.1:5180';
const pages = process.argv.slice(2);
const browser = await chromium.launch();
for (const spec of pages) {
  const [path, w = '1440'] = spec.split('@');
  const page = await browser.newPage({ viewport: { width: Number(w), height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const name = `/tmp/shot-${path.replace(/\W+/g, '_') || 'home'}-${w}.png`;
  await page.screenshot({ path: name, fullPage: process.env.FULL === '1' });
  console.log(name, errors.length ? 'ERRORS: ' + errors.join(' | ') : 'ok');
  await page.close();
}
await browser.close();
