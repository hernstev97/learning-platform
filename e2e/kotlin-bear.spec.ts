import { test, expect } from '@playwright/test';
import { loadContent } from '../tooling/content.ts';
import { gapSolution } from '../src/engine/answers.ts';
import type { GapExercise } from '../src/content/types.ts';

// The Bear track (imported from kotlin-lernen) keeps working inside the platform.
const kotlin = loadContent(['kotlin'], undefined, { allowMissing: true }).areas.kotlin;
const bear = Object.values(kotlin.modules).filter((m) => m.bear);

test('gap checking, saved drafts, completion and reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/kotlin/bear-01/1');
  await page.locator('#answer-g1').fill('var');
  await expect(page.locator('#state-g1')).toHaveText('Noch nicht richtig');
  await page.locator('#answer-g1').fill('val');
  await expect(page.locator('#feedback')).toContainText('Richtig.');
  await expect(page.locator('#explanation')).toBeVisible();
  await expect(page.locator('.step').first()).toHaveClass(/done/);
  await page.locator('#next').click();
  await expect(page).toHaveURL(/bear-01\/2$/);
  await page.locator('#answer-g1').fill('"Be');
  await page.reload();
  await expect(page.locator('#answer-g1')).toHaveValue('"Be');
  await page.goto('/kotlin/bear-01/1');
  await expect(page.locator('#feedback')).toContainText('Richtig.');
  expect(errors).toEqual([]);
});

test('every Bear task is solvable in the browser', async ({ page }) => {
  test.setTimeout(240_000);
  for (const module of bear) {
    for (const [i, exercise] of module.exercises.entries()) {
      await page.goto(`/kotlin/${module.id}/${i + 1}`);
      const answers = gapSolution(exercise as GapExercise);
      for (const [id, value] of Object.entries(answers)) await page.locator(`#answer-${id}`).fill(value);
      await expect(page.locator('#feedback')).toContainText('Richtig.');
    }
  }
  await page.goto('/kotlin');
  await expect(page.locator('.module-row.complete')).toHaveCount(bear.length);
});

test('source dialog shows the original file with the excerpt marked', async ({ page }) => {
  const module = bear[9];
  const exercise = module.exercises[4];
  await page.goto(`/kotlin/${module.id}/5`);
  await page.locator('#open-source').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.source-line.selected')).toHaveCount(exercise.source!.end - exercise.source!.start + 1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
