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

test('lesson notes save while typing, survive a reload and mark the lesson', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto(base);
  await page.locator('.toc a', { hasText: 'Meine Notizen' }).click();
  const note = page.locator('#note');
  await expect(note).toBeEditable();
  await note.fill('Erkenntnis: def definiert eine Funktion.');
  await page.reload();
  await expect(note).toHaveValue('Erkenntnis: def definiert eine Funktion.');
  await page.goto('/beispiel');
  await expect(page.locator('.module-row', { hasText: 'Alle Übungsarten' }).locator('.note-mark')).toHaveText('Notiz');
  await page.goto(base);
  await note.fill('');
  await page.goto('/beispiel');
  await expect(page.locator('.note-mark')).toHaveCount(0);
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

test('wrong attempts become an explained review topic, and a round from scratch moves each exercise on', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/wiederholen');
  await expect(page.locator('.review-empty')).toContainText('Noch nichts zu wiederholen');
  await expect(page.locator('#review-count')).toBeHidden();
  // A wrong answer left in a gap counts once; so does a wrong prediction. Both are solved afterwards.
  await page.goto(`${base}/1`);
  await page.locator('#answer-g1').fill('function');
  await page.locator('#answer-g2').focus();
  await page.locator('#answer-g1').fill('def');
  await page.locator('#answer-g2').fill('2 * x');
  await expect(page.locator('#feedback')).toContainText('Richtig.');
  await page.goto(`${base}/4`);
  await page.locator('#prediction').fill('[1, 2, 3]\n[1, 2, 3]');
  await page.locator('#check').click();
  await page.locator('#prediction').fill('[1, 2, 3]\n[3, 1, 2]');
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('Richtig.');

  // Not due yet: the topic waits, and says when it returns.
  await page.goto('/beispiel/wiederholen');
  const row = page.locator('#thema-alle-typen');
  await expect(row.locator('.topic-status')).toHaveText('Wackelig');
  await expect(row).toContainText('2 Fehlversuche in 2 Übungen');
  await expect(row).toContainText('Nächste Wiederholung in 4 Tagen');

  // Five days later it is on today's plan, on the home page and in the top bar.
  await page.clock.setFixedTime(new Date(Date.now() + 5 * 86_400_000));
  await page.goto('/');
  const card = page.locator('.review-band .topic-card');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Alle Übungsarten');
  await expect(card).toContainText('2 Fehlversuche in 2 Übungen');
  await expect(card).toContainText('2 Übungen · ca. 4 min');
  await expect(page.locator('#review-count')).toHaveText('1');
  await page.goto('/beispiel');
  await expect(page.locator('.module-row', { hasText: 'Alle Übungsarten' }).locator('.review-mark')).toHaveText('Fällig');
  await expect(page.locator('.mini-bars i.weak')).toHaveCount(2);

  await page.goto('/');
  await card.getByRole('link', { name: 'Wiederholen' }).click();
  await expect(page).toHaveURL('/beispiel/wiederholen/alle-typen');
  await expect(page.locator('.round-why')).toContainText('2 Fehlversuche in 2 Übungen');
  // The gap starts empty, not with the saved answer; solved without help it moves up a step.
  await expect(page.locator('.round-item-why')).toContainText('1 Fehlversuch · Stufe 2 von 3');
  await expect(page.locator('#answer-g1')).toHaveValue('');
  await page.locator('#answer-g1').fill('def');
  await page.locator('#answer-g2').fill('2 * x');
  // Comparing with the solution after solving is not trouble.
  await page.locator('#reveal').click();
  await page.locator('#continue').click();
  // Wrong again: it stays on its step.
  await page.locator('#prediction').fill('[1, 2, 3]\n[1, 2, 3]');
  await page.locator('#check').click();
  await page.locator('#prediction').fill('[1, 2, 3]\n[3, 1, 2]');
  await page.locator('#check').click();
  await page.locator('#continue').click();
  const done = page.locator('.round-done');
  await expect(done.locator('h2')).toHaveText('1 von 2 Übungen ohne Hilfe');
  await expect(done.locator('.round-result').nth(0)).toContainText('Ohne Hilfe gelöst · Stufe 3 · wieder in 10 Tagen');
  await expect(done.locator('.round-result').nth(1)).toContainText('Mit Fehlversuchen oder Hinweisen gelöst · Stufe 2 · wieder in 4 Tagen');
  await page.goto('/wiederholen');
  await expect(page.locator('.review-empty')).toContainText('Heute ist nichts fällig');
  // The learning path keeps its own saved answer.
  await page.goto(`${base}/1`);
  await expect(page.locator('#answer-g1')).toHaveValue('def');
  expect(errors).toEqual([]);
});

