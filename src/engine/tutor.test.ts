import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadContent } from '../../tooling/content.ts';
import type { Exercise } from '../content/types.ts';
import {
  AREA_RULES, answerCore, buildPrompt, costMicros, leaksSolution, mentionedLines, tutorAllowed, tutorConfig, tutorRequestProblem, tutorStatus, usageMonth, worstCaseMicros,
  TUTOR_MAX_TOKENS, type TutorRequest,
} from './tutor.ts';
import { attemptText, exerciseText, htmlToText, leakRule, tutorRequest } from './tutor-context.ts';
import { tokens } from './answers.ts';

const area = loadContent(undefined, join(import.meta.dirname, '../../tooling/fixtures')).areas.beispiel;
const all = area.modules['alle-typen'];
const texts = area.modules.texte;
const exercise = (id: string): Exercise => [...all.exercises, ...texts.exercises].find((e) => e.id === id)!;
const leaks = (id: string, answer: string) => leaksSolution(answer, leakRule(exercise(id)));
const request = (overrides: Partial<Parameters<typeof tutorRequest>[0]> = {}): TutorRequest => tutorRequest({
  areaId: 'beispiel', module: all, exercise: exercise('alle-typen/lueckentext'), draft: { g1: 'fun', g2: 'x + x' }, done: false, feedback: '', previous: [], question: '', level: 1, ...overrides,
});
afterEach(() => { vi.useRealTimers(); });

describe('solution check before an answer is shown', () => {
  it('flags a gap exercise only when every gap is answered', () => {
    expect(leaks('alle-typen/lueckentext', 'Schreib `def doppelt(x):` und gib `x * 2` zurück.')).toBe(true);
    expect(leaks('alle-typen/lueckentext', 'Du kannst auch `2 * x` zurückgeben, nach `def`.')).toBe(true);
    expect(leaks('alle-typen/lueckentext', 'Funktionen beginnen mit `def`. Was soll die Funktion zurückgeben?')).toBe(false);
    expect(leaks('alle-typen/lueckentext', 'Welches Schlüsselwort leitet in Python eine Funktion ein?')).toBe(false);
  });
  it('flags a choice when all correct options are named, not when the wrong one is discussed', () => {
    expect(leaks('alle-typen/auswahl', 'Richtig sind `tuple` und `str`.')).toBe(true);
    expect(leaks('alle-typen/auswahl', '`list` lässt sich mit `append` verändern. Was gilt für `tuple`?')).toBe(false);
  });
  it('flags the full order but not the lines in the learner’s order', () => {
    const lines = (exercise('alle-typen/reihenfolge') as Extract<Exercise, { type: 'order' }>).lines;
    expect(leaks('alle-typen/reihenfolge', `So stimmt es:\n\`\`\`python\n${lines.join('\n')}\n\`\`\``)).toBe(true);
    expect(leaks('alle-typen/reihenfolge', `Deine Reihenfolge:\n${[lines[2], lines[1], lines[0], lines[3], lines[4]].join('\n')}\nWas muss es geben, bevor du \`pfad\` öffnest?`)).toBe(false);
  });
  it('flags a predicted output written out, also line by line in prose', () => {
    expect(leaks('alle-typen/ausgabe', 'Die Ausgabe ist\n```\n[1, 2, 3]\n[3, 1, 2]\n```')).toBe(true);
    expect(leaks('alle-typen/ausgabe', 'Zuerst kommt [1, 2, 3], danach [3, 1, 2].')).toBe(true);
    expect(leaks('alle-typen/ausgabe', 'Verändert `sorted` die Liste `werte` oder liefert es eine neue?')).toBe(false);
  });
  it('leaves outputs too short to recognise unchecked', () => {
    expect(leaks('alle-typen/rust-ausgabe', 'Am Ende steht 10 da.')).toBe(false);
  });
  it('compares commands like the terminal exercise does', () => {
    expect(leaks('alle-typen/terminal', 'Probier `ls -al`.')).toBe(true);
    expect(leaks('alle-typen/terminal', 'Mit `ls` allein siehst du keine versteckten Dateien. Welche Option zeigt sie?')).toBe(false);
  });
  it('ignores what the starter code already shows', () => {
    expect(leaks('alle-typen/python-code', 'Es reicht `return len(text.split())`.')).toBe(true);
    expect(leaks('alle-typen/python-code', 'Die Signatur `def zaehle_woerter(text: str) -> int:` steht schon. Was liefert `split()`?')).toBe(false);
  });
  it('flags a corrected line of a bug exercise, even when only the changed part is quoted', () => {
    expect(leaks('alle-typen/fehler-finden', 'Ändere die Schleife zu `range(n + 1)`.')).toBe(true);
    expect(leaks('alle-typen/fehler-finden', 'Welche Zahlen liefert `range(n)` für `n = 3`?')).toBe(false);
  });
  it('flags naming all faulty lines when a bug exercise has no fixes', () => {
    expect(leaks('texte/zeile-finden', 'Schau dir Zeile 3 an.')).toBe(true);
    expect(leaks('texte/zeile-finden', 'Prüfe Zeile 1 und 2: Wer weiß dort was?')).toBe(false);
    expect([...mentionedLines('Zeilen 2, 4 und 7 sowie Zeile 9')]).toEqual([2, 4, 7, 9]);
  });
  it('flags an SQL solution beyond its starter', () => {
    expect(leaks('alle-typen/sql-abfrage', 'SELECT region, SUM(betrag) AS umsatz FROM bestellungen GROUP BY region ORDER BY umsatz DESC')).toBe(true);
    expect(leaks('alle-typen/sql-abfrage', 'Du brauchst eine Aggregatfunktion und `GROUP BY`.')).toBe(false);
  });
  it('keeps tiny differences checkable with their neighbours', () => {
    const answer = tokens('for i in range(n + 1):', 'python');
    expect(answerCore(answer, tokens('    for i in range(n):', 'python')).join(' ')).toBe('n + 1 )');
    expect(answerCore(answer, [])).toEqual(answer);
  });
});

