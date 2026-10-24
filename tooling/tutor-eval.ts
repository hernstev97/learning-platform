// Eval for the LRN-6 tutor: 30 real exercises with typical wrong attempts (tooling/tutor-eval/cases.yaml), sent with
// exactly the prompts the app builds (src/engine/tutor*.ts). Model variants are compared on diagnosis, keeping the
// solution back, invented facts, rubric points, German and waiting time.
//
//   pnpm tutor:eval                       dry run: checks the cases and estimates the cost; no network, no key
//   pnpm tutor:eval --live --max-usd 2    calls the Claude API; needs ANTHROPIC_API_KEY and spends real money
//        [--variants sonnet-low,sonnet-medium,haiku-medium] [--out dir] [--only case-id,…]
//
// The live run writes results.jsonl and grading.md (answers side by side, columns for the human ratings) to --out.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { loadContent } from './content.ts';
import type { Exercise, Module } from '../src/content/types.ts';
import { isBugSelectionCorrect, isChoiceCorrect, isCommandCorrect, isGapExerciseCorrect, isOrderCorrect, isOutputCorrect } from '../src/engine/answers.ts';
import { buildPrompt, costMicros, leaksSolution, promptChars, tutorRequestProblem, worstCaseMicros, PRICES, TUTOR_MAX_TOKENS, type Effort, type TutorLevel, type TutorRequest } from '../src/engine/tutor.ts';
import { tutorRequest } from '../src/engine/tutor-context.ts';

export type EvalCase = { id: string; exercise: string; level: TutorLevel; attempt: unknown; feedback?: string; question?: string; focus: string; forbidden?: string[] };
export type Variant = { name: string; model: string; effort: Effort };
export const VARIANTS: Record<string, Variant> = {
  'sonnet-low': { name: 'sonnet-low', model: 'claude-sonnet-5-5', effort: 'low' },
  'sonnet-medium': { name: 'sonnet-medium', model: 'claude-sonnet-5-5', effort: 'medium' },
  'haiku-medium': { name: 'haiku-medium', model: 'claude-haiku-5-5', effort: 'medium' },
  'haiku-low': { name: 'haiku-low', model: 'claude-haiku-5-5', effort: 'low' },
};
export const DEFAULT_VARIANTS = ['sonnet-low', 'sonnet-medium', 'haiku-medium'];

const CASES = join(import.meta.dirname, 'tutor-eval/cases.yaml');
export const loadCases = (file = CASES): EvalCase[] => parse(readFileSync(file, 'utf8')) as EvalCase[];

export type Prepared = { case: EvalCase; exercise: Exercise; module: Module; request: TutorRequest };
/** Finds each exercise and builds the request like the exercise page does. Throws with every problem at once. */
export function prepare(cases: EvalCase[]): Prepared[] {
  const areas = loadContent([...new Set(cases.map((c) => c.exercise.split('/')[0]))]).areas;
  const problems: string[] = [];
  const ids = new Set<string>();
  const prepared = cases.flatMap((c): Prepared[] => {
    if (ids.has(c.id)) problems.push(`${c.id}: doppelte id`);
    ids.add(c.id);
    const [areaId, moduleId, exerciseId] = c.exercise.split('/');
    const module = areas[areaId]?.modules[moduleId];
    const exercise = module?.exercises.find((e) => e.id === `${moduleId}/${exerciseId}`);
    if (!module || !exercise) { problems.push(`${c.id}: Übung ${c.exercise} nicht gefunden`); return []; }
    if (![1, 2, 3].includes(c.level)) problems.push(`${c.id}: Stufe ${c.level}`);
    const wrong = attemptIsWrong(exercise, c.attempt);
    if (wrong !== true) problems.push(`${c.id}: ${wrong}`);
    const request = tutorRequest({ areaId, module, exercise, draft: c.attempt, done: false, feedback: c.feedback ?? '', previous: [], question: c.question ?? '', level: c.level });
    const problem = tutorRequestProblem(request);
    if (problem) problems.push(`${c.id}: Anfrage zu groß (${problem})`);
    return [{ case: c, exercise, module, request }];
  });
  if (problems.length) throw new Error(`Eval-Fälle fehlerhaft:\n${problems.join('\n')}`);
  return prepared;
}

