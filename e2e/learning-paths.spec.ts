import { test, expect, type Page } from '@playwright/test';
import { loadContent } from '../tooling/content.ts';
import type { Exercise } from '../src/content/types.ts';
import { gapSolution } from '../src/engine/answers.ts';

const loaded = loadContent();

async function solve(page: Page, exercise: Exercise) {
  switch (exercise.type) {
    case 'gap':
      for (const [id, value] of Object.entries(gapSolution(exercise))) await page.locator(`#answer-${id}`).fill(value);
      break;
    case 'choice':
      for (const [i, option] of exercise.options.entries()) if (option.correct) await page.locator(`[data-option="${i}"]`).click();
      await page.locator('#check').click();
      break;
    case 'output':
      await page.locator('#prediction').fill(exercise.expected[0]);
      await page.locator('#check').click();
      break;
    case 'command':
      await page.locator('#command').fill(exercise.answers[0]);
      await page.locator('#command').press('Enter');
      break;
    case 'code':
    case 'sql':
      await page.locator('#editor').fill(exercise.solution);
      await page.locator('#run').click();
      break;
    case 'practice':
      await page.locator('#editor').fill(exercise.solution);
      for (const box of await page.locator('[data-check]').all()) await box.check();
      break;
    case 'explain':
      await page.locator('#explanation-input').fill(exercise.explanation.replace(/<[^>]+>/g, ' '));
      await page.locator('#compare').click();
      for (const box of await page.locator('[data-point]').all()) await box.check();
      break;
    case 'bug':
      for (const line of exercise.lines) await page.locator(`[data-line="${line}"]`).click();
      await page.locator('#check').click();
      for (const fix of exercise.fixes) await page.locator(`#fix-${fix.line}`).fill(fix.answers[0]);
      break;
    case 'order':
      await expect(page.locator('.order-item')).toHaveCount(exercise.lines.length);
      for (let target = 0; target < exercise.lines.length; target++) {
        let position = await page.locator('.order-item').evaluateAll((items, id) => items.findIndex((item) => item.getAttribute('data-index') === String(id)), target);
        while (position > target) {
          await page.locator('.order-item').nth(position).locator('[data-move="-1"]').click();
          position--;
        }
      }
      await page.locator('#check').click();
      break;
  }
  await expect(page.locator('#feedback')).toContainText('Richtig.', { timeout: exercise.type === 'code' || exercise.type === 'sql' ? 90_000 : 10_000 });
}