describe('prompt', () => {
  const prefix = (r: TutorRequest) => JSON.stringify([buildPrompt(r).system, buildPrompt(r).messages[0].content.slice(0, 2)]);
  it('keeps everything before the cache breakpoints byte-identical across attempts, levels, questions and time', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-24T08:00:00Z'));
    const first = prefix(request());
    vi.setSystemTime(new Date('2027-01-01T23:59:00Z'));
    const second = prefix(request({ draft: { g1: 'def', g2: '' }, level: 3, question: 'Warum?', previous: ['Erster Hinweis'], feedback: 'Noch nicht richtig.', done: true }));
    expect(second).toBe(first);
  });
  it('orders system prompt, lesson, exercise with solution, then the variable part with the level', () => {
    const { system, messages } = buildPrompt(request({ level: 2 }));
    const [lesson, ex, variable] = messages[0].content;
    expect(system[0].text).toContain('Stufe 1, Denkanstoß');
    expect(lesson.text.startsWith('<lektion>\n# Alle Übungsarten')).toBe(true);
    expect(ex.text).toContain('--- Nur für dich, bis die Übung gelöst ist ---');
    expect(ex.text).toContain('`x * 2` oder `2 * x`');
    expect([lesson.cache_control, ex.cache_control, variable.cache_control]).toEqual([{ type: 'ephemeral' }, { type: 'ephemeral' }, undefined]);
    expect(variable.text).toContain('Die Übung ist noch nicht gelöst.');
    expect(variable.text).toContain('g1: `fun`');
    expect(variable.text).toContain('<anfrage>\nStufe 2, Konzept');
    expect(buildPrompt(request(), true).messages[0].content[2].text).toContain('wurde verworfen');
  });
  it('adds the learner’s rules for narrative and combat to the system prompt only there', () => {
    expect(buildPrompt(request({ areaId: 'narrative' })).system[0].text).toContain(AREA_RULES.narrative);
    expect(buildPrompt(request({ areaId: 'combat' })).system[0].text).toContain(AREA_RULES.combat);
    expect(buildPrompt(request()).system[0].text).not.toContain('Plotideen');
  });
  it('sends learning content only', () => {
    expect(Object.keys(request()).sort()).toEqual(['areaId', 'attempt', 'done', 'exercise', 'feedback', 'kind', 'leak', 'lesson', 'level', 'previous', 'question']);
    expect(JSON.stringify(buildPrompt(request()))).not.toContain('alle-typen/lueckentext');
  });
});

describe('limits and rules', () => {
  it('rejects oversized parts and a free question without text', () => {
    expect(tutorRequestProblem(request())).toBeNull();
    expect(tutorRequestProblem({ ...request(), lesson: { title: 'x', text: 'a'.repeat(60_001) } })).toBe('lesson');
    expect(tutorRequestProblem({ ...request(), previous: ['a', 'b', 'c', 'd'] })).toBe('previous');
    expect(tutorRequestProblem(request({ done: true }))).toBe('question');
    expect(tutorRequestProblem(request({ done: true, question: 'Warum `def`?' }))).toBeNull();
  });
  it('offers no tutor for own texts without a model solution', () => {
    expect(tutorAllowed('practice', leakRule(exercise('texte/eigener-text')))).toBe(false);
    expect(tutorAllowed('practice', leakRule(exercise('alle-typen/praxis')))).toBe(true);
    expect(tutorAllowed('explain', leakRule(exercise('texte/wirkung')))).toBe(true);
  });
});

