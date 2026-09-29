import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
// node tooling/icons.mjs – renders the app icons in public/icons/ from the favicon design with the site font.
const font = readFileSync(new URL('../public/fonts/jetbrains-mono-extrabold.woff2', import.meta.url)).toString('base64');
// Maskable icons are cropped to a circle by some launchers; the glyph then has to stay inside the inner 80 %.
const icons = [['icon-192.png', 192, 0.69], ['icon-512.png', 512, 0.69], ['icon-maskable-512.png', 512, 0.5], ['apple-touch-icon.png', 180, 0.62]];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, scale] of icons) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>@font-face{font-family:M;src:url(data:font/woff2;base64,${font})}html,body{margin:0}
    div{width:${size}px;height:${size}px;background:#0b0b0b;color:#ff4f00;font:800 ${Math.round(size * scale)}px/1 M;display:grid;place-items:center}</style><div>L</div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/icons/${name}` });
}
await browser.close();
