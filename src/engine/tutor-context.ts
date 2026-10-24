// Turns an exercise, its lesson and the learner's draft into the plain text the tutor receives (src/engine/tutor.ts).
// Deterministic and without DOM, so the exercise page and the eval harness build byte-identical prompts.
import type { Answers, Exercise, Module } from '../content/types.ts';
import { assemble } from './answers.ts';
import type { LeakGroup, LeakRule, TutorRequest } from './tutor.ts';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '' };
/** Rendered Markdown (trusted build-time HTML) as readable text: blocks on their own lines, entities decoded. */
export function htmlToText(source: string): string {
  return source
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|pre|h[1-6]|ul|ol|table|tr|blockquote|section|aside|details|summary)>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => name[0] === '#'
      ? String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1)))
      : ENTITIES[name.toLowerCase()] ?? entity)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const numbered = (code: string) => code.split('\n').map((line, i) => `${String(i + 1).padStart(3)} | ${line}`).join('\n');
const fence = (code: string, lang = '') => `\`\`\`${lang}\n${code}\n\`\`\``;
const list = (items: string[]) => items.map((item, i) => `${i + 1}. ${item}`).join('\n');

/** The exercise as the learner sees it plus everything that is hidden until it is solved, marked as such. */
export function exerciseText(exercise: Exercise): string {
  const parts: string[] = [`Titel: ${exercise.title}`, `Art: ${exercise.type}`, `Aufgabe:\n${htmlToText(exercise.prompt)}`];
  const solution: string[] = [];
  switch (exercise.type) {
    case 'gap':
      parts.push(`Code mit Lücken (Sprache ${exercise.lang}, ⟦n⟧ ist Lücke gn):\n${fence(exercise.code, exercise.lang)}`);
      parts.push(`Lücken:\n${exercise.gaps.map((gap) => `- ${gap.id}${gap.label ? ` (${gap.label})` : ''}${gap.hint ? `, Hinweis: ${htmlToText(gap.hint)}` : ''}`).join('\n')}`);
      solution.push(`Akzeptierte Antworten:\n${exercise.gaps.map((gap) => `- ${gap.id}: ${gap.answers.map((a) => `\`${a}\``).join(' oder ')}`).join('\n')}`);
      break;
    case 'choice':
      if (exercise.code) parts.push(`Code (Sprache ${exercise.lang}):\n${fence(exercise.code, exercise.lang)}`);
      parts.push(`${exercise.multiple ? 'Mehrfachauswahl' : 'Eine Antwort ist richtig'}. Optionen:\n${list(exercise.options.map((o) => htmlToText(o.html)))}`);
      solution.push(`Bewertung der Optionen:\n${list(exercise.options.map((o) => `${o.correct ? 'richtig' : 'falsch'}: ${htmlToText(o.why)}`))}`);
      break;
    case 'order':
      parts.push(`Der Lernende bringt diese Zeilen (Sprache ${exercise.lang}) in die richtige Reihenfolge; er sieht sie gemischt.`);
      solution.push(`Richtige Reihenfolge:\n${fence(exercise.lines.join('\n'), exercise.lang)}${exercise.alternatives.length ? `\nWeitere akzeptierte Reihenfolgen: ${exercise.alternatives.length}` : ''}`);
      break;
    case 'output':
      parts.push(`Code (Sprache ${exercise.lang}), gefragt ist die Ausgabe:\n${fence(exercise.code, exercise.lang)}`);
      solution.push(`Erwartete Ausgabe:\n${exercise.expected.map((e) => fence(e)).join('\noder\n')}`);
      break;
    case 'command':
      if (exercise.context) parts.push(`Ausgangslage:\n${exercise.context}`);
      solution.push(`Akzeptierte Befehle:\n${exercise.answers.map((a) => `- \`${a}\``).join('\n')}${exercise.output ? `\nAusgabe danach:\n${fence(exercise.output)}` : ''}`);
      break;
    case 'code':
      parts.push(`Startcode (Python):\n${fence(exercise.starter, 'python')}`);
      parts.push(`Tests:\n${exercise.tests.map((t) => `# ${t.name}\n${t.code}`).join('\n\n')}`);
      solution.push(`Musterlösung:\n${fence(exercise.solution, 'python')}`);
      break;
    case 'practice':
      if (exercise.starter) parts.push(`Startcode (Sprache ${exercise.lang}):\n${fence(exercise.starter, exercise.lang)}`);
      parts.push(`Checkliste zur Selbstkontrolle:\n${list(exercise.checklist.map(htmlToText))}`);
      if (exercise.solution) solution.push(`Musterlösung:\n${fence(exercise.solution, exercise.lang)}`);
      break;
    case 'bug':
      parts.push(`Code mit Zeilennummern (Sprache ${exercise.lang}); der Lernende markiert fehlerhafte Zeilen${exercise.fixes.length ? ' und korrigiert sie' : ''}:\n${fence(numbered(exercise.code), exercise.lang)}`);
      solution.push(`Fehlerhafte Zeilen: ${exercise.lines.join(', ')}${exercise.fixes.length ? `\nAkzeptierte Korrekturen:\n${exercise.fixes.map((f) => `- Zeile ${f.line}: ${f.answers.map((a) => `\`${a}\``).join(' oder ')}`).join('\n')}` : ''}`);
      break;
    case 'explain':
      parts.push(`Zu erklären (Sprache ${exercise.lang}):\n${fence(exercise.code, exercise.lang)}`);
      solution.push(`Kernpunkte, die eine gute Erklärung enthält (der Lernende sieht sie erst nach seinem Text):\n${list(exercise.points.map(htmlToText))}`);
      break;
    case 'sql':
      parts.push(`Datenbank (${exercise.engine === 'postgres' ? 'PostgreSQL' : 'SQLite'}), Schema:\n${fence(exercise.schema, 'sql')}`);
      if (exercise.starter) parts.push(`Startcode:\n${fence(exercise.starter, 'sql')}`);
      solution.push(`Musterlösung:\n${fence(exercise.solution, 'sql')}${exercise.check ? `\nGeprüft wird mit:\n${fence(exercise.check, 'sql')}` : `\nVerglichen wird das Ergebnis${exercise.ordered ? ' mit Reihenfolge' : ' ohne Reihenfolge'}.`}`);
      break;
    case 'scenario':
      parts.push(`Linux-Szenario in einer VM. Geprüft wird der reparierte Zustand: ${exercise.checks.map((c) => c.name).join('; ')}.`);
      solution.push(`So wurde der Fehler eingebaut:\n${fence(exercise.setup, 'bash')}\nMusterlösung:\n${fence(exercise.solution, 'bash')}`);
      break;
  }
  if (exercise.hints.length) parts.push(`Statische Hinweise der Übung, vom Lernenden einzeln aufklappbar:\n${list(exercise.hints.map(htmlToText))}`);
  if (exercise.wiki) parts.push(`Zum Nachlesen (${exercise.wiki.title}):\n${htmlToText(exercise.wiki.body)}`);
  if (exercise.resources.length) parts.push(`Doku:\n${exercise.resources.map((r) => `- ${r.title}: ${r.url}`).join('\n')}`);
  solution.push(`Erklärung${exercise.type === 'explain' ? ' (Musterantwort)' : ''}:\n${htmlToText(exercise.explanation)}`);
  return `${parts.join('\n\n')}\n\n--- Nur für dich, bis die Übung gelöst ist ---\n\n${solution.join('\n\n')}`;
}

const quoted = (value: string | undefined) => value?.trim() ? fence(value) : '(leer)';
/** The current draft in the shape each renderer saves (src/exercises/*.ts). */
export function attemptText(exercise: Exercise, draft: unknown): string {
  if (draft === undefined || draft === null) return exercise.type === 'scenario' ? '(Die Arbeit im Terminal wird nicht übermittelt.)' : '';
  const d = draft as never;
  switch (exercise.type) {
    case 'gap': {
      const answers = d as Answers;
      return `${exercise.gaps.map((gap) => `${gap.id}: ${answers[gap.id]?.trim() ? `\`${answers[gap.id]}\`` : '(leer)'}`).join('\n')}\n\nCode mit diesen Eingaben:\n${fence(assemble(exercise, answers), exercise.lang)}`;
    }
    case 'choice': {
      const selected = (d as number[]).filter((i) => exercise.options[i]);
      return selected.length ? `Gewählt:\n${selected.map((i) => `${i + 1}. ${htmlToText(exercise.options[i].html)}`).join('\n')}` : '(nichts gewählt)';
    }
    case 'order': {
      const arrangement = (d as number[]).filter((i) => exercise.lines[i] !== undefined);
      return `Aktuelle Reihenfolge:\n${fence(arrangement.map((i) => exercise.lines[i]).join('\n'), exercise.lang)}`;
    }
    case 'output': return `Vorhergesagte Ausgabe:\n${quoted(d as string)}`;
    case 'command': {
      const { value, history } = d as { value?: string; history?: string[] };
      return `Eingabe: ${value?.trim() ? `\`${value}\`` : '(leer)'}${history?.length ? `\nFrühere falsche Versuche:\n${history.map((h) => `- \`${h}\``).join('\n')}` : ''}`;
    }
    case 'code': case 'sql': return fence(d as string, exercise.type === 'code' ? 'python' : 'sql');
    case 'practice': {
      const { code, checked } = d as { code?: string; checked?: number[] };
      return `Entwurf:\n${quoted(code)}${checked?.length ? `\nAbgehakt: ${checked.map((i) => i + 1).join(', ')}` : ''}`;
    }
    case 'bug': {
      const { selected, found, fixes } = d as { selected?: number[]; found?: boolean; fixes?: Record<string, string> };
      const lines = exercise.code.split('\n');
      const marked = (selected ?? []).filter((n) => lines[n - 1] !== undefined);
      return `${found ? 'Fehlerhafte Zeilen gefunden.' : marked.length ? `Markiert: ${marked.map((n) => `Zeile ${n} (\`${lines[n - 1].trim()}\`)`).join(', ')}` : 'Noch keine Zeile markiert.'}${found && fixes && Object.keys(fixes).length ? `\nKorrekturversuche:\n${Object.entries(fixes).map(([line, text]) => `- Zeile ${line}: \`${text}\``).join('\n')}` : ''}`;
    }
    case 'explain': return `Erklärung des Lernenden:\n${quoted((d as { text?: string }).text)}`;
    case 'scenario': return '(Die Arbeit im Terminal wird nicht übermittelt.)';
  }
}

