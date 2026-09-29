// order, code, practice, bug, explain
import type { BugExercise, CodeExercise, ExplainExercise, OrderExercise, PracticeExercise } from '../content/types.ts';
import { fixedCode, isBugFixCorrect, isBugSelectionCorrect, isOrderCorrect } from '../engine/answers.ts';
import { highlight } from '../engine/highlight.ts';
import { onRunnerState, runExercise } from '../python/runner.ts';
import { autosize, editorKeys, outputMarkup, playgroundUrl } from '../ui/code.ts';
import { $, $$, escape, html, icons, raw } from '../ui/dom.ts';
import { codeCard, langName } from './basic.ts';
import { failOnce, type ExerciseRenderer } from './types.ts';

export const order: ExerciseRenderer<OrderExercise, number[]> = (exercise, ctx) => {
  const fail = failOnce(ctx);
  const arrangement = ctx.draft?.length === exercise.lines.length ? [...ctx.draft] : [...exercise.shuffled];
  const lineMarkup = (index: number, position: number) => html`<li class="order-item" data-index="${index}" draggable="true">
    <span class="order-handle" aria-hidden="true">⠿</span>
    <code class="order-code">${raw(highlight(exercise.lines[index], exercise.lang) || ' ')}</code>
    <span class="order-buttons">
      <button type="button" class="btn small" data-move="-1" aria-label="Zeile ${position + 1} nach oben" ${position === 0 ? 'disabled' : ''}>${raw(icons.up)}</button>
      <button type="button" class="btn small" data-move="1" aria-label="Zeile ${position + 1} nach unten" ${position === exercise.lines.length - 1 ? 'disabled' : ''}>${raw(icons.down)}</button>
    </span></li>`;
  return {
    markup: html`
      <p class="label">${langName(exercise.lang)} · ${exercise.lines.length} Zeilen · mit den Pfeilen oder per Ziehen sortieren</p>
      <ol class="order-list codeblock" id="order-list"></ol>
      <div class="exercise-actions"><button type="button" class="btn primary" id="check">Reihenfolge prüfen</button></div>`.value,
    solution: () => codeCard(exercise.lines.join('\n'), exercise.lang, 'Richtige Reihenfolge'),
    bind(root) {
      const list = $('#order-list', root);
      let checked = false;
      const paint = (focusIndex?: number, focusDir?: string) => {
        list.innerHTML = arrangement.map((index, position) => lineMarkup(index, position).value).join('');
        if (checked) $$('.order-item', list).forEach((item, position) => item.classList.add(exercise.lines[arrangement[position]] === exercise.lines[position] ? 'right' : 'wrong'));
        if (focusIndex !== undefined) {
          const button = list.querySelector<HTMLButtonElement>(`[data-index="${focusIndex}"] [data-move="${focusDir}"]:not(:disabled)`) ?? list.querySelector<HTMLButtonElement>(`[data-index="${focusIndex}"] button:not(:disabled)`);
          button?.focus();
        }
      };
      const move = (from: number, to: number) => {
        if (to < 0 || to >= arrangement.length || from === to) return;
        const [item] = arrangement.splice(from, 1);
        arrangement.splice(to, 0, item);
        checked = false;
        ctx.save([...arrangement]);
      };
      list.addEventListener('click', (event) => {
        const button = (event.target as Element).closest<HTMLButtonElement>('[data-move]');
        if (!button) return;
        const item = button.closest<HTMLElement>('.order-item')!;
        const index = Number(item.dataset.index);
        const position = arrangement.indexOf(index);
        move(position, position + Number(button.dataset.move));
        paint(index, button.dataset.move);
      });
      let dragging: number | null = null;
      list.addEventListener('dragstart', (event) => {
        const item = (event.target as Element).closest<HTMLElement>('.order-item');
        if (!item) return;
        dragging = Number(item.dataset.index);
        item.classList.add('dragging');
        event.dataTransfer?.setData('text/plain', String(dragging));
      });
      list.addEventListener('dragover', (event) => {
        if (dragging === null) return;
        event.preventDefault();
        const over = (event.target as Element).closest<HTMLElement>('.order-item');
        if (!over || Number(over.dataset.index) === dragging) return;
        const rect = over.getBoundingClientRect();
        const target = arrangement.indexOf(Number(over.dataset.index)) + (event.clientY > rect.top + rect.height / 2 ? 1 : 0);
        const from = arrangement.indexOf(dragging);
        move(from, target > from ? target - 1 : target);
        paint();
        list.querySelector(`[data-index="${dragging}"]`)?.classList.add('dragging');
      });
      list.addEventListener('dragend', () => { dragging = null; paint(); });
      $('#check', root).addEventListener('click', () => {
        checked = true;
        paint();
        if (isOrderCorrect(exercise, arrangement)) ctx.complete();
        else {
          fail(arrangement);
          const right = arrangement.filter((index, position) => exercise.lines[index] === exercise.lines[position]).length;
          ctx.feedback('bad', `${right} von ${exercise.lines.length} Zeilen stehen schon an der richtigen Stelle (grün markiert).`);
        }
      });
      paint();
      if (ctx.done && isOrderCorrect(exercise, arrangement)) { checked = true; paint(); }
    },
  };
};