test('a shown solution and a forgotten card are bundled by topic and explained', async ({ page }) => {
  const errors = errorsOf(page);
  // Help needed again on a later visit is not counted twice.
  await page.goto(`${base}/2`);
  await page.locator('#hint').click();
  await page.locator('#reveal').click();
  await page.reload();
  await page.locator('#hint').click();
  await page.locator('#reveal').click();
  await page.locator('[data-option="0"]').click();
  await page.locator('[data-option="2"]').click();
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('Richtig.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('learn:beispiel:v1')!).drills['alle-typen/auswahl'])).toMatchObject({ box: 1, hints: 1, reveals: 1, fails: 0 });
  await page.goto('/beispiel/karten');
  await page.locator('#tag').selectOption('nebenläufigkeit');
  await page.locator('#start').click();
  await page.keyboard.press(' ');
  await page.keyboard.press('1');

  await page.clock.setFixedTime(new Date(Date.now() + 86_400_000));
  await page.goto('/beispiel/wiederholen');
  await expect(page.locator('.area-tabs [aria-current] b')).toHaveText('2');
  const topics = page.locator('.review-today .topic-card');
  await expect(topics).toHaveCount(2);
  await expect(topics.filter({ hasText: 'Alle Übungsarten' })).toContainText('Lösung bei 1 Übung angesehen');
  const interview = topics.filter({ hasText: 'Interview: Nebenläufigkeit' });
  await expect(interview).toContainText('1 Interviewkarte zuletzt vergessen');
  await interview.getByRole('link', { name: 'Wiederholen' }).click();
  await expect(page.locator('.round-item-why')).toContainText('Zuletzt vergessen');
  await page.keyboard.press(' ');
  await page.keyboard.press('3');
  await expect(page.locator('.round-done h2')).toHaveText('1 von 1 Karte gewusst');
  await expect(page.locator('.round-done .round-result')).toContainText('Okay · Box 2 · wieder in 3 Tagen');
  await page.locator('.round-done').getByRole('link', { name: /Nächstes Thema: Alle Übungsarten/ }).click();
  await expect(page.locator('.round-item-why')).toContainText('Lösung angesehen · 1 Hinweis · Stufe 1 von 3');
  await expect(page.locator('[data-option="0"]')).toHaveAttribute('aria-checked', 'false');
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
  await expect(page.locator('.module-row .label').last()).toHaveText('3/13');
});

test('SQL runs in the browser: table preview, result table, feedback and runnable lesson blocks', async ({ page }) => {
  await page.goto(`${base}/11`);
  await expect(page.locator('.sql-table summary')).toContainText('bestellungen');
  await expect(page.locator('.sql-table .sql-null')).toHaveText('NULL');
  await page.locator('#run').click();
  await expect(page.locator('#feedback')).toContainText('Spalte 2 heißt „betrag“, erwartet ist „umsatz“', { timeout: 60_000 });
  await page.locator('#editor').fill('SELECT region, betrag AS umsatz FROM bestellungen');
  await page.locator('#run').click();
  await expect(page.locator('#feedback')).toContainText('Deine Abfrage liefert 4 Zeilen, erwartet sind 3 Zeilen.');
  await page.locator('#editor').fill('SELECT region, SUM(betrag) AS umsatz FROM bestellungen GROUP BY region ORDER BY region DESC');
  await page.locator('#run').click();
  await expect(page.locator('#feedback')).toContainText('Reihenfolge');
  await expect(page.locator('#sql-result tbody tr')).toHaveCount(3);
  await page.locator('#editor').fill('SELECT nope FROM bestellungen');
  await page.locator('#run').click();
  await expect(page.locator('#sql-result')).toContainText('no such column: nope');
  await page.locator('#editor').fill('SELECT region, SUM(betrag) AS umsatz\nFROM bestellungen\nGROUP BY region\nORDER BY umsatz DESC;');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('#feedback')).toContainText('Richtig.');
  await page.reload();
  await expect(page.locator('#feedback')).toContainText(/Richtig.|Gelöst./);

  await page.goto(`${base}/12`);
  await page.locator('#answer-g1').fill('sumifs');
  await page.locator('#answer-g2').fill('"Nord"');
  await expect(page.locator('#feedback')).toContainText('Richtig.');

  await page.goto(base);
  const block = page.locator('.codeblock[data-run="sql"]');
  await block.getByRole('button', { name: 'Ausführen' }).click();
  await expect(block.locator('.run-output table')).toContainText('160.5', { timeout: 60_000 });
  await expect(page.locator('.codeblock[data-lang="excel"] .syntax-fn')).toHaveText('SUMMEWENNS');
});

