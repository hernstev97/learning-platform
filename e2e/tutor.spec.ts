import { test, expect, type Page } from '@playwright/test';
import type { TutorReply, TutorRequest, TutorStatus } from '../src/engine/tutor.ts';

// The tutor panel (LRN-6) against a fake provider in the local test app: no Convex, no key, no network request.
// window.__tutorFake stands in for the tutor's Convex functions (src/testing/local-app.ts).
const base = '/beispiel/alle-typen';
const errorsOf = (page: Page) => { const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message)); return errors; };
type Fake = { status: TutorStatus | null; replies: TutorReply[]; requests: TutorRequest[] };
const enabled = (overrides: Partial<Extract<TutorStatus, { enabled: true }>> = {}): TutorStatus => ({ enabled: true, month: '2026-10', model: 'claude-sonnet-5-5', spentMicros: 1_230_000, budgetMicros: 5_000_000, requests: 87, warn: false, exhausted: false, ...overrides });
async function fake(page: Page, status: TutorStatus | null, replies: TutorReply[] = []) {
  await page.addInitScript(({ status, replies }) => {
    const value: Fake & { reply(request: TutorRequest): TutorReply } = {
      status, replies, requests: [],
      reply(request) { this.requests.push(request); return this.replies.shift() ?? { ok: true, text: 'Schau dir an, womit Python eine Funktion einleitet.', retried: false }; },
    };
    (window as unknown as { __tutorFake: typeof value }).__tutorFake = value;
  }, { status, replies });
}
const requests = (page: Page) => page.evaluate(() => (window as unknown as { __tutorFake: Fake }).__tutorFake.requests);

test('without a configured tutor nothing changes', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto(`${base}/2`);
  await expect(page.locator('#hint')).toBeVisible();
  await expect(page.locator('#tutor')).toBeHidden();
  await page.goto('/daten');
  await expect(page.locator('#tutor-usage')).toBeHidden();
  expect(errors).toEqual([]);
});

test('gives the three levels in turn, links the lesson section and sends only learning content', async ({ page }) => {
  const errors = errorsOf(page);
  await fake(page, enabled(), [
    { ok: true, text: 'Mit welchem **Schlüsselwort** beginnt in Python eine Funktion?', retried: false },
    { ok: true, text: 'Es geht um Funktionsdefinitionen, siehe Abschnitt „Einstieg“ der Lektion.', retried: false },
    { ok: true, text: 'In Lücke 1 steht `fun`, das ist kein Python.', retried: true },
  ]);
  await page.goto(`${base}/1`);
  const tutor = page.locator('#tutor');
  await expect(tutor).toBeVisible();
  await expect(tutor).toContainText('Geht an Anthropic');
  await page.locator('#answer-g1').fill('fun');
  await page.locator('#answer-g2').fill('x + x');
  await expect(page.locator('#tutor-ask')).toHaveText('Tutor fragen · Stufe 1: Denkanstoß');
  await page.locator('#tutor-ask').click();
  await expect(page.locator('#tutor-answers li').first()).toContainText('Stufe 1 · Denkanstoß');
  await expect(page.locator('#tutor-answers li strong')).toHaveText('Schlüsselwort');
  await page.locator('#tutor-question').fill('Ist es `fn`?');
  await page.locator('#tutor-ask').click();
  await expect(page.locator('#tutor-answers li').nth(1).getByRole('link', { name: 'Einstieg' })).toHaveAttribute('href', `${base}#einstieg`);
  await page.locator('#tutor-ask').click();
  await expect(page.locator('#tutor-answers li')).toHaveCount(3);
  await expect(page.locator('#tutor-answers li').nth(2).locator('code')).toHaveText('fun');
  await expect(page.locator('#tutor-ask')).toHaveText('Tutor fragen · Stufe 3: Fehlerstelle');
  const sent = await requests(page);
  expect(sent.map((r) => r.level)).toEqual([1, 2, 3]);
  expect(sent[1]).toMatchObject({ areaId: 'beispiel', kind: 'gap', done: false, question: 'Ist es `fn`?', previous: ['Mit welchem **Schlüsselwort** beginnt in Python eine Funktion?'] });
  expect(sent[2].previous).toHaveLength(2);
  expect(sent[0].attempt).toContain('g1: `fun`');
  expect(sent[0].lesson.title).toBe('Alle Übungsarten');
  expect(JSON.stringify(sent)).not.toContain('alle-typen/lueckentext');
  expect(errors).toEqual([]);
});