const RUNNER_IDLE = '<span class="kbd-hint">Strg + Enter · </span>läuft direkt im Browser';

export const code: ExerciseRenderer<CodeExercise, string> = (exercise, ctx) => ({
  markup: html`
    <div class="codeblock editor-block" data-lang="python">
      <div class="codeblock-bar"><span>Python · dein Code</span><button type="button" id="reset">Zurücksetzen</button></div>
      <textarea id="editor" class="code-editor" wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Dein Python-Code. Tab rückt ein, Strg+Enter führt aus, Escape dann Tab verlässt den Editor.">${ctx.draft ?? exercise.starter}</textarea>
    </div>
    <div class="exercise-actions"><button type="button" class="btn primary" id="run">${raw(icons.play)} Ausführen &amp; testen</button><span class="muted small" id="runner-state">${raw(RUNNER_IDLE)}</span></div>
    <div class="test-results" id="results" aria-live="polite">
      <p class="label">${exercise.tests.length} Tests</p>
      <ul>${exercise.tests.map((t, i) => html`<li id="test-${i}" class="test pending"><span class="test-mark" aria-hidden="true">·</span><span>${t.name}</span></li>`)}</ul>
    </div>
    <div id="run-output" class="run-output standalone" hidden></div>
    <details class="test-source"><summary class="label">Testcode ansehen</summary><pre class="code plain">${exercise.tests.map((t) => `# ${t.name}\n${t.code}`).join('\n\n')}</pre></details>`.value,
  solution: () => codeCard(exercise.solution, 'python', 'Musterlösung'),
  bind(root) {
    const editor = $<HTMLTextAreaElement>('#editor', root);
    const runButton = $<HTMLButtonElement>('#run', root);
    const stateLabel = $('#runner-state', root);
    // Running the tests is part of writing the code: failing runs count once per visit, not each run.
    const fail = failOnce(ctx);
    let active = true;
    autosize(editor, 6);
    const run = async () => {
      if (runButton.disabled) return;
      runButton.disabled = true;
      const out = $('#run-output', root);
      out.hidden = true;
      $$('.test', root).forEach((li) => { li.className = 'test pending'; li.querySelector('.test-mark')!.textContent = '·'; li.querySelector('.test-message')?.remove(); });
      ctx.feedback('info', 'Tests laufen …');
      try {
        const result = await runExercise(exercise.setup, editor.value, exercise.tests);
        if (!active) return;
        let passed = 0;
        result.tests.forEach((t, i) => {
          const li = $(`#test-${i}`, root);
          li.className = `test ${t.ok ? 'pass' : 'fail'}`;
          li.querySelector('.test-mark')!.textContent = t.ok ? '✓' : '✗';
          if (!t.ok) li.insertAdjacentHTML('beforeend', `<span class="test-message">${escape(t.message)}</span>`);
          if (t.ok) passed++;
        });
        if (result.stdout || result.error) { out.hidden = false; out.className = `run-output standalone${result.error ? ' error' : ''}`; out.innerHTML = outputMarkup(result.stdout, result.error); }
        if (result.error) { fail('run'); ctx.feedback('bad', 'Dein Code bricht mit einem Fehler ab, bevor die Tests laufen. Lies die Meldung unten – sie nennt die Zeile.'); }
        else if (passed === exercise.tests.length) ctx.complete();
        else { fail('run'); ctx.feedback('partial', `${passed} von ${exercise.tests.length} Tests bestanden.`); }
      } catch (error) {
        if (!active) return;
        out.hidden = false;
        out.className = 'run-output standalone error';
        out.textContent = (error as Error).message;
        ctx.feedback('bad', 'Der Code konnte nicht ausgeführt werden.');
      } finally { runButton.disabled = false; }
    };
    editorKeys(editor, run);
    editor.addEventListener('input', () => ctx.save(editor.value));
    runButton.addEventListener('click', run);
    $('#reset', root).addEventListener('click', () => {
      if (editor.value !== exercise.starter && !confirm('Deinen Code durch den Startcode ersetzen?')) return;
      editor.value = exercise.starter;
      ctx.save(editor.value);
      editor.dispatchEvent(new Event('input'));
    });
    const unsubscribe = onRunnerState((state) => {
      stateLabel.innerHTML = state === 'loading' ? 'Python wird geladen (einmalig ca. 12 MB) …' : state === 'running' ? 'Läuft …' : RUNNER_IDLE;
    });
    return () => { active = false; unsubscribe(); };
  },
});

