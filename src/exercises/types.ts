import type { Exercise } from '../content/types.ts';

export type Feedback = 'info' | 'ok' | 'bad' | 'partial';
export type ExerciseContext<D> = {
  draft: D | undefined;
  /** Persist the learner's current work (answers, code, order …). */
  save(draft: D): void;
  /** Mark the exercise as solved; safe to call repeatedly. */
  complete(): void;
  feedback(kind: Feedback, message: string): void;
  /** Solved before (fingerprint still matches). */
  done: boolean;
  areaId: string;
};
export type ExerciseView = {
  markup: string;
  bind(root: HTMLElement): (() => void) | void;
  /** HTML shown by "Lösung zeigen". */
  solution(): string;
  /** The view shows the explanation itself (explain exercises). */
  ownsExplanation?: boolean;
};
export type ExerciseRenderer<E extends Exercise, D> = (exercise: E, context: ExerciseContext<D>) => ExerciseView;
