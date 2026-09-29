// Card scheduling: a deliberately small Leitner variant with four self-ratings.
// Everything that decides when a card returns lives here. The stored review history
// (rating and day of every review) is enough to replay a different algorithm later.
import type { Grade } from '../../convex/model.ts';
import { addDays, localDay, type CardState } from './storage.ts';

export const GRADE_LABELS: Record<Grade, string> = { again: 'Vergessen', hard: 'Schwer', good: 'Okay', easy: 'Leicht' };
/** Leitner intervals in days for boxes 1–5. */
export const INTERVALS = [0, 1, 3, 7, 16, 35];
export const MAX_BOX = INTERVALS.length - 1;
/** Boxes a rating moves a card up; "again" always restarts in box 1. */
const STEPS: Record<Exclude<Grade, 'again'>, number> = { hard: 0, good: 1, easy: 2 };

/**
 * Vergessen: back to box 1, due again today (and later in the same round).
 * Schwer: stays in its box and returns after that box's interval.
 * Okay: one box up. Leicht: two boxes up.
 */
export function schedule(state: CardState | undefined, grade: Grade, today = localDay()): CardState {
  const box = grade === 'again' ? 1 : Math.min(Math.max((state?.box ?? 0) + STEPS[grade], 1), MAX_BOX);
  const lapses = (state?.lapses ?? 0) + (grade === 'again' ? 1 : 0);
  return {
    box, due: grade === 'again' ? today : addDays(today, INTERVALS[box]), seen: (state?.seen ?? 0) + 1, last: today, grade,
    ...(lapses ? { lapses } : {}),
  };
}

/** Weakest first: lower box, then more often forgotten, then longer overdue. */
export function byWeakness(a: CardState, b: CardState): number {
  return a.box - b.box || (b.lapses ?? 0) - (a.lapses ?? 0) || a.due.localeCompare(b.due);
}

const dayNumber = (day: string) => { const [y, m, d] = day.split('-').map(Number); return Date.UTC(y, m - 1, d) / 86_400_000; };
/** When a card would return after this rating, for the rating buttons. */
export function nextReview(state: CardState | undefined, grade: Grade, today = localDay()): string {
  const days = dayNumber(schedule(state, grade, today).due) - dayNumber(today);
  return days === 0 ? 'heute' : days === 1 ? '1 Tag' : `${days} Tage`;
}