test('falls back to the next static hint when the tutor would give the solution away', async ({ page }) => {
  await fake(page, enabled(), [{ ok: false, reason: 'leak' }, { ok: false, reason: 'leak' }]);
  await page.goto(`${base}/2`);
  await page.locator('#tutor-ask').click();
  await expect(page.locator('#tutor-state')).toHaveText('Der Tutor hat keinen Hinweis ohne die Lösung gefunden. Oben steht stattdessen der nächste Hinweis der Übung.');
  await expect(page.locator('#hint-list li')).toHaveCount(1);
  await expect(page.locator('#tutor-ask')).toHaveText('Tutor fragen · Stufe 1: Denkanstoß');
  await page.locator('#tutor-ask').click();
  await expect(page.locator('#tutor-state')).toHaveText('Der Tutor hat keinen Hinweis ohne die Lösung gefunden. Nutze die Hinweise oder „Lösung zeigen“.');
});

test('warns at 80 % of the budget and pauses when it is used up', async ({ page }) => {
  await fake(page, enabled({ spentMicros: 4_100_000, warn: true }));
  await page.goto(`${base}/1`);
  await expect(page.locator('#tutor-budget')).toHaveText('4,10 $ von 5,00 $ Monatsbudget verbraucht.');
  await expect(page.locator('#tutor-form')).toBeVisible();
  await fake(page, enabled({ spentMicros: 4_995_000, warn: true, exhausted: true }));
  await page.reload();
  await expect(page.locator('#tutor-budget')).toContainText('Pausiert bis zum 1. November');
  await expect(page.locator('#tutor-form')).toBeHidden();
});

test('disappears offline and comes back online', async ({ page, context }) => {
  await fake(page, enabled());
  await page.goto(`${base}/1`);
  await expect(page.locator('#tutor')).toBeVisible();
  await context.setOffline(true);
  await expect(page.locator('#tutor')).toBeHidden();
  await context.setOffline(false);
  await expect(page.locator('#tutor')).toBeVisible();
});

test('answers questions freely once the solution is shown', async ({ page }) => {
  await fake(page, enabled(), [{ ok: true, text: '`x * 2` und `2 * x` sind gleichwertig.', retried: false }]);
  await page.goto(`${base}/1`);
  await page.locator('#reveal').click();
  await expect(page.locator('#tutor-ask')).toHaveText('Fragen');
  await page.locator('#tutor-ask').click();
  await expect(page.locator('#tutor-state')).toHaveText('Schreib zuerst deine Frage.');
  await page.locator('#tutor-question').fill('Geht auch 2 * x?');
  await page.locator('#tutor-ask').click();
  await expect(page.locator('#tutor-answers li').first()).toContainText('Antwort');
  expect((await requests(page))[0]).toMatchObject({ done: true, question: 'Geht auch 2 * x?' });
});

test('offers no tutor for own texts and keeps analysis exercises', async ({ page }) => {
  await fake(page, enabled());
  await page.goto('/beispiel/texte/6');
  await expect(page.locator('#exercise-title')).toHaveText('Drei eigene Sätze');
  await expect(page.locator('#tutor')).toBeHidden();
  await page.goto('/beispiel/texte/5');
  await expect(page.locator('#tutor')).toBeVisible();
});

test('shows the month’s usage on the data page', async ({ page }) => {
  await fake(page, enabled());
  await page.goto('/daten');
  await expect(page.locator('#tutor-usage-text')).toHaveText('Oktober 2026: 1,23 $ von 5,00 $ verbraucht, 87 Anfragen (claude-sonnet-5-5).');
});
