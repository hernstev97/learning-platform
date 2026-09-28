// gap, choice, output, command
import type { ChoiceExercise, CommandExercise, GapExercise, OutputExercise, Answers } from '../content/types.ts';
import { isChoiceCorrect, isCommandCorrect, isGapCorrect, isGapExerciseCorrect, isOutputCorrect, isPartial, normalizeOutput } from '../engine/answers.ts';
import { highlight, highlightWithGaps } from '../engine/highlight.ts';
import { $, $$, escape, html, icons, raw } from '../ui/dom.ts';
import type { ExerciseRenderer } from './types.ts';

export const codeCard = (code: string, lang: string, label: string, gaps = false) =>
  `<div class="codeblock exercise-code" data-lang="${escape(lang)}"><div class="codeblock-bar"><span>${escape(label)}</span></div><pre tabindex="0"><code>${gaps ? highlightWithGaps(code, lang) : highlight(code, lang)}</code></pre></div>`;
export const LANG_NAMES: Record<string, string> = { kotlin: 'Kotlin', rust: 'Rust', python: 'Python', bash: 'Bash', sh: 'Shell', shell: 'Shell', console: 'Terminal', yaml: 'YAML', toml: 'TOML', json: 'JSON', sql: 'SQL', dockerfile: 'Dockerfile', ini: 'Konfiguration', xml: 'XML', gradle: 'Gradle', kts: 'Gradle Kotlin DSL' };
export const langName = (lang: string) => LANG_NAMES[lang] ?? (lang ? lang.toUpperCase() : 'Code');

export const gap: ExerciseRenderer<GapExercise, Answers> = (exercise, ctx) => {
  const answers: Answers = { ...(ctx.draft ?? {}) };
  return {
    markup: html`
      ${raw(codeCard(exercise.code, exercise.lang, `${langName(exercise.lang)} · ${exercise.gaps.length === 1 ? '1 Lücke' : `${exercise.gaps.length} Lücken`}`, true))}
      <div class="gap-fields">
        ${exercise.gaps.map((g, i) => html`<div class="gap-field" data-gap="${g.id}">
          <div class="gap-label"><label for="answer-${g.id}"><span class="gap-number">${i + 1}</span>${g.label}</label><span class="gap-state label" id="state-${g.id}">Offen</span></div>
          <textarea id="answer-${g.id}" class="answer-input${g.multiline ? ' multiline' : ''}" data-answer="${g.id}" rows="${g.multiline ? 4 : 1}" spellcheck="false" autocapitalize="off" autocomplete="off" maxlength="12000" placeholder="${g.multiline ? 'Code eingeben …' : 'Fehlenden Code eingeben …'}" aria-describedby="state-${g.id}">${answers[g.id] ?? ''}</textarea>
          ${g.hint ? html`<details class="gap-hint"><summary>Hinweis zu ${i + 1}</summary><p>${raw(g.hint)}</p></details>` : ''}
        </div>`)}
      </div>
      <p class="check-note">Jede Lücke wird beim Tippen geprüft – tokenweise, Leerzeichen zwischen Symbolen sind egal. Es wird kein Compiler ausgeführt.</p>`.value,
    solution: () => html`<ol class="solution-list">${exercise.gaps.map((g) => html`<li><code>${g.answers[0]}</code>${g.answers.length > 1 ? html` <span class="muted">(auch: ${g.answers.slice(1).map((a, i) => html`${i ? ', ' : ''}<code>${a}</code>`)})</span>` : ''}</li>`)}</ol>`.value,
    bind(root) {
      const update = () => {
        let solved = 0, attempted = false;
        for (const g of exercise.gaps) {
          const value = answers[g.id] ?? '';
          const right = isGapCorrect(g, value, exercise.lang);
          const partial = !right && isPartial(g, value);
          const wrong = !!value.trim() && !right && !partial;
          if (right) solved++;
          if (value.trim()) attempted = true;
          const input = $<HTMLTextAreaElement>(`#answer-${g.id}`, root);
          input.classList.toggle('correct', right);
          input.classList.toggle('incorrect', wrong);
          input.setAttribute('aria-invalid', String(wrong));
          const state = $(`#state-${g.id}`, root);
          state.textContent = right ? '✓ Richtig' : value.trim() ? partial ? 'In Arbeit' : 'Noch nicht richtig' : 'Offen';
          state.className = `gap-state label${right ? ' ok' : wrong ? ' bad' : ''}`;
          root.querySelector(`[data-gap-link="${g.id}"]`)?.classList.toggle('solved', right);
        }
        if (isGapExerciseCorrect(exercise, answers)) ctx.complete();
        else ctx.feedback(attempted ? 'partial' : 'info', attempted ? `${solved} von ${exercise.gaps.length} Lücken richtig.` : 'Fülle die Lücken. Nummern im Code springen zum Eingabefeld.');
      };
      $$<HTMLTextAreaElement>('[data-answer]', root).forEach((input) => input.addEventListener('input', () => {
        answers[input.dataset.answer!] = input.value;
        ctx.save({ ...answers });
        update();
      }));
      $$<HTMLAnchorElement>('[data-gap-link]', root).forEach((link) => link.addEventListener('click', (event) => {
        event.preventDefault();
        $<HTMLTextAreaElement>(`#answer-${link.dataset.gapLink}`, root).focus();
      }));
      update();
    },
  };
};

