import type { Answers, BugExercise, ChoiceExercise, CommandExercise, Gap, GapExercise, OrderExercise, OutputExercise } from '../content/types.ts';
import { excelTokens } from './excel.ts';

// Deliberately a source-reconstruction checker, not a compiler.
// Preserve literals, identifier boundaries and compound operators; whitespace between tokens may vary.
const KOTLIN = /"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?(?:[fFLl])?|\?\.|\?:|!!|->|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|::|\.\.<|\.\.|\+=|-=|[^\s]/g;
const RUST = /r(#*)"[\s\S]*?"\1|b?"(?:\\.|[^"\\])*"|b?'(?:\\u\{[0-9a-fA-F]+\}|\\.|[^'\\])'|'[A-Za-z_]\w*|[A-Za-z_]\w*!?|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?(?:[iu](?:8|16|32|64|128|size)|f32|f64)?|::|->|=>|\.\.=|\.\.|==|!=|<=|>=|&&|\|\||\+=|-=|\*=|\/=|%=|<<|>>|[^\s]/g;
const PYTHON = /[rRbBfFuU]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|[A-Za-z_]\w*|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?j?|\*\*=|\/\/=|\*\*|\/\/|:=|->|==|!=|<=|>=|\+=|-=|\*=|\/=|%=|<<|>>|\.\.\.|[^\s]/g;
const SQL = /'(?:[^']|'')*'|"(?:[^"]|"")*"|`[^`]*`|\[[^\]\n]*\]|[A-Za-z_][\w$]*|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|<>|!=|<=|>=|\|\||::|->>|->|[^\s]/g;
const SHELL = /'[^']*'|"(?:\\.|[^"\\])*"|\$\(|\$\{|&&|\|\||>>|<<-?|[0-9]?>&[0-9]|&>|[0-9]>|[^\s'"|&;<>()]+|[^\s]/g;

export type Lang = string;
const family = (lang: Lang) => {
  const l = lang.toLowerCase();
  if (['kotlin', 'kt', 'kts', 'gradle', 'java', 'groovy'].includes(l)) return 'kotlin';
  if (['rust', 'rs'].includes(l)) return 'rust';
  if (['python', 'py', 'python3', 'pycon'].includes(l)) return 'python';
  if (['bash', 'sh', 'shell', 'zsh', 'fish', 'console', 'terminal'].includes(l)) return 'shell';
  if (['excel', 'xlsx', 'formula'].includes(l)) return 'excel';
  if (['sql', 'sqlite', 'postgresql', 'postgres'].includes(l)) return 'sql';
  return 'generic';
};

