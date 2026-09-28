import { test, expect } from '@playwright/test';
import { sourceFiles, tasks } from '../src/curriculum';
import { solution } from '../src/validation';
import { LEGACY_KEY, STORAGE_KEY } from '../src/storage';

test('immediate checking, skip, saved draft, completion and reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('main article')).toHaveCount(1);
  await expect(page.locator('.progress-step')).toHaveCount(100);
  await page.locator('#answer-g1').fill('var');
  await expect(page.locator('#state-g1')).toHaveText('Noch nicht richtig');
  await expect(page.locator('.progress-step.done')).toHaveCount(0);
  await page.locator('#answer-g1').fill('val');
  await expect(page.locator('#feedback')).toContainText('Richtig.');
  await page.locator('#next').click();
  await page.locator('#answer-g1').fill('"Be');
  await page.getByRole('button', { name: 'Überspringen', exact: true }).click();
  await page.locator('[data-task="bear-002"]').click();
  await expect(page.locator('#answer-g1')).toHaveValue('"Be');
  await page.reload();
  await expect(page.locator('#answer-g1')).toHaveValue('"Be');
  await expect(page.locator('#progress-count')).toHaveText('1 von 100 erledigt');
  await page.locator('[data-task="bear-001"]').click();
  await page.locator('#answer-g1').fill('wrong');
  await page.reload();
  await expect(page.locator('#feedback')).toContainText('Dein bisheriger Erfolg bleibt gespeichert.');
  await expect(page.locator('[data-task="bear-001"]')).toHaveClass(/done/);
  expect(errors).toEqual([]);
});

test('wiki resets after success, skip, progress click and chapter selection', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#wiki')).not.toHaveAttribute('open', '');
  await page.locator('#wiki summary').click();
  await expect(page.locator('.wiki-content')).toBeVisible();
  await page.locator('#answer-g1').fill('val');
  // Typing a correct answer must not close a wiki the learner is currently reading.
  await expect(page.locator('.wiki-content')).toBeVisible();
  await page.getByRole('button', { name: 'Nächste Aufgabe', exact: true }).click();
  await expect(page.locator('.wiki-content')).toBeHidden();
  await page.locator('#wiki summary').click();
  await page.locator('#next').click();
  await expect(page.locator('.wiki-content')).toBeHidden();
  await page.locator('#wiki summary').click();
  await page.locator('[data-task="bear-099"]').click();
  await expect(page.locator('.wiki-content')).toBeHidden();
  await page.locator('#wiki summary').click();
  await page.getByLabel('Kapitel auswählen').selectOption('0');
  await expect(page.locator('.wiki-content')).toBeHidden();
});

test('multiple gaps save independently; all are required for task completion', async ({ page }) => {
  const task = tasks[99];
  await page.goto('/');
  await page.locator('[data-task="bear-100"]').click();
  await page.locator('#answer-g1').fill(task.gaps[0].answers[0]);
  await page.locator('#answer-g2').fill('norm');
  await expect(page.locator('#feedback')).toContainText('1 von 7 Lücken richtig');
  await expect(page.locator('.progress-step.done')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#answer-g1')).toHaveValue(task.gaps[0].answers[0]);
  await expect(page.locator('#answer-g2')).toHaveValue('norm');
  for (const gap of task.gaps.slice(1)) await page.locator(`#answer-${gap.id}`).fill(gap.answers[0]);
  await expect(page.locator('[data-task="bear-100"]')).toHaveClass(/done/);
  await expect(page.locator('#feedback')).toContainText('Alle Lücken gelöst.');
  await page.locator('#answer-g7').fill('wrong');
  await expect(page.locator('[data-task="bear-100"]')).toHaveClass(/done/);
  await expect(page.locator('#state-g7')).toHaveText('Noch nicht richtig');
});

test('all 100 tasks and 235 gaps are solvable through the UI', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/');
  for (const [index, task] of tasks.entries()) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(task.title);
    await expect(page.locator('main article')).toHaveCount(1);
    await expect(page.locator('.wiki-content')).toBeHidden();
    await expect(page.locator('.resources a')).toHaveCount(task.resources.length);
    await expect(page.locator('.resources a').first()).toBeVisible();
    for (const gap of task.gaps) await page.locator(`#answer-${gap.id}`).fill(gap.answers[0]);
    await expect(page.locator('#feedback')).toContainText('Richtig.');
    await expect(page.locator('#progress-count')).toHaveText(`${index + 1} von 100 erledigt`);
    if (index < 99) await page.locator('#next').click();
  }
  await expect(page.locator('#completion-message')).toContainText('Alle 100 Bear-Aufgaben geschafft.');
  await page.reload();
  await expect(page.locator('.progress-step.done')).toHaveCount(100);
  await page.getByRole('button', { name: 'Von vorne wiederholen' }).click();
  await expect(page.locator('#answer-g1')).toHaveValue('val');
});

