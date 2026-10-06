import { test, expect, type Page } from '@playwright/test';
import { loadContent } from '../../tooling/content.ts';

// Runs against a production build (playwright.pwa.config.ts). Clerk and Convex are unreachable placeholders.
const python = loadContent(['python']).areas.python;
const [first, second] = Object.values(python.modules);
const copy = { savedAt: Date.parse('2026-09-28T10:15:00Z'), snapshot: {
  entries: [{ areaId: 'python', key: `lesson:${first.id}`, value: { kind: 'lesson', id: first.id, completedAt: '2026-09-28' }, updatedAt: 1 }],
  resets: [],
} };

test.beforeEach(async ({ context }) => {
  // Only this origin exists; the placeholder backends fail immediately instead of waiting for DNS.
  await context.route((url) => url.origin !== 'http://127.0.0.1:5184', (route) => route.abort());
});
async function installed(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test('is installable: manifest, icons and an offline-capable service worker', async ({ page, request }) => {
  await installed(page);
  const manifest = await (await request.get(await page.locator('link[rel="manifest"]').getAttribute('href') ?? '')).json();
  expect(manifest).toMatchObject({ start_url: '/', scope: '/', display: 'standalone', lang: 'de' });
  for (const icon of manifest.icons) expect((await request.get(icon.src)).headers()['content-type']).toBe('image/png');
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
});

test('a browser that was signed in before reads lessons offline with its last synchronized progress', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await installed(page);
  await page.evaluate((value) => localStorage.setItem('learn-offline:snapshot:v1', JSON.stringify(value)), copy);
  await context.setOffline(true);
  await page.goto(`/python/${first.id}`);
  await expect(page.locator('#sync-notice')).toContainText('Offline-Modus');
  await expect(page.locator('#sync-notice')).toContainText('Änderungen werden hier nicht gespeichert');
  await expect(page.locator('#storage-status')).toContainText('Offline · Lernstand vom');
  await expect(page.locator('#sign-out')).toBeHidden();
  await expect(page.locator('h1')).toContainText(first.title);
  await expect(page.locator('#read')).toBeChecked();
  // Content chunks of other areas and pages that were never opened come from the precache.
  await page.locator('.topnav a[data-area="rust"]').click();
  await expect(page.locator('h1')).toHaveText(loadContent(['rust']).catalog.areas[0].title);
  // So is the search index.
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox', { name: 'Lerninhalte durchsuchen' }).fill(second.title);
  await expect(page.getByRole('option').first()).toContainText(second.title);
  await page.keyboard.press('Enter');
  await expect(page.locator('h1')).toHaveText(second.title);
  await page.goto(`/python/${second.id}/1`);
  await expect(page.locator('#exercise-title')).toBeVisible();
  await page.goto('/daten');
  await page.locator('#export').click();
  await expect(page.locator('#data-message')).toContainText('Sicherung konnte nicht geladen werden');
  await expect(page.locator('#reconnect')).toBeVisible();
  expect(errors).toEqual([]);
});

test('offline without an earlier sign-in stays closed', async ({ page, context }) => {
  await installed(page);
  await context.setOffline(true);
  await page.goto('/python');
  await expect(page.locator('.page-title')).toHaveText('Keine Verbindung');
  await expect(page.locator('.topbar')).toHaveCount(0);
  await context.setOffline(false);
  // Reloads on its own; the placeholder sign-in then fails as it would without a connection to Clerk.
  await expect(page.locator('.page-title')).not.toHaveText('Keine Verbindung');
});

test('with an unreachable backend the signed-in browser can switch to offline reading', async ({ page }) => {
  await installed(page);
  await page.evaluate((value) => localStorage.setItem('learn-offline:snapshot:v1', JSON.stringify(value)), copy);
  await page.goto(`/python/${first.id}`);
  // An unreachable Clerk looks like a signed-out browser; that must not delete the offline copy.
  await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible();
  await page.getByRole('button', { name: 'Offline weiterlesen' }).click();
  await expect(page.locator('#sync-notice')).toContainText('Offline-Modus');
  await expect(page.locator('#read')).toBeChecked();
});

test('PostgreSQL is cached on first use and then runs offline', async ({ page, context }) => {
  test.setTimeout(120_000);
  const postgres = Object.values(loadContent(['postgres']).areas.postgres.modules).find((module) => module.lesson.includes('data-run="postgres"'))!;
  await installed(page);
  await page.evaluate((value) => localStorage.setItem('learn-offline:snapshot:v1', JSON.stringify(value)), copy);
  // Not precached: PGlite's runtime (about 16 MB) only loads when PostgreSQL code runs.
  expect(await page.evaluate(async () => (await caches.keys()).some((name) => name.startsWith('learn-pglite-')))).toBe(false);
  await page.goto(`/postgres/${postgres.id}`);
  await page.getByRole('button', { name: 'Offline weiterlesen' }).click();
  const run = async () => {
    const block = page.locator('.codeblock[data-run="postgres"]').first();
    await block.getByRole('button', { name: 'Ausführen' }).click();
    await expect(block.locator('.run-output')).not.toHaveText(/^(Läuft …|PostgreSQL wird geladen)/, { timeout: 90_000 });
    await expect(block.locator('.run-output')).not.toHaveClass(/error/);
  };
  await run();
  await expect.poll(() => page.evaluate(async () => {
    const name = (await caches.keys()).find((key) => key.startsWith('learn-pglite-'));
    return name ? (await (await caches.open(name)).keys()).map((request) => new URL(request.url).pathname.split('/').pop()!.replace(/-[\w-]+\./, '.')).sort() : [];
  })).toEqual(expect.arrayContaining(['initdb.wasm', 'pglite.data', 'pglite.wasm']));
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#sync-notice')).toContainText('Offline-Modus');
  await run();
});
