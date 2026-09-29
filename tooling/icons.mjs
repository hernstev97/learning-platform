import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
// node tooling/icons.mjs – renders the PNG app icons in public/icons/ from public/icons/learnkiumu-logo.svg.
// The logo fills the whole square, so the 512 px icon also serves as maskable icon.
const logo = readFileSync(new URL('../public/icons/learnkiumu-logo.svg', import.meta.url), 'utf8');
const icons = [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size] of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${logo}`);
  await page.screenshot({ path: `public/icons/${name}` });
}
await browser.close();