test('a scenario runs a real Linux in the browser, loaded only on start and only from this site', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = errorsOf(page);
  const requests: URL[] = [];
  page.on('request', (request) => requests.push(new URL(request.url())));
  await page.goto(`${base}/13`);
  await expect(page.locator('#vm-boot')).toBeVisible();
  await expect(page.locator('#check')).toBeDisabled();
  expect(requests.filter((url) => url.pathname.startsWith('/vm/'))).toEqual([]);

  const started = requests.length;
  await page.locator('#vm-boot').click();
  const terminal = page.locator('#vm-screen .xterm-rows');
  await expect(terminal).toContainText('ops@web01:~$', { timeout: 120_000 });
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('0 von 1 Prüfungen bestanden', { timeout: 30_000 });
  await expect(page.locator('.test.fail')).toHaveCount(1);

  await page.locator('#vm-screen').click();
  await page.keyboard.type('echo hallo > ~/hallo.txt');
  await page.keyboard.press('Enter');
  await expect(page.locator('#vm-steps')).toHaveText('1 Befehl');
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('Richtig.', { timeout: 30_000 });

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#vm-reset').click();
  await expect(page.locator('#vm-steps')).toHaveText('');
  await expect(terminal).toContainText('ops@web01:~$', { timeout: 30_000 });
  await page.locator('#vm-screen').click();
  await page.keyboard.type('cat ~/hallo.txt');
  await page.keyboard.press('Enter');
  await expect(terminal).toContainText(/No.such.file.or.directory/, { timeout: 30_000 });

  // No network in the VM: everything after the start comes from this site.
  const origin = new URL(page.url()).origin;
  expect(requests.slice(started).filter((url) => url.origin !== origin).map(String)).toEqual([]);
  expect(requests.some((url) => url.pathname.endsWith('/state.bin.zst'))).toBe(true);
  expect(errors).toEqual([]);
});

test('cards, projects, reference pages and data export', async ({ page }) => {
  await page.goto('/beispiel/karten');
  await page.locator('#tag').selectOption('nebenläufigkeit');
  await page.locator('#start').click();
  await page.keyboard.press(' ');
  await expect(page.locator('.flashcard-answer')).toBeVisible();
  await expect(page.locator('#good .grade-next')).toHaveText('1 Tag');
  await page.keyboard.press('1');
  await expect(page.locator('.flashcard-meta')).toContainText('Karte 2 / 2');
  await expect(page.locator('.flashcard-meta')).toContainText('Box 1 · 1× vergessen');
  await page.keyboard.press(' ');
  await expect(page.locator('#again .grade-next')).toHaveText('heute');
  await expect(page.locator('#hard .grade-next')).toHaveText('1 Tag');
  await page.keyboard.press('3');
  await expect(page.locator('.deck-done')).toContainText('0 von 1 auf Anhieb gewusst');
  await expect(page.locator('.card-item .tag')).toHaveText('Box 2 · 1× vergessen');
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
  await page.locator('.codeblock[data-run="python"] button', { hasText: 'Ausführen' }).click();
  await expect(page.locator('.codeblock[data-run="python"] .run-output')).toContainText('Hallo, Grace!', { timeout: 90_000 });
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ['/', '/beispiel', base, `${base}/1`, `${base}/3`, `${base}/9`, '/beispiel/karten', '/beispiel/projekte/abschluss']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
});