type PracticeDraft = { code: string; checked: number[] };
export const practice: ExerciseRenderer<PracticeExercise, PracticeDraft> = (exercise, ctx) => {
  const draft: PracticeDraft = { code: ctx.draft?.code ?? exercise.starter, checked: [...(ctx.draft?.checked ?? [])] };
  return {
    markup: html`
      <div class="codeblock editor-block" data-lang="${exercise.lang}">
        <div class="codeblock-bar"><span>${langName(exercise.lang)} · dein Entwurf</span>${exercise.lang === 'rust' ? html`<a id="playground" href="#" target="_blank" rel="noopener noreferrer">Im Playground ausführen ${raw(icons.external)}</a>` : ''}</div>
        <textarea id="editor" class="code-editor" wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Dein Entwurf" placeholder="Schreib hier deinen Entwurf …">${draft.code}</textarea>
      </div>
      <p class="check-note">${exercise.lang === 'rust' ? 'Dein Entwurf wird gespeichert. Kompilieren und ausführen kannst du ihn im offiziellen Rust Playground.' : 'Dein Entwurf wird gespeichert. Schreib ihn hier oder in deiner IDE und vergleiche danach mit der Musterlösung.'}</p>
      <fieldset class="checklist"><legend class="label">Selbstkontrolle – hake ab, was deine Lösung erfüllt</legend>
        ${exercise.checklist.map((item, i) => html`<label class="check-item"><input type="checkbox" data-check="${i}" ${draft.checked.includes(i) ? 'checked' : ''}><span>${raw(item)}</span></label>`)}
      </fieldset>`.value,
    solution: () => codeCard(exercise.solution, exercise.lang, 'Musterlösung'),
    bind(root) {
      const editor = $<HTMLTextAreaElement>('#editor', root);
      autosize(editor, 8);
      editorKeys(editor);
      editor.addEventListener('input', () => { draft.code = editor.value; ctx.save(draft); });
      const playground = root.querySelector<HTMLAnchorElement>('#playground');
      if (playground) { playground.href = playgroundUrl(editor.value); playground.addEventListener('pointerdown', () => { playground.href = playgroundUrl(editor.value); }); playground.addEventListener('focus', () => { playground.href = playgroundUrl(editor.value); }); }
      const update = () => {
        if (draft.checked.length === exercise.checklist.length) ctx.complete();
        else ctx.feedback('info', `${draft.checked.length} von ${exercise.checklist.length} Kriterien abgehakt.`);
      };
      $$<HTMLInputElement>('[data-check]', root).forEach((box) => box.addEventListener('change', () => {
        const i = Number(box.dataset.check);
        draft.checked = box.checked ? [...new Set([...draft.checked, i])] : draft.checked.filter((x) => x !== i);
        ctx.save(draft);
        update();
      }));
      update();
    },
  };
};