/** True when the attempt has the renderer's draft shape and the platform's own check rejects it; else the reason. */
export function attemptIsWrong(exercise: Exercise, attempt: unknown): true | string {
  const a = attempt as never;
  const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
  const indices = (value: unknown) => Array.isArray(value) && value.every((i) => Number.isInteger(i));
  switch (exercise.type) {
    case 'gap': return !object(attempt) ? 'Entwurf muss { g1: … } sein' : isGapExerciseCorrect(exercise, a) ? 'Versuch ist richtig' : true;
    case 'choice': return !indices(attempt) ? 'Entwurf muss eine Indexliste sein' : isChoiceCorrect(exercise, a) ? 'Versuch ist richtig' : true;
    case 'order': return !indices(attempt) || (attempt as number[]).length !== exercise.lines.length ? 'Entwurf muss alle Zeilenindizes enthalten' : isOrderCorrect(exercise, a) ? 'Versuch ist richtig' : true;
    case 'output': return typeof attempt !== 'string' ? 'Entwurf muss Text sein' : isOutputCorrect(exercise, a) ? 'Versuch ist richtig' : true;
    case 'command': return !object(attempt) || typeof attempt.value !== 'string' ? 'Entwurf muss { value, history } sein' : isCommandCorrect(exercise, attempt.value) ? 'Versuch ist richtig' : true;
    case 'bug': return !object(attempt) || !indices(attempt.selected) ? 'Entwurf muss { selected, found, fixes } sein' : !attempt.found && isBugSelectionCorrect(exercise, attempt.selected as number[]) ? 'Versuch ist richtig' : true;
    case 'code': case 'sql': return typeof attempt === 'string' ? true : 'Entwurf muss Code sein';
    case 'explain': return object(attempt) && typeof attempt.text === 'string' ? true : 'Entwurf muss { text, revealed, checked } sein';
    case 'practice': return object(attempt) && typeof attempt.code === 'string' ? true : 'Entwurf muss { code, checked } sein';
    case 'scenario': return 'Szenarien eignen sich nicht: der Versuch im Terminal wird nicht übermittelt';
  }
}

/**
 * Rough upper estimate per variant: the first hint per exercise writes the prefix to the cache, later ones read it;
 * one character is counted as 0.3 tokens and each answer as 500 output tokens (thinking included). The live run
 * enforces --max-usd with the strict worst case before every request.
 */
export function estimateMicros(prepared: Prepared[], variant: Variant): number {
  const seen = new Set<string>();
  return prepared.reduce((sum, { request, exercise }) => {
    const [lesson, ex, variable] = buildPrompt(request).messages[0].content;
    const prefix = Math.ceil((buildPrompt(request).system[0].text.length + lesson.text.length + ex.text.length) * 0.3);
    const fresh = !seen.has(exercise.id);
    seen.add(exercise.id);
    return sum + costMicros(variant.model, { input: Math.ceil(variable.text.length * 0.3), cacheWrite: fresh ? prefix : 0, cacheRead: fresh ? 0 : prefix, output: 500 });
  }, 0);
}

const usd = (micros: number) => `${(micros / 1_000_000).toFixed(2)} $`;
const flag = (name: string) => process.argv.includes(`--${name}`);
const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };

type Result = { case: string; variant: string; level: TutorLevel; text: string; leaked: boolean; retryText: string | null; retryLeaked: boolean | null; stop: string | null; forbidden: string[]; ms: number; micros: number; usage: { input: number; cacheWrite: number; cacheRead: number; output: number } };

async function live(prepared: Prepared[], variants: Variant[], maxMicros: number, out: string): Promise<void> {
  // Only an explicit key: the SDK would otherwise also pick up other local credentials.
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('--live braucht ANTHROPIC_API_KEY in der Umgebung.');
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 120_000 });
  mkdirSync(out, { recursive: true });
  const results: Result[] = [];
  let spent = 0;
  const send = async (variant: Variant, request: TutorRequest, retry: boolean) => {
    const prompt = buildPrompt(request, retry);
    const worst = worstCaseMicros(variant.model, promptChars(prompt));
    if (spent + worst > maxMicros) throw new Error(`Abbruch vor dem Limit: ${usd(spent)} verbraucht, die nächste Anfrage könnte ${usd(worst)} kosten (--max-usd ${usd(maxMicros)}).`);
    const started = performance.now();
    const message = await client.messages.create({ model: variant.model, max_tokens: TUTOR_MAX_TOKENS, output_config: { effort: variant.effort }, system: prompt.system, messages: prompt.messages });
    const usage = { input: message.usage.input_tokens ?? 0, cacheWrite: message.usage.cache_creation_input_tokens ?? 0, cacheRead: message.usage.cache_read_input_tokens ?? 0, output: message.usage.output_tokens };
    const micros = costMicros(variant.model, usage);
    spent += micros;
    const text = message.content.flatMap((block) => block.type === 'text' ? [block.text] : []).join('\n\n').trim();
    return { text, stop: message.stop_reason, ms: Math.round(performance.now() - started), micros, usage };
  };
  // Variants in turn per case, so every variant sees the same cache conditions.
  for (const p of prepared) for (const variant of variants) {
    const first = await send(variant, p.request, false);
    const leaked = leaksSolution(first.text, p.request.leak);
    const retry = leaked ? await send(variant, p.request, true) : null;
    const shown = retry?.text ?? first.text;
    const forbidden = (p.case.forbidden ?? []).filter((text) => shown.toLowerCase().includes(text.toLowerCase()));
    results.push({ case: p.case.id, variant: variant.name, level: p.case.level, text: first.text, leaked, retryText: retry?.text ?? null, retryLeaked: retry ? leaksSolution(retry.text, p.request.leak) : null, stop: first.stop, forbidden, ms: first.ms + (retry?.ms ?? 0), micros: first.micros + (retry?.micros ?? 0), usage: first.usage });
    writeFileSync(join(out, 'results.jsonl'), results.map((r) => JSON.stringify(r)).join('\n') + '\n');
    console.log(`${p.case.id} · ${variant.name}: ${first.ms} ms${leaked ? ', Lösung verraten' : ''}${forbidden.length ? `, Verbotenes: ${forbidden.join(', ')}` : ''} · gesamt ${usd(spent)}`);
  }
  writeFileSync(join(out, 'grading.md'), gradingSheet(prepared, variants, results));
  console.log(`Fertig: ${results.length} Antworten, ${usd(spent)}. Bewertungsbogen: ${join(out, 'grading.md')}`);
}

