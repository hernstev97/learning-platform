import type { Answers, Gap, Task } from './types';

// Deliberately a source-reconstruction checker, not a Kotlin compiler.
// Preserve literals, identifier boundaries and compound operators.
export function tokens(value: string): string[] {
  return value.match(/"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?(?:[fFLl])?|\?\.|\?:|!!|->|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|::|\.\.<|\.\.|\+=|-=|[^\s]/g) ?? [];
}

export function isGapCorrect(gap: Gap, value: string): boolean {
  if (!value.trim()) return false;
  const actual = tokens(value);
  return gap.answers.some((answer) => {
    const expected = tokens(answer);
    return actual.length === expected.length && actual.every((token, i) => token === expected[i]);
  });
}
export function isCorrect(task: Task, answers: Answers): boolean {
  return task.gaps.every((gap) => isGapCorrect(gap, answers[gap.id] ?? ''));
}
export function isPartial(gap: Gap, value: string): boolean {
  const actual = value.trim();
  return !!actual && gap.answers.some((answer) => answer.startsWith(actual));
}
export function solution(task: Task): Answers {
  return Object.fromEntries(task.gaps.map((gap) => [gap.id, gap.answers[0]]));
}
export function assemble(task: Task, answers: Answers): string {
  return task.code.replace(/⟦(\d+)⟧/g, (_, number) => answers[`g${number}`] ?? `⟦${number}⟧`);
}