describe('configuration, cost and budget', () => {
  it('is off without a key and uses the proposed defaults otherwise', () => {
    expect(tutorConfig({})).toEqual({ enabled: false, problem: null });
    expect(tutorConfig({ ANTHROPIC_API_KEY: ' ' })).toEqual({ enabled: false, problem: null });
    expect(tutorConfig({ ANTHROPIC_API_KEY: 'test-key' })).toEqual({ enabled: true, apiKey: 'test-key', model: 'claude-sonnet-5-5', effort: 'medium', budgetMicros: 5_000_000 });
    expect(tutorConfig({ ANTHROPIC_API_KEY: 'k', TUTOR_MODEL: 'claude-haiku-5-5', TUTOR_EFFORT: 'low', TUTOR_MONTHLY_BUDGET_USD: '7.50' })).toMatchObject({ model: 'claude-haiku-5-5', effort: 'low', budgetMicros: 7_500_000 });
  });
  it('turns itself off for values it cannot account for', () => {
    expect(tutorConfig({ ANTHROPIC_API_KEY: 'k', TUTOR_MODEL: 'gpt-6-luna' })).toMatchObject({ enabled: false, problem: expect.stringContaining('unbekannt') });
    expect(tutorConfig({ ANTHROPIC_API_KEY: 'k', TUTOR_EFFORT: 'max' })).toMatchObject({ enabled: false });
    for (const budget of ['0', '-1', '5,00', 'abc', '501']) expect(tutorConfig({ ANTHROPIC_API_KEY: 'k', TUTOR_MONTHLY_BUDGET_USD: budget })).toMatchObject({ enabled: false });
  });
  it('prices every token kind separately, in micro-dollars', () => {
    const usage = { input: 2000, cacheWrite: 0, cacheRead: 8000, output: 500 };
    expect(costMicros('claude-sonnet-5-5', usage)).toBe(2000 * 2 + 8000 * 0.1 + 500 * 10);
    expect(costMicros('claude-haiku-5-5', usage)).toBe(Math.ceil(2000 * 0.1 + 8000 * 0.01 + 500 * 0.5));
    expect(costMicros('claude-sonnet-5-5', { input: 0, cacheWrite: 8000, cacheRead: 0, output: 0 })).toBe(20_000);
    expect(worstCaseMicros('claude-sonnet-5-5', 30_000)).toBe(30_000 * 2.5 + TUTOR_MAX_TOKENS * 10);
  });
  it('warns at 80 % and pauses when not even a short answer fits', () => {
    const config = tutorConfig({ ANTHROPIC_API_KEY: 'k' });
    expect(tutorStatus(config, '2026-10', 3_000_000, 10)).toMatchObject({ warn: false, exhausted: false });
    expect(tutorStatus(config, '2026-10', 4_000_000, 10)).toMatchObject({ warn: true, exhausted: false });
    expect(tutorStatus(config, '2026-10', 4_990_000, 10)).toMatchObject({ warn: true, exhausted: true });
    expect(usageMonth(new Date('2026-10-31T23:30:00Z'))).toBe('2026-10');
  });
});

describe('exercise as text', () => {
  it('decodes rendered Markdown', () => {
    expect(htmlToText('<p>A &amp; B &lt;3&#39;</p><ul><li>eins</li><li><code>zwei</code></li></ul>')).toBe("A & B <3'\n\n- eins\n- zwei");
  });
  it('describes every exercise type and keeps the solution after the marker', () => {
    for (const e of [...all.exercises, ...texts.exercises]) {
      const text = exerciseText(e);
      expect(text, e.id).toContain(`Art: ${e.type}`);
      expect(text.indexOf('--- Nur für dich'), e.id).toBeGreaterThan(text.indexOf('Aufgabe:'));
    }
  });
  it('shows the learner’s draft in each renderer’s shape', () => {
    expect(attemptText(exercise('alle-typen/auswahl'), [1])).toBe('Gewählt:\n2. list');
    expect(attemptText(exercise('alle-typen/terminal'), { value: 'ls -l', history: ['ls'] })).toContain('Frühere falsche Versuche:\n- `ls`');
    expect(attemptText(exercise('alle-typen/fehler-finden'), { selected: [2], found: false, fixes: {} })).toBe('Markiert: Zeile 2 (`total = 0`)');
    expect(attemptText(exercise('alle-typen/erklaeren'), { text: 'Es speichert Ergebnisse.', revealed: false, checked: [] })).toContain('Es speichert Ergebnisse.');
    expect(attemptText(exercise('alle-typen/lueckentext'), undefined)).toBe('');
    expect(attemptText(exercise('alle-typen/linux-szenario'), undefined)).toContain('nicht übermittelt');
  });
});
