import { test, expect, type BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api.js';
import { loadContent } from '../../tooling/content.ts';
import { freshProgress } from '../../src/engine/storage.ts';

// Only a disposable, project-local Convex deployment is accepted. Never use a cloud admin key here.
const configPath = process.env.CONVEX_TEST_CONFIG;
if (!configPath) throw new Error('Set CONVEX_TEST_CONFIG to a disposable local deployment config.json (see docs/CONVEX.md).');
const config = JSON.parse(readFileSync(configPath, 'utf8')) as { adminKey: string; ports: { cloud: number } };
const url = `http://127.0.0.1:${config.ports.cloud}`;
const http = new ConvexHttpClient(url);
(http as unknown as { setAdminAuth(key: string, identity: { issuer: string; subject: string }): void }).setAdminAuth(config.adminKey, { issuer: 'https://learning.clerk.accounts.dev', subject: 'user_owner' });
const base = '/kotlin/bear-01';
const second = Object.values(loadContent(['kotlin']).areas.kotlin.modules['bear-01'].exercises)[1].title;
const fixture = async (context: BrowserContext, subject = 'user_owner') => context.addInitScript((value) => { (window as unknown as { __convexTest: unknown }).__convexTest = value; }, { url, adminKey: config.adminKey, subject });
const synced = async (page: import('@playwright/test').Page) => expect(page.locator('#storage-status')).toHaveText('Lernstand synchronisiert');

test.beforeEach(async ({ context }) => {
  const state = await http.query(api.progress.snapshot, {});
  for (const areaId of ['kotlin', 'python', 'beispiel']) await http.mutation(api.progress.resetArea, { areaId, generation: state.resets.find((r) => r.areaId === areaId)?.generation ?? 0 });
  await fixture(context);
});

test('separate devices share lessons, drafts, exercise success and the latest stable location', async ({ page, browser }) => {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } }); await fixture(phone);
  const other = await phone.newPage();
  await page.goto(base); await page.locator('#read').check(); await synced(page);
  await other.goto(base); await expect(other.locator('#read')).toBeChecked();
  await other.locator('#read').uncheck(); await synced(other); await expect(page.locator('#read')).not.toBeChecked();
  await page.goto(`${base}/1`); await page.locator('#answer-g1').fill('val'); await synced(page);
  await other.goto(`${base}/1`); await expect(other.locator('#feedback')).toContainText('Richtig.');
  await page.goto(`${base}/2`); await page.locator('#answer-g1').fill('"Be'); await synced(page);
  await other.goto('/'); await expect(other.getByRole('link', { name: 'Weiterlernen' })).toHaveAttribute('href', `${base}/2`);
  await other.getByRole('link', { name: 'Weiterlernen' }).click(); await expect(other.locator('#answer-g1')).toHaveValue('"Be');
  await phone.close();
});

test('continue learning on another device skips solved work and ignores card reviews', async ({ page, browser }) => {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } }); await fixture(phone);
  const other = await phone.newPage();
  await page.goto(`${base}/1`); await page.locator('#answer-g1').fill('val'); await synced(page);
  await page.goto('/kotlin/karten'); await synced(page);
  await other.goto('/');
  const resume = other.locator('.resume');
  await expect(resume).toContainText('Übung 2 von'); await expect(resume).toContainText('1 / ');
  await expect(resume).toContainText('schon erledigt');
  await expect(resume.getByRole('link', { name: 'Weiterlernen' })).toHaveAttribute('href', `${base}/2`);
  await phone.close();
});

test('project steps and cards react across devices without restarting active training', async ({ page, browser }) => {
  const phone = await browser.newContext(); await fixture(phone); const other = await phone.newPage();
  const project = loadContent(['kotlin']).catalog.areas[0].projects[0].id;
  await page.goto(`/kotlin/projekte/${project}`); await other.goto(`/kotlin/projekte/${project}`);
  await page.locator('[data-key]').first().check(); await synced(page);
  await expect(other.locator('[data-key]').first()).toBeChecked();
  await other.locator('[data-key]').nth(1).check(); await synced(other);
  await expect(page.locator('#project-count')).toContainText('2/');
  await page.goto('/kotlin/karten'); await page.locator('#start').click(); await page.locator('#show').click(); await page.locator('#good').click(); await synced(page);
  await expect(page.locator('.flashcard-meta')).toContainText('Karte 2');
  await other.goto('/kotlin/karten'); await expect(other.locator('.card-item .tag', { hasText: 'Box 1' })).toHaveCount(1);
  await phone.close();
});

test('temporary disconnect queues writes and reconnects using the Convex client', async ({ page, context }) => {
  await page.goto(base); await synced(page);
  await context.setOffline(true);
  await page.locator('#read').check(); await expect(page.locator('#read')).toBeChecked();
  await expect(page.locator('#storage-status')).toContainText('wird gespeichert');
  await context.setOffline(false); await synced(page);
  await page.reload(); await expect(page.locator('#read')).toBeChecked();
});

