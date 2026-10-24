// Tutor panel under the hints of an exercise (LRN-6). The learner escalates the levels himself; the chat lives only in
// this page's memory. Invisible without configuration, offline, in the offline reading mode and for own texts.
import { askTutor, onStorageChange, tutorReachable, watchTutor } from '../app.ts';
import type { Exercise, Module, TocEntry } from '../content/types.ts';
import { LEVEL_NAMES, tutorAllowed, type TutorLevel, type TutorReply, type TutorStatus } from '../engine/tutor.ts';
import { leakRule, tutorRequest } from '../engine/tutor-context.ts';
import { $, escape, html } from './dom.ts';

const inline = (text: string) => text
  .replace(/`([^`\n]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g, '<a class="external-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
/** The small Markdown subset the tutor writes: paragraphs, lists, code, bold, https links. Everything else is escaped. */
export function tutorMarkup(text: string): string {
  const out: string[] = [];
  const blocks = escape(text.trim()).split(/\n?```[^\n]*\n?/);
  blocks.forEach((block, i) => {
    if (i % 2) { out.push(`<pre class="code plain"><code>${block.replace(/\n$/, '')}</code></pre>`); return; }
    for (const paragraph of block.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
      const lines = paragraph.split('\n');
      if (lines.every((line) => /^\s*[-*] /.test(line))) out.push(`<ul>${lines.map((line) => `<li>${inline(line.replace(/^\s*[-*] /, ''))}</li>`).join('')}</ul>`);
      else if (lines.every((line) => /^\s*\d+\. /.test(line))) out.push(`<ol>${lines.map((line) => `<li>${inline(line.replace(/^\s*\d+\. /, ''))}</li>`).join('')}</ol>`);
      else out.push(`<p>${lines.map(inline).join('<br>')}</p>`);
    }
  });
  return out.join('');
}

/** Turns the first mention of each lesson section into a link to it (level 2 names the section). */
function linkSections(element: HTMLElement, toc: TocEntry[], href: string): void {
  for (const entry of [...toc].filter((e) => e.title.length >= 4).sort((a, b) => b.title.length - a.title.length)) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const at = node.data.indexOf(entry.title);
      if (at < 0 || node.parentElement?.closest('a, code, pre')) continue;
      const match = node.splitText(at);
      match.splitText(entry.title.length);
      const link = document.createElement('a');
      link.href = `${href}#${entry.id}`;
      link.textContent = entry.title;
      match.replaceWith(link);
      break;
    }
  }
}