/** Python strings compare by content and prefix, so 'a' and "a" are the same answer. */
function canonicalPythonString(token: string): string {
  const match = token.match(/^([rRbBfFuU]{0,2})("""|'''|"|')([\s\S]*)\2$/);
  if (!match) return token;
  const [, prefix, , body] = match;
  if (/[\\'"]/.test(body)) return token;
  return `${prefix.toLowerCase()}⟨str⟩${body}`;
}

export function tokens(value: string, lang: Lang = 'kotlin'): string[] {
  switch (family(lang)) {
    case 'rust': return value.match(RUST) ?? [];
    case 'python': return (value.match(PYTHON) ?? []).map(canonicalPythonString);
    case 'shell': return shellTokens(value);
    // German and English Excel: SUMMEWENNS(…;…) = SUMIFS(…,…), function names and references in any case.
    case 'excel': return excelTokens(value);
    case 'sql': return sqlTokens(value);
    default: return value.match(KOTLIN) ?? [];
  }
}

/**
 * SQL: keywords, functions and names are case-insensitive (`count(*)` = `COUNT(*)`), string literals are not.
 * `!=` equals `<>`, and a closing `;` is optional.
 */
function sqlTokens(value: string): string[] {
  const out = (value.match(SQL) ?? []).map((token) => /^[A-Za-z_]/.test(token) ? token.toLowerCase() : token === '!=' ? '<>' : token);
  while (out.at(-1) === ';') out.pop();
  return out;
}

const plainWord = /^[\w./:@%+=,~-]+$/;
/**
 * Shell comparison: quoting that does not change meaning is ignored ("x" = 'x' = x),
 * and bundled or reordered short flags are equivalent (-la = -al = -l -a).
 */
export function shellTokens(value: string): string[] {
  const raw = value.replace(/\\\n/g, ' ').match(SHELL) ?? [];
  const out: string[] = [];
  for (const token of raw) {
    let t = token;
    if (/^'[^']*'$/.test(t)) t = `⟨q⟩${t.slice(1, -1)}`;
    else if (/^"(?:\\.|[^"\\])*"$/.test(t) && !/[$`\\]/.test(t.slice(1, -1))) t = `⟨q⟩${t.slice(1, -1)}`;
    if (t.startsWith('⟨q⟩') && plainWord.test(t.slice(3)) && !/[*?[\]{}~]/.test(t.slice(3))) t = t.slice(3);
    if (/^-[A-Za-z]{2,}$/.test(t)) out.push(...[...t.slice(1)].map((c) => `-${c}`));
    else out.push(t);
  }
  // Sort each run of adjacent single-letter flags.
  for (let i = 0; i < out.length;) {
    if (!/^-[A-Za-z]$/.test(out[i])) { i++; continue; }
    let j = i;
    while (j < out.length && /^-[A-Za-z]$/.test(out[j])) j++;
    const run = out.slice(i, j).sort();
    out.splice(i, run.length, ...run);
    i = j;
  }
  return out;
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((token, i) => token === b[i]);

export function isGapCorrect(gap: Gap, value: string, lang: Lang = 'kotlin'): boolean {
  if (!value.trim()) return false;
  const actual = tokens(value, lang);
  return gap.answers.some((answer) => same(actual, tokens(answer, lang)));
}
export function isGapExerciseCorrect(exercise: Pick<GapExercise, 'gaps' | 'lang'>, answers: Answers): boolean {
  return exercise.gaps.every((gap) => isGapCorrect(gap, answers[gap.id] ?? '', exercise.lang));
}
export function isPartial(gap: Gap, value: string): boolean {
  const actual = value.trim();
  return !!actual && gap.answers.some((answer) => answer.startsWith(actual));
}
export function gapSolution(exercise: Pick<GapExercise, 'gaps'>): Answers {
  return Object.fromEntries(exercise.gaps.map((gap) => [gap.id, gap.answers[0]]));
}
export function assemble(exercise: Pick<GapExercise, 'code'>, answers: Answers): string {
  return exercise.code.replace(/⟦(\d+)⟧/g, (_, number) => answers[`g${number}`] ?? `⟦${number}⟧`);
}

export function normalizeOutput(value: string): string {
  return value.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trimEnd()).join('\n').replace(/^\n+|\n+$/g, '');
}
export function isOutputCorrect(exercise: Pick<OutputExercise, 'expected'>, value: string): boolean {
  const actual = normalizeOutput(value);
  return !!actual && exercise.expected.some((expected) => normalizeOutput(expected) === actual);
}

export function isCommandCorrect(exercise: Pick<CommandExercise, 'answers'>, value: string): boolean {
  if (!value.trim()) return false;
  const actual = shellTokens(value.trim().replace(/^\$\s+/, ''));
  return exercise.answers.some((answer) => same(actual, shellTokens(answer)));
}

/** `order` is the learner's arrangement as indices into `lines` (0-based). */
export function isOrderCorrect(exercise: Pick<OrderExercise, 'lines' | 'alternatives'>, order: number[]): boolean {
  if (order.length !== exercise.lines.length) return false;
  const text = order.map((index) => exercise.lines[index]);
  if (text.every((line, i) => line === exercise.lines[i])) return true;
  return exercise.alternatives.some((alternative) => alternative.every((index, i) => exercise.lines[index] === text[i]));
}

export function isChoiceCorrect(exercise: Pick<ChoiceExercise, 'options'>, selected: number[]): boolean {
  const wanted = exercise.options.flatMap((option, index) => option.correct ? [index] : []);
  return wanted.length === selected.length && wanted.every((index) => selected.includes(index));
}

export function isBugSelectionCorrect(exercise: Pick<BugExercise, 'lines'>, selected: number[]): boolean {
  return exercise.lines.length === selected.length && exercise.lines.every((line) => selected.includes(line));
}
export function isBugFixCorrect(exercise: Pick<BugExercise, 'fixes' | 'lang'>, line: number, value: string): boolean {
  const fix = exercise.fixes.find((item) => item.line === line);
  if (!fix || !value.trim()) return false;
  const actual = tokens(value, exercise.lang);
  return fix.answers.some((answer) => same(actual, tokens(answer, exercise.lang)));
}
/** The code with every faulty line replaced by its first accepted fix (indentation of the original kept). */
export function fixedCode(exercise: Pick<BugExercise, 'code' | 'fixes'>): string {
  return exercise.code.split('\n').map((line, index) => {
    const fix = exercise.fixes.find((item) => item.line === index + 1);
    if (!fix) return line;
    const indent = line.match(/^\s*/)![0];
    return fix.answers[0].match(/^\s/) ? fix.answers[0] : indent + fix.answers[0];
  }).join('\n');
}

/** Deterministic shuffle that never returns the solved order (for n > 1). */
export function shuffledOrder(length: number, seed: string): number[] {
  let state = 0;
  for (const char of seed) state = (Math.imul(state, 31) + char.charCodeAt(0)) >>> 0;
  const random = () => { state = (Math.imul(state ^ (state >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return state / 2 ** 32; };
  const order = Array.from({ length }, (_, i) => i);
  for (let attempt = 0; attempt < 20; attempt++) {
    for (let i = length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (length < 2 || order.some((value, i) => value !== i)) return order;
  }
  return [...order.slice(1), order[0]];
}