type BugDraft = { selected: number[]; found: boolean; fixes: Record<string, string> };
export const bug: ExerciseRenderer<BugExercise, BugDraft> = (exercise, ctx) => {
  const fail = failOnce(ctx);
  const draft: BugDraft = { selected: [...(ctx.draft?.selected ?? [])], found: !!ctx.draft?.found, fixes: { ...(ctx.draft?.fixes ?? {}) } };
  const lines = exercise.code.split('\n');
  const many = exercise.lines.length > 1;
  return {
    markup: html`
      <div class="codeblock bug-code" data-lang="${exercise.lang}">
        <div class="codeblock-bar"><span>${langName(exercise.lang)} · ${many ? `${exercise.lines.length} fehlerhafte Zeilen` : 'eine fehlerhafte Zeile'} – klicke ${many ? 'sie' : 'sie'} an</span></div>
        <ol class="bug-lines" role="group" aria-label="Codezeilen, auswählbar">
          ${lines.map((line, i) => html`<li><button type="button" class="bug-line" data-line="${i + 1}" aria-pressed="${draft.selected.includes(i + 1)}"><span class="line-number">${i + 1}</span><code>${raw(highlight(line, exercise.lang) || ' ')}</code></button></li>`)}
        </ol>
      </div>
      <div class="exercise-actions"><button type="button" class="btn primary" id="check">${many ? 'Zeilen prüfen' : 'Zeile prüfen'}</button></div>
      <div id="fixes" class="bug-fixes" ${draft.found && exercise.fixes.length ? '' : 'hidden'}>
        <p class="label">Gefunden. Jetzt reparieren: schreib die korrigierte Zeile</p>
        ${exercise.fixes.map((fix) => html`<div class="gap-field"><div class="gap-label"><label for="fix-${fix.line}"><span class="gap-number">${fix.line}</span>Zeile ${fix.line} korrigiert</label><span class="gap-state label" id="fix-state-${fix.line}">Offen</span></div>
          <textarea id="fix-${fix.line}" class="answer-input" rows="1" data-fix="${fix.line}" spellcheck="false" autocapitalize="off" autocomplete="off">${draft.fixes[fix.line] ?? lines[fix.line - 1].trim()}</textarea></div>`)}
      </div>`.value,
    solution: () => html`<p>Fehlerhaft: Zeile ${exercise.lines.join(', ')}.</p>${exercise.fixes.length ? raw(codeCard(fixedCode(exercise), exercise.lang, 'Korrigierter Code')) : ''}`.value,
    bind(root) {
      const buttons = $$<HTMLButtonElement>('.bug-line', root);
      const paint = (checked = false) => buttons.forEach((b) => {
        const line = Number(b.dataset.line);
        b.setAttribute('aria-pressed', String(draft.selected.includes(line)));
        b.classList.toggle('found', draft.found && exercise.lines.includes(line));
        b.classList.toggle('wrong', checked && draft.selected.includes(line) && !exercise.lines.includes(line));
      });
      const checkFixes = () => {
        let ok = 0;
        for (const fix of exercise.fixes) {
          const value = draft.fixes[fix.line] ?? lines[fix.line - 1].trim();
          const right = isBugFixCorrect(exercise, fix.line, value);
          if (right) ok++;
          $(`#fix-${fix.line}`, root).classList.toggle('correct', right);
          const state = $(`#fix-state-${fix.line}`, root);
          state.textContent = right ? '✓ Repariert' : 'Noch fehlerhaft';
          state.className = `gap-state label${right ? ' ok' : ''}`;
        }
        if (ok === exercise.fixes.length) ctx.complete();
        else ctx.feedback('partial', `Fehler gefunden. ${ok} von ${exercise.fixes.length} Korrekturen stimmen.`);
      };
      buttons.forEach((b) => b.addEventListener('click', () => {
        if (draft.found) return;
        const line = Number(b.dataset.line);
        draft.selected = draft.selected.includes(line) ? draft.selected.filter((x) => x !== line) : many ? [...draft.selected, line] : [line];
        ctx.save(draft);
        paint();
      }));
      $('#check', root).addEventListener('click', () => {
        if (draft.found) return;
        if (!draft.selected.length) { ctx.feedback('bad', 'Klicke zuerst die Zeile an, in der du den Fehler vermutest.'); return; }
        if (isBugSelectionCorrect(exercise, draft.selected)) {
          draft.found = true;
          ctx.save(draft);
          paint();
          if (exercise.fixes.length) { $('#fixes', root).hidden = false; $<HTMLTextAreaElement>('textarea[data-fix]', root).focus(); checkFixes(); }
          else ctx.complete();
        } else {
          fail([...draft.selected].sort());
          paint(true);
          const hits = draft.selected.filter((line) => exercise.lines.includes(line)).length;
          ctx.feedback('bad', hits ? `${hits} Treffer, aber nicht alles stimmt. Vergleiche das beschriebene Symptom mit jeder Zeile.` : 'Diese Zeile ist nicht die Ursache. Spiel den Code mit einem konkreten Beispiel durch.');
        }
      });
      $$<HTMLTextAreaElement>('[data-fix]', root).forEach((input) => {
        input.addEventListener('input', () => {
          draft.fixes[input.dataset.fix!] = input.value;
          ctx.save(draft);
          checkFixes();
        });
        // Checked while typing, like gaps: a wrong line left behind counts as a wrong attempt, a started one does not.
        input.addEventListener('change', () => {
          const value = input.value.trim();
          const started = exercise.fixes.find((fix) => fix.line === Number(input.dataset.fix))?.answers.some((answer) => answer.trim().startsWith(value));
          if (value && !started && !isBugFixCorrect(exercise, Number(input.dataset.fix), input.value)) ctx.fail();
        });
      });
      paint();
      if (draft.found) { if (exercise.fixes.length) checkFixes(); else ctx.complete(); }
    },
  };
};