export function gradingSheet(prepared: Prepared[], variants: Variant[], results: Result[]): string {
  const lines = ['# Tutor-Eval: Bewertungsbogen', '', 'Je Antwort von Hand: Diagnose (0–2), Lösung verraten (ja/nein), Erfundenes (ja/nein), Kernpunkte bei explain (0–2), Deutsch (0–2).', '', '## Übersicht', '', '| Variante | Antworten | Lösung verraten (vor / nach dem zweiten Versuch) | Median Wartezeit | Kosten |', '| --- | --- | --- | --- | --- |'];
  for (const v of variants) {
    const rs = results.filter((r) => r.variant === v.name);
    const ms = rs.map((r) => r.ms).sort((a, b) => a - b);
    lines.push(`| ${v.name} | ${rs.length} | ${rs.filter((r) => r.leaked).length} / ${rs.filter((r) => r.retryLeaked).length} | ${ms.length ? `${(ms[Math.floor(ms.length / 2)] / 1000).toFixed(1)} s` : '–'} | ${usd(rs.reduce((s, r) => s + r.micros, 0))} |`);
  }
  for (const p of prepared) {
    lines.push('', `## ${p.case.id} (Stufe ${p.case.level}, ${p.exercise.type})`, '', `Übung: \`${p.case.exercise}\``, '', `Worauf es ankommt: ${p.case.focus}`, '');
    for (const v of variants) {
      const r = results.find((x) => x.case === p.case.id && x.variant === v.name);
      if (!r) continue;
      lines.push(`### ${v.name} · ${(r.ms / 1000).toFixed(1)} s${r.leaked ? ' · erste Antwort verworfen (Lösung)' : ''}`, '', (r.retryText ?? r.text).split('\n').map((l) => `> ${l}`).join('\n'), '', '| Diagnose | Lösung verraten | Erfundenes | Kernpunkte | Deutsch |', '| --- | --- | --- | --- | --- |', '|  |  |  |  |  |');
    }
  }
  return `${lines.join('\n')}\n`;
}

if (import.meta.main) {
  const prepared = prepare(loadCases());
  const only = option('only')?.split(',');
  const selected = only ? prepared.filter((p) => only.includes(p.case.id)) : prepared;
  const variants = (option('variants')?.split(',') ?? DEFAULT_VARIANTS).map((name) => VARIANTS[name] ?? (() => { throw new Error(`Unbekannte Variante ${name}. Möglich: ${Object.keys(VARIANTS).join(', ')}`); })());
  console.log(`${selected.length} Fälle geprüft: Übungen gefunden, Versuche falsch, Anfragen innerhalb der Grenzen.`);
  for (const v of variants) console.log(`  ${v.name.padEnd(14)} ${v.model} (${PRICES[v.model].input} / ${PRICES[v.model].read} / ${PRICES[v.model].output} $ pro MTok), geschätzt ${usd(estimateMicros(selected, v))}`);
  const total = variants.reduce((sum, v) => sum + estimateMicros(selected, v), 0);
  console.log(`  zusammen etwa ${usd(total)}, plus zweite Versuche bei verratener Lösung.`);
  if (!flag('live')) console.log('Trockenlauf: kein Aufruf, kein Schlüssel nötig. Echter Lauf mit --live --max-usd <Dollar>.');
  else {
    const max = Number(option('max-usd'));
    if (!(max > 0)) throw new Error('--live braucht --max-usd, zum Beispiel --max-usd 2.');
    await live(selected, variants, Math.round(max * 1_000_000), option('out') ?? join('tutor-eval', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')));
  }
}