for (const area of loaded.catalog.areas) {
  test(`${area.id}: every lesson, first/last exercise and supporting page loads`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/${area.id}`);
    await expect(page.locator('h1')).toHaveText(area.title);
    await expect(page.locator('.module-row')).toHaveCount(area.modules.length);
    for (const [moduleIndex, module] of area.modules.entries()) {
      await page.goto(`/${area.id}/${module.id}`);
      await expect(page.locator('h1')).toHaveText(module.title);
      await expect(page.locator('article.lesson')).toBeVisible();
      await page.goto(`/${area.id}/${module.id}/1`);
      await expect(page.locator('#exercise-title')).toBeVisible();
      await page.goto(`/${area.id}/${module.id}/${module.exercises.length}`);
      await expect(page.locator('#exercise-title')).toBeVisible();
      await page.locator('#next').click();
      await expect(page.locator('h1')).toHaveText(area.modules[moduleIndex + 1]?.title ?? area.title);
    }
    for (const path of ['karten', 'projekte', 'glossar', 'spickzettel', 'beruf']) {
      await page.goto(`/${area.id}/${path}`);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h1')).not.toHaveText(/^(Fehler|Gibt es nicht\.)$/);
    }
    expect(errors).toEqual([]);
  });

  test(`${area.id}: exercise types, saved drafts, cards and capstone progress`, async ({ page }) => {
    test.setTimeout(180_000);
    const seen = new Set<string>();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const module of Object.values(loaded.areas[area.id].modules)) {
      for (const [i, exercise] of module.exercises.entries()) {
        if (seen.has(exercise.type)) continue;
        seen.add(exercise.type);
        await page.goto(`/${area.id}/${module.id}/${i + 1}`);
        await expect(page.locator('#exercise-title')).toHaveText(exercise.title);
        await solve(page, exercise);
        await page.reload();
        await expect(page.locator('#feedback')).toContainText(/Richtig.|Gelöst./);
      }
    }
    await page.goto(`/${area.id}/karten`);
    await page.locator('#start').click();
    await page.locator('#show').click();
    await expect(page.locator('.flashcard-answer')).toBeVisible();
    await page.locator('#good').click();
    await page.reload();
    await expect(page.locator('.card-item .tag', { hasText: 'Box 1' })).toHaveCount(1);
    const capstone = area.projects.find((project) => project.capstone)!;
    await page.goto(`/${area.id}/projekte/${capstone.id}`);
    await page.locator('[data-key]').first().check();
    await page.reload();
    await expect(page.locator('[data-key]').first()).toBeChecked();
    await expect(page.locator('#project-count')).toContainText('1/');
    expect(errors).toEqual([]);
  });

  if (['python', 'automation', 'data'].includes(area.id)) test(`${area.id}: every runnable solution passes in the actual browser runtime`, async ({ page }) => {
    test.setTimeout(480_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/${area.id}`);
    let executed = 0;
    for (const module of Object.values(loaded.areas[area.id].modules)) {
      const runnable = module.exercises.map((exercise, index) => ({ exercise, index })).filter(({ exercise }) => exercise.type === 'code' || exercise.type === 'sql');
      if (!runnable.length) continue;
      await page.locator(`.topnav a[data-area="${area.id}"]`).click();
      await page.locator(`.module-row[href="/${area.id}/${module.id}"]`).click();
      for (const [position, { exercise, index }] of runnable.entries()) {
        const path = `/${area.id}/${module.id}/${index + 1}`;
        await page.locator(`${position ? '.steps' : '.exercise-list'} a[href="${path}"]`).click();
        await expect(page.locator('#exercise-title')).toHaveText(exercise.title);
        await solve(page, exercise);
        executed++;
      }
    }
    expect(executed).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}

test('real content fits phone, tablet and desktop viewports', async ({ page }) => {
  test.setTimeout(180_000);
  // Weak spots in every area, so the review pages show topic cards, the topic map and a running round.
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const seeded = Object.fromEntries(loaded.catalog.areas.map((area) => {
    const [first] = area.modules;
    const done = Object.fromEntries(first.exercises.map((e) => [e.id, { at: `${day(-20)}T10:00:00.000Z`, fp: e.fingerprint }]));
    const drills = { [first.exercises[1].id]: { box: 1, due: day(-1), last: day(-2), fails: 3, hints: 1, reveals: 1, open: 0 } };
    const card = area.topics.find((t) => t.cards.length)!.cards[0];
    return [area.id, { version: 1, done, drafts: {}, revealed: {}, read: {}, cards: { [card]: { box: 1, due: day(0), seen: 2, grade: 'again', lapses: 2 } }, projects: {}, drills, topics: {}, last: null }];
  }));
  await page.goto('/');
  await page.evaluate((areas) => { for (const [id, value] of Object.entries(areas)) localStorage.setItem(`learn:${id}:v1`, JSON.stringify(value)); }, seeded);
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const paths = ['/', '/daten', '/wiederholen'];
    for (const area of loaded.catalog.areas) {
      paths.push(`/${area.id}`, `/${area.id}/${area.modules[0].id}`, `/${area.id}/karten`, `/${area.id}/projekte`, `/${area.id}/projekte/${area.projects.find((p) => p.capstone)!.id}`, `/${area.id}/glossar`, `/${area.id}/spickzettel`, `/${area.id}/beruf`);
      paths.push(`/${area.id}/wiederholen`, `/${area.id}/wiederholen/${area.modules[0].id}`);
      const types = new Set<string>();
      for (const module of area.modules) for (const [index, exercise] of module.exercises.entries()) {
        if (types.has(exercise.type)) continue;
        types.add(exercise.type);
        paths.push(`/${area.id}/${module.id}/${index + 1}`);
      }
    }
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px ${path}`).toBe(true);
    }
  }
});