const dollars = (micros: number) => (micros / 1_000_000).toLocaleString('de-DE', { style: 'currency', currency: 'USD' });
const nextMonth = (month: string) => {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 1)).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', timeZone: 'UTC' });
};
/** Monthly usage for /daten. */
export function tutorUsageText(status: TutorStatus): string {
  if (!status.enabled) return status.problem ? `Der Tutor ist ausgeschaltet: ${status.problem}` : '';
  const month = new Date(`${status.month}-01T00:00:00Z`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `${month}: ${dollars(status.spentMicros)} von ${dollars(status.budgetMicros)} verbraucht, ${status.requests} ${status.requests === 1 ? 'Anfrage' : 'Anfragen'} (${status.model}).${status.exhausted ? ` Der Tutor pausiert bis zum ${nextMonth(status.month)}.` : ''}`;
}

const FAILURES: Record<Exclude<TutorReply, { ok: true }>['reason'], string> = {
  disabled: 'Der Tutor ist gerade ausgeschaltet.',
  budget: 'Das Monatsbudget des Tutors reicht für diese Anfrage nicht mehr.',
  not_allowed: 'Bei eigenen Texten hilft der Tutor nicht.',
  too_large: 'Diese Übung ist zu groß für den Tutor.',
  leak: 'Der Tutor hat keinen Hinweis ohne die Lösung gefunden.',
  refusal: 'Der Tutor hat diese Anfrage abgelehnt.',
  truncated: 'Die Antwort wurde zu lang und abgebrochen. Versuch es noch einmal.',
  provider: 'Der Tutor ist gerade nicht erreichbar. Versuch es später noch einmal.',
};

export type TutorHooks = {
  areaId: string;
  module: Module;
  exercise: Exercise;
  lessonHref: string;
  draft(): unknown;
  /** Solved or solution shown. */
  done(): boolean;
  /** What the page reported after the last check. */
  feedback(): string;
  /** Opens the next static hint; false when there is none left. */
  staticHint(): boolean;
};

export function mountTutor(after: Element, hooks: TutorHooks): { refresh(): void; cleanup(): void } {
  const allowed = tutorAllowed(hooks.exercise.type, leakRule(hooks.exercise));
  const section = document.createElement('section');
  section.id = 'tutor';
  section.className = 'tutor';
  section.hidden = true;
  section.setAttribute('aria-labelledby', 'tutor-title');
  section.innerHTML = html`
    <div class="tutor-head"><p class="label" id="tutor-title">Tutor</p><p class="muted small" id="tutor-intro"></p></div>
    <p class="tutor-budget small" id="tutor-budget" hidden></p>
    <ol class="tutor-answers" id="tutor-answers" aria-live="polite"></ol>
    <form class="tutor-form" id="tutor-form">
      <label class="small" for="tutor-question" id="tutor-question-label"></label>
      <textarea id="tutor-question" class="answer-input prose-input" rows="2" maxlength="1000" spellcheck="true" autocapitalize="sentences"></textarea>
      <div class="tutor-actions"><button type="submit" class="btn small" id="tutor-ask"></button><span class="muted small" id="tutor-state" role="status"></span></div>
    </form>
    <p class="muted small tutor-privacy">Geht an Anthropic: Lektion, Übung samt Lösung, dein Versuch und deine Frage. Die Plattform speichert davon nur Token-Zähler und Kosten.</p>`.value;
  after.after(section);

  let status: TutorStatus | null = null;
  let next: TutorLevel = 1;
  let pending = false;
  let mounted = true;
  const answers: string[] = [];
  const form = $<HTMLFormElement>('#tutor-form', section);
  const question = $<HTMLTextAreaElement>('#tutor-question', section);
  const button = $<HTMLButtonElement>('#tutor-ask', section);
  const state = (text: string) => { $('#tutor-state', section).textContent = text; };

  const refresh = () => {
    if (!mounted) return;
    section.hidden = !(allowed && status?.enabled && tutorReachable());
    if (section.hidden || !status?.enabled) return;
    const done = hooks.done();
    const budget = $('#tutor-budget', section);
    budget.hidden = !status.warn && !status.exhausted;
    budget.className = `tutor-budget small${status.exhausted ? ' exhausted' : ''}`;
    budget.textContent = status.exhausted
      ? `Pausiert bis zum ${nextMonth(status.month)}: Das Monatsbudget von ${dollars(status.budgetMicros)} ist verbraucht.`
      : `${dollars(status.spentMicros)} von ${dollars(status.budgetMicros)} Monatsbudget verbraucht.`;
    form.hidden = status.exhausted;
    $('#tutor-intro', section).textContent = done ? 'Lösung bekannt: Jetzt beantwortet er jede Frage zur Übung.' : 'Hilft in drei Stufen, ohne die Lösung zu verraten.';
    $('#tutor-question-label', section).textContent = done ? 'Deine Frage' : 'Was hakt? (freiwillig)';
    question.placeholder = done ? 'Warum ist das so? Was wäre, wenn …?' : 'Zum Beispiel: Ich verstehe die Fehlermeldung nicht.';
    button.textContent = pending ? 'Tutor denkt nach …' : done ? 'Fragen' : `Tutor fragen · Stufe ${next}: ${LEVEL_NAMES[next]}`;
    button.disabled = pending;
  };

  const show = (label: string, text: string) => {
    const item = document.createElement('li');
    item.innerHTML = `<p class="label">${escape(label)}</p><div class="prose compact">${tutorMarkup(text)}</div>`;
    linkSections(item, hooks.module.toc, hooks.lessonHref);
    $('#tutor-answers', section).append(item);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending || !status?.enabled) return;
    const done = hooks.done();
    if (done && !question.value.trim()) { state('Schreib zuerst deine Frage.'); question.focus(); return; }
    const level = next;
    pending = true; state(''); refresh();
    let reply: TutorReply;
    try {
      reply = await askTutor(tutorRequest({
        areaId: hooks.areaId, module: hooks.module, exercise: hooks.exercise, draft: hooks.draft(), done,
        feedback: hooks.feedback(), previous: answers.slice(-3), question: question.value, level,
      }));
    } catch { reply = { ok: false, reason: 'provider' }; }
    pending = false;
    if (!mounted) return;
    if (reply.ok) {
      answers.push(reply.text);
      show(done ? 'Antwort' : `Stufe ${level} · ${LEVEL_NAMES[level]}`, reply.text);
      if (!done && next < 3) next = (next + 1) as TutorLevel;
      question.value = '';
    } else if (reply.reason === 'leak') {
      state(`${FAILURES.leak} ${hooks.staticHint() ? 'Oben steht stattdessen der nächste Hinweis der Übung.' : 'Nutze die Hinweise oder „Lösung zeigen“.'}`);
    } else state(FAILURES[reply.reason]);
    refresh();
  });

  const stopStatus = watchTutor((value) => { status = value; refresh(); });
  const stopStorage = onStorageChange(refresh);
  window.addEventListener('online', refresh);
  window.addEventListener('offline', refresh);
  return {
    refresh,
    cleanup() {
      mounted = false; stopStatus(); stopStorage();
      window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh);
    },
  };
}
