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

test('home continues after a solved exercise and ignores card reviews', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/');
  await expect(page.locator('.resume')).toHaveCount(0);
  await page.goto(`${base}/1`);
  await page.locator('#answer-g1').fill('def');
  await page.locator('#answer-g2').fill('2 * x');
  await expect(page.locator('#feedback')).toContainText('Richtig.');
  await page.goto('/beispiel/karten');
  await page.goto('/');
  const resume = page.locator('.resume');
  await expect(resume).toContainText('Beispielbereich');
  await expect(resume).toContainText('Übung 2 von');
  await expect(resume).toContainText('schon erledigt');
  await expect(resume.getByRole('link', { name: 'Weiterlernen' })).toHaveAttribute('href', `${base}/2`);
  await expect(page.locator('.area-block', { hasText: 'Beispielbereich' })).toHaveAttribute('href', `${base}/2`);
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
  await page.locator('#editor').fill('def zaehle_woerter(text: str) -> int:\n    return len(text.split())');
  await page.locator('#run').click();
  await expect(page.locator('#feedback')).toContainText('Richtig.', { timeout: 30_000 });
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

test('unsaved work can be exported and merged when browser storage is blocked', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await page.goto(`${base}/1`);
  await page.locator('#answer-g1').fill('def');
  await page.locator('#answer-g2').fill('2 * x');
  await expect(page.locator('#feedback')).toContainText('Richtig.');
  // SPA navigation is deliberate: this is the work that only exists in the current tab.
  await page.getByRole('link', { name: 'Daten', exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#export').click();
  const stream = await (await downloadEvent).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  expect(Object.keys(backup.areas.beispiel.done)).toHaveLength(1);
  expect(Object.values(backup.areas.beispiel.drafts)).toContainEqual({ g1: 'def', g2: '2 * x' });
  backup.areas.beispiel.done = {};
  backup.areas.beispiel.drafts = {};
  backup.areas.beispiel.read = { 'alle-typen': '2026-09-28' };
  await page.locator('#import-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator('#data-message')).toContainText('übernommen');
  await expect(page.locator('.data-table tr', { hasText: 'Beispielbereich' })).toContainText('1 / 10');
});

test('malformed addresses render the not-found page without an unhandled exception', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/');
  // Vite rejects malformed URL escapes at the HTTP layer; exercise the client router directly.
  await page.evaluate(() => { history.pushState(null, '', '/%E0%A4%A'); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.locator('h1')).toHaveText('Gibt es nicht.');
  await page.goto('/#%E0%A4%A');
  await expect(page.locator('.hero-title')).toBeVisible();
  expect(errors).toEqual([]);
});

test('two asynchronous Python snippets keep their output isolated', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/python/python-einstieg');
  const blocks = page.locator('.codeblock[data-run="python"]');
  await expect(blocks.nth(1)).toBeVisible();
  await blocks.nth(0).locator('textarea').fill('import asyncio\nprint("erster-start")\nawait asyncio.sleep(0.2)\nprint("erster-ende")');
  await blocks.nth(1).locator('textarea').fill('print("zweiter")');
  await blocks.nth(0).getByRole('button', { name: 'Ausführen' }).click();
  await blocks.nth(1).getByRole('button', { name: 'Ausführen' }).click();
  await expect(blocks.nth(0).locator('.run-output')).toContainText('erster-ende', { timeout: 90_000 });
  await expect(blocks.nth(0).locator('.run-output')).not.toContainText('zweiter');
  await expect(blocks.nth(1).locator('.run-output')).toContainText('zweiter');
  await expect(blocks.nth(1).locator('.run-output')).not.toContainText('erster');
});

test('late content cannot overwrite a more recent navigation', async ({ page }) => {
  let release!: () => void;
  let requested!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const intercepted = new Promise<void>((resolve) => { requested = resolve; });
  await page.route('**/*', async (route) => {
    if (route.request().url().includes('virtual:area/python')) { requested(); await held; }
    await route.continue();
  });
  await page.goto('/python');
  await page.locator('.module-row').first().click();
  await intercepted;
  await page.locator('.topnav a[data-area="rust"]').click();
  await expect(page.locator('h1')).toHaveText('Rust');
  const response = page.waitForResponse((res) => res.url().includes('virtual:area/python'));
  release();
  await (await response).finished();
  // Allow the held import and its render continuation to settle.
  await page.waitForTimeout(200);
  await expect(page).toHaveURL(/\/rust$/);
  await expect(page.locator('h1')).toHaveText('Rust');
});