test('source dialog shows the actual file and highlighted lines', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-task="bear-095"]').click();
  await page.locator('#open-source').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const task = tasks[94];
  await expect(page.locator('.source-line.selected')).toHaveCount(task.source.end - task.source.start + 1);
  await expect(page.locator('#source-meta')).toContainText(task.source.file);
  const text = await page.locator('#source-code').innerText();
  expect(text).toContain('fun nextRoundAt(');
  expect(sourceFiles[task.source.file]).toContain('fun nextRoundAt(');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#open-source')).toBeFocused();
});

test('keyboard navigation, gap jump, hints and last-task skip', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-task="bear-001"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-task="bear-002"]')).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.locator('#task-title')).toHaveText(tasks[99].title);
  await page.locator('[data-gap-link="g7"]').click();
  await expect(page.locator('#answer-g7')).toBeFocused();
  await page.locator('.gap-hint summary').last().click();
  await expect(page.locator('.gap-hint p').last()).toBeVisible();
  await page.locator('#next').click();
  await expect(page.locator('#task-title')).toHaveText(tasks[0].title);
});

test('old course data remains untouched when the Bear course is saved', async ({ page }) => {
  await page.goto('/');
  const old = '{"version":1,"drafts":{"val":"va"}}';
  await page.evaluate(({key,old}) => localStorage.setItem(key, old), { key: LEGACY_KEY, old });
  await page.reload();
  await expect(page.locator('.legacy-note')).toBeVisible();
  await page.locator('#answer-g1').fill('val');
  expect(await page.evaluate((key) => localStorage.getItem(key), LEGACY_KEY)).toBe(old);
});

test('corrupt storage, untrusted draft text and disabled storage remain safe', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate((key) => localStorage.setItem(key, '{invalid'), STORAGE_KEY);
  await page.reload();
  await expect(page.locator('#storage-warning')).toBeVisible();
  await page.locator('#answer-g1').fill('</textarea><img src=x onerror=alert(1)>');
  await page.reload();
  await expect(page.locator('#answer-g1')).toHaveValue('</textarea><img src=x onerror=alert(1)>');
  await expect(page.locator('main img')).toHaveCount(0);
  await expect(page.locator('#storage-warning')).toBeHidden();
  const blocked = await context.newPage();
  await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await blocked.goto('/');
  await blocked.locator('#answer-g1').fill('val');
  await expect(blocked.locator('#feedback')).toContainText('Richtig.');
  await expect(blocked.locator('#storage-status')).toHaveText('Nicht gespeichert');
});

test('even the only unfinished final task can be skipped', async ({ page }) => {
  await page.goto('/');
  const completed = Object.fromEntries(tasks.slice(0, -1).map((task) => [task.id, { answers: solution(task), at: '2026-09-27', fingerprint: task.fingerprint }]));
  await page.evaluate(({ key, completed }) => localStorage.setItem(key, JSON.stringify({ version: 2, drafts: {}, activeId: 'bear-100', completed })), { key: STORAGE_KEY, completed });
  await page.reload();
  await page.locator('#next').click();
  await expect(page.locator('#task-title')).toHaveText(tasks[0].title);
  await expect(page.locator('#progress-count')).toHaveText('99 von 100 erledigt');
});

test('mobile curriculum and long source files do not overflow the page', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  for (const task of tasks) {
    await page.locator(`[data-task="${task.id}"]`).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('#open-source').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('assets including Bear sources stay on the same origin', async ({ page, baseURL }) => {
  const external: string[] = [];
  const origin = new URL(baseURL!).origin;
  page.on('request', (request) => { if (new URL(request.url()).origin !== origin) external.push(request.url()); });
  await page.goto('/');
  await page.locator('#open-source').click();
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);
});