export const choice: ExerciseRenderer<ChoiceExercise, number[]> = (exercise, ctx) => {
  let selected = [...(ctx.draft ?? [])];
  const letters = 'ABCDEFGH';
  return {
    markup: html`
      ${exercise.code ? raw(codeCard(exercise.code, exercise.lang, langName(exercise.lang))) : ''}
      <fieldset class="choices">
        <legend class="label">${exercise.multiple ? 'Mehrere Antworten sind richtig' : 'Genau eine Antwort ist richtig'}</legend>
        ${exercise.options.map((o, i) => html`<div class="choice-wrap"><button type="button" class="choice" role="${exercise.multiple ? 'checkbox' : 'radio'}" aria-checked="${selected.includes(i)}" data-option="${i}"><span class="choice-letter">${letters[i]}</span><span class="choice-text">${raw(o.html)}</span></button><p class="choice-why" id="why-${i}" hidden></p></div>`)}
      </fieldset>
      <div class="exercise-actions"><button type="button" class="btn primary" id="check">Antwort prüfen</button></div>`.value,
    solution: () => html`<ul class="solution-list">${exercise.options.filter((o) => o.correct).map((o) => html`<li>${raw(o.html)}${o.why ? html` – <span class="muted">${raw(o.why)}</span>` : ''}</li>`)}</ul>`.value,
    bind(root) {
      const buttons = $$<HTMLButtonElement>('[data-option]', root);
      const paint = (checked = false) => buttons.forEach((b) => {
        const i = Number(b.dataset.option);
        const on = selected.includes(i);
        b.setAttribute('aria-checked', String(on));
        b.classList.remove('correct', 'incorrect', 'missed');
        const why = $(`#why-${i}`, root);
        why.hidden = true;
        if (!checked) return;
        const option = exercise.options[i];
        if (on) { b.classList.add(option.correct ? 'correct' : 'incorrect'); if (option.why) { why.hidden = false; why.innerHTML = `<strong>${option.correct ? 'Richtig:' : 'Falsch:'}</strong> ${option.why}`; } }
        else if (option.correct && ctx.done) b.classList.add('missed');
      });
      buttons.forEach((b) => b.addEventListener('click', () => {
        const i = Number(b.dataset.option);
        selected = exercise.multiple ? (selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i]) : [i];
        ctx.save(selected);
        paint();
        ctx.feedback('info', 'Auswahl geändert – prüfe erneut.');
      }));
      $('#check', root).addEventListener('click', () => {
        if (!selected.length) { ctx.feedback('bad', 'Wähle zuerst eine Antwort.'); return; }
        paint(true);
        if (isChoiceCorrect(exercise, selected)) ctx.complete();
        else {
          const wrong = selected.filter((i) => !exercise.options[i].correct).length;
          const missing = exercise.options.filter((o, i) => o.correct && !selected.includes(i)).length;
          ctx.feedback('bad', wrong ? `${wrong === 1 ? 'Eine Auswahl ist' : `${wrong} Auswahlen sind`} falsch – lies die Begründung und versuch es noch einmal.` : `Richtig, aber unvollständig: ${missing === 1 ? 'eine richtige Antwort fehlt' : `${missing} richtige Antworten fehlen`}.`);
        }
      });
      paint(ctx.done && isChoiceCorrect(exercise, selected));
    },
  };
};

