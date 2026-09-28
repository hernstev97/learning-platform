import { test, expect, type Page } from '@playwright/test';

// Runs against the fixture area (CONTENT_FIXTURES=1), which contains every exercise type.
const base = '/beispiel/alle-typen';
const errorsOf = (page: Page) => { const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message)); return errors; };

test('home and area pages render and link together', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/');
  await expect(page.locator('.area-block')).not.toHaveCount(0);
  await page.locator('.area-block', { hasText: 'Beispielbereich' }).click();
  await expect(page).toHaveURL(/\/beispiel$/);
  await expect(page.locator('h1')).toHaveText('Beispielbereich');
  await expect(page.locator('.capstone-block')).toBeVisible();
  await page.locator('.module-row').first().click();
  await expect(page.locator('.toc a').first()).toHaveText('Einstieg');
  await page.goto('/gibt-es-nicht/xyz');
  await expect(page.locator('h1')).toHaveText('Gibt es nicht.');
  expect(errors).toEqual([]);
});

test('gap, choice, order, output and command exercises', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto(`${base}/1`);
  await page.locator('#answer-g1').fill('def');
  await page.locator('#answer-g2').fill('2 * x');
  await expect(page.locator('#feedback')).toContainText('Richtig.');

  await page.goto(`${base}/2`);
  await page.locator('[data-option="0"]').click();
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('unvollständig');
  await page.locator('[data-option="2"]').click();
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('Richtig.');

  await page.goto(`${base}/3`);
  for (let target = 0; target < 5; target++) {
    // Move the line that belongs at `target` up until it is there.
    for (let guard = 0; guard < 10; guard++) {
      const texts = await page.locator('.order-code').allInnerTexts();
      const wanted = ['from pathlib import Path', 'pfad = Path("notizen.txt")', 'with pfad.open(encoding="utf-8") as datei:', 'for zeile in datei:', 'print(zeile.rstrip())'][target];
      const at = texts.findIndex((t) => t.trim() === wanted);
      if (at === target) break;
      await page.locator('.order-item').nth(at).locator('[data-move="-1"]').click();
    }
  }
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('Richtig.');

  await page.goto(`${base}/4`);
  await page.locator('#prediction').fill('[1, 2, 3]\n[1, 2, 3]');
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('Zeile 2');
  await page.locator('#prediction').fill('[1, 2, 3]\n[3, 1, 2]');
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('Richtig.');

  await page.goto(`${base}/6`);
  await page.locator('#command').fill('ls -l');
  await page.locator('#command').press('Enter');
  await expect(page.locator('.term-bad')).toHaveCount(1);
  await page.locator('#command').fill('ls -a -l');
  await page.locator('#command').press('Enter');
  await expect(page.locator('#feedback')).toContainText('Richtig.');
  await expect(page.locator('#term-output')).toBeVisible();
  expect(errors).toEqual([]);
});

test('python code runs in the browser against the tests', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`${base}/7`);
  await page.locator('#run').click();
  await expect(page.locator('#feedback')).toContainText(/Tests bestanden|Fehler/, { timeout: 90_000 });
  await page.locator('#editor').fill('def zaehle_woerter(text: str) -> int:\n    return len(text.split())');
  await page.locator('#run').click();
  await expect(page.locator('#feedback')).toContainText('Richtig.', { timeout: 30_000 });
  await expect(page.locator('.test.pass')).toHaveCount(3);
  await page.locator('#editor').fill('while True:\n    pass');
  await page.locator('#run').click();
  await expect(page.locator('#run-output')).toContainText('Zeitlimit', { timeout: 30_000 });
});

test('practice, bug and explain exercises', async ({ page }) => {
  await page.goto(`${base}/8`);
  await expect(page.locator('#playground')).toHaveAttribute('href', /play\.rust-lang\.org/);
  for (const box of await page.locator('[data-check]').all()) await box.check();
  await expect(page.locator('#feedback')).toContainText('Richtig.');

  await page.goto(`${base}/9`);
  await page.locator('[data-line="2"]').click();
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('nicht die Ursache');
  await page.locator('[data-line="3"]').click();
  await page.locator('#check').click();
  await expect(page.locator('#fixes')).toBeVisible();
  await page.locator('#fix-3').fill('for i in range(1, n + 1):');
  await expect(page.locator('#feedback')).toContainText('Richtig.');

  await page.goto(`${base}/10`);
  await expect(page.locator('#compare')).toBeDisabled();
  await page.locator('#explanation-input').fill('Der Dekorator speichert jedes Ergebnis pro Argument, dadurch wird jeder Wert nur einmal berechnet und die Rekursion wird linear.');
  await page.locator('#compare').click();
  for (const box of await page.locator('[data-point]').all()) await box.check();
  await expect(page.locator('#feedback')).toContainText('Richtig.');
  await page.goto('/beispiel');
  await expect(page.locator('.module-row .label').last()).toHaveText('3/10');
});

test('cards, projects, reference pages and data export', async ({ page }) => {
  await page.goto('/beispiel/karten');
  await page.locator('#start').click();
  await page.keyboard.press(' ');
  await expect(page.locator('.flashcard-answer')).toBeVisible();
  await page.keyboard.press('2');
  await expect(page.locator('.deck-done')).toContainText('1 von 1');
  await page.goto('/beispiel/projekte/abschluss');
  await page.locator('[data-key]').first().check();
  await page.reload();
  await expect(page.locator('[data-key]').first()).toBeChecked();
  await page.goto('/beispiel/glossar');
  await page.locator('#glossary-filter').fill('repl');
  await expect(page.locator('.glossary-entry:visible')).toHaveCount(1);
  await page.goto('/beispiel/spickzettel');
  await expect(page.locator('.table-wrap')).toBeVisible();
  await page.goto('/daten');
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  expect((await download).suggestedFilename()).toMatch(/^learn-kiumu-.*\.json$/);
});

test('lesson python blocks run, pages stay within the viewport on mobile', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(base);
  await page.locator('.codeblock[data-run] button', { hasText: 'Ausführen' }).click();
  await expect(page.locator('.run-output')).toContainText('Hallo, Grace!', { timeout: 90_000 });
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ['/', '/beispiel', base, `${base}/1`, `${base}/3`, `${base}/9`, '/beispiel/karten', '/beispiel/projekte/abschluss']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
});

test('storage failures are reported without breaking the app', async ({ context }) => {
  const page = await context.newPage();
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await page.goto(`${base}/1`);
  await page.locator('#answer-g1').fill('def');
  await expect(page.locator('#storage-warning')).toBeVisible();
  await expect(page.locator('#state-g1')).toContainText('Richtig');
});