test('global search finds lessons, glossary terms and cards across areas and opens them', async ({ page }) => {
  const errors = errorsOf(page);
  const dialog = page.getByRole('dialog', { name: 'Suche' });
  const input = page.getByRole('combobox', { name: 'Lerninhalte durchsuchen' });
  const options = page.getByRole('option');
  await page.goto('/');
  await page.keyboard.press('/');
  await expect(input).toBeFocused();
  await input.fill('Rust im Playground');
  await expect(options.first()).toContainText('Rust im Playground');
  await expect(options.first().locator('.search-hit-meta')).toHaveText(/Beispiel.*Lektion.*Alle Übungsarten/);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/beispiel/alle-typen#rust-im-playground');
  await expect(dialog).toBeHidden();
  await expect(page.locator('#rust-im-playground')).toBeFocused();
  await expect(page.locator('#rust-im-playground')).toBeInViewport();

  // One query, several areas: arrow keys select, Enter opens the selected card with its answer.
  await page.keyboard.press('Control+k');
  await expect(input).toBeFocused();
  await input.fill('Global Interpreter Lock');
  await expect(options.first()).toBeVisible();
  expect(new Set(await page.locator('.search-hit-area').allTextContents()).size).toBeGreaterThan(1);
  const labels = await options.evaluateAll((items) => items.map((item) => item.querySelector('.search-hit-meta')!.textContent!));
  const card = labels.findIndex((label) => label.includes('Beispiel') && label.includes('Interview-Karte'));
  expect(card).toBeGreaterThan(-1);
  for (let i = 0; i < card; i++) await page.keyboard.press('ArrowDown');
  await expect(options.nth(card)).toHaveAttribute('aria-selected', 'true');
  await expect(input).toHaveAttribute('aria-activedescendant', `search-hit-${card}`);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/beispiel/karten#karte-gil');
  await expect(page.locator('#karte-gil')).toHaveAttribute('open', '');
  await expect(page.locator('#karte-gil')).toBeInViewport();

  // A result on the current page is shown even if the glossary filter hides it; "/" in a text field is just typed.
  await page.goto('/beispiel/glossar');
  await page.locator('#glossary-filter').fill('immutable');
  await page.locator('#glossary-filter').press('/');
  await expect(dialog).toBeHidden();
  await expect(page.locator('#begriff-repl')).toBeHidden();
  await page.locator('#search-open').click();
  await input.fill('repl');
  await options.filter({ hasText: 'Glossar' }).filter({ hasText: 'Beispiel' }).click();
  await expect(page).toHaveURL('/beispiel/glossar#begriff-repl');
  await expect(page.locator('#begriff-repl')).toBeVisible();

  // Escape closes and returns to the button; the dialog fits a phone screen.
  await page.locator('#search-open').click();
  await expect(input).toHaveValue('repl');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('#search-open')).toBeFocused();
  await page.setViewportSize({ width: 360, height: 780 });
  await page.locator('#search-open').click();
  await input.fill('xyz-gibt-es-nicht');
  await expect(page.locator('#search-status')).toHaveText('Keine Treffer für „xyz-gibt-es-nicht“.');
  expect(await dialog.evaluate((element) => element.getBoundingClientRect().right <= innerWidth && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
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
  await expect(page.locator('.data-table tr', { hasText: 'Beispielbereich' })).toContainText('1 / 13');
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

test('loading pandas in one block leaves the results of other blocks alone', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/python/python-einstieg');
  const blocks = page.locator('.codeblock[data-run="python"]');
  await expect(blocks.nth(1)).toBeVisible();
  await blocks.nth(0).locator('textarea').fill('print("erster")');
  await blocks.nth(0).getByRole('button', { name: 'Ausführen' }).click();
  await expect(blocks.nth(0).locator('.run-output')).toContainText('erster', { timeout: 90_000 });
  // The first pandas import takes seconds and switches the runner to its "packages" notice.
  await blocks.nth(1).locator('textarea').fill('import pandas as pd\nprint(pd.Series([1, 2]).sum())');
  await blocks.nth(1).getByRole('button', { name: 'Ausführen' }).click();
  await expect(blocks.nth(1).locator('.run-output')).toContainText('3', { timeout: 90_000 });
  await expect(blocks.nth(0).locator('.run-output')).toContainText('erster');
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

test('theme follows the system until chosen, then persists', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  const errors = errorsOf(page);
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
  await page.goto('/');
  expect(await theme()).toBe('dark');
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', 'Helles Design aktivieren');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(theme).toBe('light');
  await page.locator('#theme-toggle').click();
  expect(await theme()).toBe('dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#161614');
  await page.reload();
  expect(await theme()).toBe('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  expect(await theme()).toBe('dark');
  expect(errors).toEqual([]);
  await context.close();
});