export const output: ExerciseRenderer<OutputExercise, string> = (exercise, ctx) => ({
  markup: html`
    ${raw(codeCard(exercise.code, exercise.lang, `${langName(exercise.lang)} · Programm`))}
    <label class="field-label label" for="prediction">Deine Vorhersage der Ausgabe</label>
    <textarea id="prediction" class="answer-input multiline" rows="${Math.max(2, exercise.expected[0].split('\n').length + 1)}" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Genau so, wie es im Terminal stünde …">${ctx.draft ?? ''}</textarea>
    <div class="exercise-actions"><button type="button" class="btn primary" id="check">Vorhersage prüfen</button><span class="muted small">Strg + Enter</span></div>
    <div id="diff" class="diff" hidden></div>`.value,
  solution: () => `<pre class="code plain">${escape(exercise.expected[0])}</pre>`,
  bind(root) {
    const input = $<HTMLTextAreaElement>('#prediction', root);
    const check = () => {
      if (!input.value.trim()) { ctx.feedback('bad', 'Schreib zuerst deine Vorhersage.'); return; }
      const diff = $('#diff', root);
      if (isOutputCorrect(exercise, input.value)) { diff.hidden = true; ctx.complete(); return; }
      const expected = normalizeOutput(exercise.expected[0]).split('\n');
      const actual = normalizeOutput(input.value).split('\n');
      const lines = Math.max(expected.length, actual.length);
      let firstWrong = -1;
      for (let i = 0; i < lines; i++) if (expected[i] !== actual[i]) { firstWrong = i; break; }
      diff.hidden = false;
      diff.innerHTML = html`<p class="label">Zeilenvergleich</p><ol>${Array.from({ length: lines }, (_, i) => html`<li class="${i === firstWrong ? 'bad' : i < firstWrong ? 'ok' : 'unknown'}"><code>${actual[i] ?? '∅ (fehlt)'}</code></li>`)}</ol>`.value;
      ctx.feedback('bad', `${expected.length !== actual.length ? `Erwartet werden ${expected.length} Zeile${expected.length === 1 ? '' : 'n'}, du hast ${actual.length}. ` : ''}${firstWrong >= 0 ? `Ab Zeile ${firstWrong + 1} weicht deine Vorhersage ab.` : ''} Geh den Code Zeile für Zeile durch.`);
    };
    input.addEventListener('input', () => ctx.save(input.value));
    input.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); check(); } });
    $('#check', root).addEventListener('click', check);
    if (ctx.done) ctx.feedback('ok', 'Bereits gelöst.');
  },
});

type CommandDraft = { value: string; history: string[] };
export const command: ExerciseRenderer<CommandExercise, CommandDraft> = (exercise, ctx) => {
  const draft: CommandDraft = { value: ctx.draft?.value ?? '', history: [...(ctx.draft?.history ?? [])] };
  return {
    markup: html`
      ${exercise.context ? html`<div class="context prose compact"><p class="label">Ausgangslage</p>${raw(exercise.context)}</div>` : ''}
      <div class="terminal">
        <div class="codeblock-bar"><span>Terminal</span></div>
        <div class="terminal-body">
          <div id="history">${draft.history.map((line) => html`<div class="term-line"><span class="syntax-prompt">${exercise.symbol} </span>${line}</div><div class="term-line term-bad">✗ nicht die gesuchte Lösung</div>`)}</div>
          <form id="command-form" class="term-input"><label for="command" class="syntax-prompt">${exercise.symbol}</label><input id="command" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" value="${draft.value}" aria-label="Befehl eingeben, Enter prüft"></form>
          <pre id="term-output" class="term-output" hidden></pre>
        </div>
      </div>
      <p class="check-note">Enter prüft. Gebündelte Kurzoptionen (<code>-la</code> = <code>-l -a</code>) und einfache Anführungszeichen sind egal. Es wird nichts ausgeführt.</p>`.value,
    solution: () => html`<ul class="solution-list">${exercise.answers.map((a) => html`<li><code>${a}</code></li>`)}</ul>`.value,
    bind(root) {
      const input = $<HTMLInputElement>('#command', root);
      const out = $('#term-output', root);
      const showOutput = () => { if (exercise.output) { out.hidden = false; out.textContent = exercise.output; } };
      input.addEventListener('input', () => { draft.value = input.value; ctx.save(draft); });
      $('#command-form', root).addEventListener('submit', (event) => {
        event.preventDefault();
        const value = input.value.trim();
        if (!value) return;
        if (isCommandCorrect(exercise, value)) { showOutput(); ctx.complete(); return; }
        draft.history = [...draft.history, value].slice(-6);
        ctx.save(draft);
        $('#history', root).insertAdjacentHTML('beforeend', html`<div class="term-line"><span class="syntax-prompt">${exercise.symbol} </span>${value}</div><div class="term-line term-bad">✗ nicht die gesuchte Lösung</div>`.value);
        ctx.feedback('bad', 'Noch nicht. Prüfe Befehl, Optionen und Argumente – und nutze bei Bedarf einen Hinweis.');
      });
      if (ctx.done && isCommandCorrect(exercise, draft.value)) showOutput();
    },
  };
};
export { icons };