test('backup import preserves existing values, remains repeatable, exports drafts and survives reload', async ({ page }) => {
  const p = freshProgress(); const first = loadContent(['kotlin']).areas.kotlin.modules['bear-01'].exercises[0];
  p.done[first.id] = { at: '2026-09-28', fp: first.fingerprint }; p.drafts[first.id] = { g1: 'val' };
  const backup = { app: 'learn.kiumu.app', exported: '2026-09-28', areas: { kotlin: p } };
  await page.goto('/daten');
  for (let i = 0; i < 2; i++) {
    await page.locator('#import-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await expect(page.locator('#data-message')).toContainText('übernommen');
  }
  const download = page.waitForEvent('download'); await page.locator('#export').click();
  const stream = await (await download).createReadStream(); const chunks: Buffer[] = [];
  for await (const part of stream!) chunks.push(Buffer.from(part));
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(exported.areas.kotlin.drafts[first.id]).toEqual({ g1: 'val' });
  expect(exported.areas.kotlin.draftFingerprints[first.id]).toBe(first.fingerprint);
  await page.goto(`${base}/1`); await expect(page.locator('#feedback')).toContainText('Richtig.');
});

test('wrong account cannot load the app state even through an authenticated connection', async ({ browser }) => {
  const context = await browser.newContext(); await fixture(context, 'user_intruder'); const page = await context.newPage();
  await page.goto('/'); await expect(page.locator('#app')).toHaveText('Kein Zugriff');
  await expect(page.locator('.area-block')).toHaveCount(0); await context.close();
});

test('a legacy browser import is opt-in, durable and leaves its source untouched', async ({ page }) => {
  const areaId = `legacy-${Date.now()}`;
  const p = freshProgress(); p.read.intro = '2026-09-28';
  const raw = JSON.stringify(p);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key: `learn:${areaId}:v1`, raw });
  await page.goto('/daten'); await expect(page.locator('#import-local')).toBeEnabled();
  expect((await http.query(api.progress.snapshot, {})).entries.some((e) => e.areaId === areaId)).toBe(false);
  await page.locator('#import-local').click(); await expect(page.locator('#data-message')).toContainText('Lokaler Lernstand übernommen');
  expect((await http.query(api.progress.snapshot, {})).entries.some((e) => e.areaId === areaId && e.key === 'lesson:intro')).toBe(true);
  expect(await page.evaluate((key) => localStorage.getItem(key), `learn:${areaId}:v1`)).toBe(raw);
  await page.reload(); await expect(page.locator('#import-local')).toBeDisabled();
});

test('Convex itself rejects missing authentication and an unsigned owner JWT', async () => {
  const client = new ConvexHttpClient(url, { logger: false });
  await expect(client.query(api.progress.snapshot, {})).rejects.toThrow();
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  client.setAuth(`${encode({ alg: 'none', typ: 'JWT' })}.${encode({ iss: 'https://learning.clerk.accounts.dev', sub: 'user_owner', aud: 'convex', exp: Math.floor(Date.now() / 1000) + 600 })}.`);
  await expect(client.query(api.progress.snapshot, {})).rejects.toThrow();
});

test('blocked legacy storage does not interrupt cloud progress or the data page', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await page.goto(base); await page.locator('#read').check(); await synced(page);
  await page.goto('/daten');
  await expect(page.getByRole('heading', { name: 'Deine Daten' })).toBeVisible();
  await expect(page.getByText('Der lokale Browserspeicher ist gesperrt.', { exact: false })).toBeVisible();
  await page.goto(base); await expect(page.locator('#read')).toBeChecked();
});

test('concurrent direct writes stay unique and card reviews use transactional server state', async () => {
  const areaId = 'kotlin';
  const state = await http.query(api.progress.snapshot, {});
  const generation = state.resets.find((r) => r.areaId === areaId)?.generation ?? 0;
  await Promise.all(Array.from({ length: 8 }, () => http.mutation(api.progress.set, {
    areaId, generation, changes: [{ kind: 'lesson', id: 'bear-01', completedAt: '2026-09-28' }],
  })));
  await Promise.all(Array.from({ length: 8 }, () => http.mutation(api.progress.reviewCard, {
    areaId, generation, cardId: 'concurrent', grade: 'good', today: '2026-09-28',
  })));
  const final = await http.query(api.progress.snapshot, {});
  expect(final.entries.filter((e) => e.areaId === areaId && e.key === 'lesson:bear-01')).toHaveLength(1);
  expect(final.entries.find((e) => e.areaId === areaId && e.key === 'card:concurrent')?.value).toMatchObject({ value: { seen: 8, box: 5 } });
});

test('a lasting outage is announced; exercises open without a connection and typed drafts sync afterwards', async ({ page, context, browser }) => {
  await page.goto(`${base}/1`); await synced(page);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('learn-offline:snapshot:v1'))).not.toBeNull();
  await context.setOffline(true);
  await page.locator('.step').nth(1).click(); await expect(page.locator('#exercise-title')).toHaveText(second);
  await page.locator('#answer-g1').fill('"Be');
  // The draft and the new learning position wait for the connection.
  await expect(page.locator('#sync-notice')).toContainText('2 Änderungen sind noch nicht synchronisiert');
  await expect(page.locator('#storage-status')).toHaveText('Offline · 2 Änderungen nicht synchronisiert');
  await context.setOffline(false); await synced(page);
  await expect(page.locator('#sync-notice')).toBeHidden();
  const phone = await browser.newContext(); await fixture(phone); const other = await phone.newPage();
  await other.goto(`${base}/2`); await expect(other.locator('#answer-g1')).toHaveValue('"Be');
  await phone.close();
});

test('a draft typed offline does not silently replace a different draft saved on another device', async ({ page, context, browser }) => {
  const phone = await browser.newContext(); await fixture(phone); const other = await phone.newPage();
  await other.goto(`${base}/2`); await other.locator('#answer-g1').fill('"Bo'); await synced(other);
  await page.goto(`${base}/1`); await synced(page);
  await context.setOffline(true);
  await page.locator('.step').nth(1).click(); await expect(page.locator('#exercise-title')).toHaveText(second);
  await page.locator('#answer-g1').fill('"Be');
  await context.setOffline(false); await synced(page);
  await page.getByRole('button', { name: 'Geänderter Entwurf verfügbar · Laden' }).click();
  await expect(page.locator('#answer-g1')).toHaveValue('"Bo');
  await other.reload(); await expect(other.locator('#answer-g1')).toHaveValue('"Bo');
  await phone.close();
});