const group = (answers: string[], given = '') => ({ answers, given });
const rule = (lang: string, groups: LeakGroup[], visible: string[], extra: Partial<LeakRule> = {}): LeakRule => ({ lang, groups, lines: [], lineTexts: [], options: [], visible: visible.filter(Boolean).join('\n\n'), ...extra });
/** Language of choice options: code options compare like code, everything else as running text. */
const optionLang = (lang: string) => lang && lang !== 'prose' ? lang : 'prose';
/**
 * Accepted solutions per type for the check in leaksSolution (src/engine/tutor.ts), plus the task as the learner sees
 * it. For a bug exercise the faulty lines count only while the learner has not found them yet.
 */
export function leakRule(exercise: Exercise, draft?: unknown): LeakRule {
  const prompt = htmlToText(exercise.prompt);
  switch (exercise.type) {
    case 'gap': return rule(exercise.lang, exercise.gaps.map((gap) => group(gap.answers)), [prompt, exercise.code]);
    case 'choice': {
      const correct = exercise.options.flatMap((o, i) => o.correct ? [i + 1] : []);
      return rule(optionLang(exercise.lang), exercise.options.filter((o) => o.correct).map((o) => group([htmlToText(o.html)])), [prompt, exercise.code ?? ''], { options: correct });
    }
    case 'order': {
      // Every line is on screen; the solution is the arrangement, so each pair of neighbours must appear in order.
      const orders = [exercise.lines.map((_, i) => i), ...exercise.alternatives];
      const pairs = exercise.lines.slice(1).map((_, i) => ({ answers: [...new Set(orders.map((o) => `${exercise.lines[o[i]]}\n${exercise.lines[o[i + 1]]}`))], given: '', exact: true }));
      return rule(exercise.lang, pairs, [prompt]);
    }
    case 'output': return rule('output', [group(exercise.expected)], [prompt, exercise.code]);
    case 'command': return rule('shell', [group(exercise.answers)], [prompt, exercise.context ? htmlToText(exercise.context) : '']);
    case 'code': return rule('python', [group([exercise.solution], exercise.starter)], [prompt, ...exercise.tests.map((t) => t.code)]);
    case 'practice': return rule(exercise.lang, exercise.solution ? [group([exercise.solution], exercise.starter)] : [], [prompt, ...exercise.checklist.map(htmlToText)]);
    case 'bug': {
      const lines = exercise.code.split('\n');
      const hidden = !(draft as { found?: boolean } | undefined)?.found;
      return rule(exercise.lang, exercise.fixes.map((fix) => group(fix.answers, lines[fix.line - 1] ?? '')), [prompt], hidden ? { lines: exercise.lines, lineTexts: exercise.lines.map((n) => lines[n - 1]?.trim() ?? '') } : {});
    }
    case 'explain': return rule('prose', exercise.points.map((point) => group([htmlToText(point)])), [prompt, exercise.code]);
    case 'sql': return rule('sql', [group([exercise.solution], exercise.starter)], [prompt, exercise.schema]);
    case 'scenario': return rule('shell', [group([exercise.solution])], [prompt]);
  }
}

export type TutorInput = { areaId: string; module: Pick<Module, 'title' | 'lesson'>; exercise: Exercise; draft: unknown; done: boolean; feedback: string; previous: string[]; question: string; level: TutorRequest['level'] };
export function tutorRequest(input: TutorInput): TutorRequest {
  const { exercise } = input;
  return {
    areaId: input.areaId,
    kind: exercise.type,
    level: input.level,
    done: input.done,
    lesson: { title: input.module.title, text: htmlToText(input.module.lesson) },
    exercise: exerciseText(exercise),
    attempt: attemptText(exercise, input.draft),
    feedback: input.feedback,
    previous: input.previous,
    question: input.question,
    leak: leakRule(exercise, input.draft),
  };
}