type ExplainDraft = { text: string; revealed: boolean; checked: number[] };
export const explain: ExerciseRenderer<ExplainExercise, ExplainDraft> = (exercise, ctx) => {
  const draft: ExplainDraft = { text: ctx.draft?.text ?? '', revealed: !!ctx.draft?.revealed, checked: [...(ctx.draft?.checked ?? [])] };
  const MIN = 80;
  return {
    ownsExplanation: true,
    markup: html`
      ${raw(codeCard(exercise.code, exercise.lang, `${langName(exercise.lang)} · zu erklären`))}
      <label class="field-label label" for="explanation-input">Deine Erklärung – so, wie du sie im Code-Review oder Interview sagen würdest</label>
      <textarea id="explanation-input" class="answer-input prose-input" rows="6" placeholder="Was passiert hier, warum ist es so gebaut, worauf muss man achten?">${draft.text}</textarea>
      <div class="exercise-actions"><button type="button" class="btn primary" id="compare">Mit Musterantwort vergleichen</button><span class="muted small" id="count"></span></div>
      <section id="model" class="model-answer" ${draft.revealed ? '' : 'hidden'}>
        <p class="label">Musterantwort</p>
        <div class="prose compact">${raw(exercise.explanation)}</div>
        <fieldset class="checklist"><legend class="label">Welche Kernpunkte hat deine Erklärung getroffen?</legend>
          ${exercise.points.map((point, i) => html`<label class="check-item"><input type="checkbox" data-point="${i}" ${draft.checked.includes(i) ? 'checked' : ''}><span>${raw(point)}</span></label>`)}
        </fieldset>
        <p class="muted small">Fehlt ein Punkt? Ergänze deine Erklärung oben in eigenen Worten und hake ihn dann ab.</p>
      </section>`.value,
    solution: () => '',
    bind(root) {
      const input = $<HTMLTextAreaElement>('#explanation-input', root);
      const compare = $<HTMLButtonElement>('#compare', root);
      const count = $('#count', root);
      const refresh = () => {
        const n = input.value.trim().length;
        compare.disabled = n < MIN && !draft.revealed;
        count.textContent = draft.revealed ? '' : n < MIN ? `noch ${MIN - n} Zeichen bis zum Vergleich` : 'bereit zum Vergleich';
      };
      const update = () => {
        if (!draft.revealed) { ctx.feedback('info', 'Erst selbst erklären, dann vergleichen.'); return; }
        if (draft.checked.length === exercise.points.length) ctx.complete();
        else ctx.feedback('partial', `${draft.checked.length} von ${exercise.points.length} Kernpunkten getroffen.`);
      };
      input.addEventListener('input', () => { draft.text = input.value; ctx.save(draft); refresh(); });
      compare.addEventListener('click', () => {
        draft.revealed = true;
        ctx.save(draft);
        $('#model', root).hidden = false;
        refresh();
        update();
        $('#model', root).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      $$<HTMLInputElement>('[data-point]', root).forEach((box) => box.addEventListener('change', () => {
        const i = Number(box.dataset.point);
        draft.checked = box.checked ? [...new Set([...draft.checked, i])] : draft.checked.filter((x) => x !== i);
        ctx.save(draft);
        update();
      }));
      refresh();
      update();
    },
  };
};
