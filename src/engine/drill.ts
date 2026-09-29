// Exercise review: when an exercise that needed help comes back, and when a learned module wants a refresher.
// Like review.ts for cards, everything here is shared by the client (optimistic) and Convex (authoritative).
// The stored event history (drillEvents) is enough to replay different rules later.
import type { DrillEvent, Entry } from '../../convex/model.ts';
import { addDays, type DrillState, type TopicState } from './storage.ts';

/** Days until a weak exercise returns from box 1–3. A clean solve in the last box takes it off the list. */
export const DRILL_INTERVALS = [0, 1, 4, 10];
export const DRILL_MAX = DRILL_INTERVALS.length - 1;
/** Trouble points since the last solve. A shown solution weighs as much as three wrong checks. */
export const TROUBLE: Record<Exclude<DrillEvent, 'solve'>, number> = { fail: 1, hint: 1, reveal: 3 };
/** From this much trouble on, a solve counts as barely solved and the exercise starts over in box 1. */
export const HEAVY = 3;

/**
 * fail/hint/reveal: counted, and added to the trouble since the last solve.
 * solve: heavy trouble → box 1 (tomorrow); some trouble → box 2, or stays lower; clean → one box up, and off the list
 * after the last box. A clean first solve outside a review needs no record at all (undefined).
 */
export function drill(state: DrillState | undefined, event: DrillEvent, today: string, review: boolean): DrillState | undefined {
  if (event === 'solve' && !state && !review) return undefined;
  const s: DrillState = state ?? { box: 0, last: today, fails: 0, hints: 0, reveals: 0, open: 0 };
  if (event !== 'solve') {
    return {
      ...s, last: today, open: s.open + TROUBLE[event],
      fails: s.fails + (event === 'fail' ? 1 : 0), hints: s.hints + (event === 'hint' ? 1 : 0), reveals: s.reveals + (event === 'reveal' ? 1 : 0),
    };
  }
  const box = s.open >= HEAVY ? 1 : s.open > 0 ? Math.min(s.box || 2, 2) : s.box === 0 || s.box === DRILL_MAX ? 0 : s.box + 1;
  const { due: _due, ...rest } = s;
  return { ...rest, box, open: 0, last: today, ...(box ? { due: addDays(today, DRILL_INTERVALS[box]) } : {}) };
}

/**
 * Exercises from before help was recorded: a solution shown before solving (completion `help`) or without solving
 * (`revealed`) already counts as heavy trouble. `day` is when that is known to have happened.
 */
export function legacyDrill(solvedWithHelp: boolean, revealed: boolean, day: string): DrillState | undefined {
  if (solvedWithHelp) return { box: 1, due: addDays(day, DRILL_INTERVALS[1]), last: day, fails: 0, hints: 0, reveals: 1, open: 0 };
  if (revealed) return { box: 0, last: day, fails: 0, hints: 0, reveals: 1, open: TROUBLE.reveal };
  return undefined;
}

/** The state an event applies to: the stored one, or else one derived from legacy flags. Used by the mutation and its optimistic update. */
export function drillBase(stored: Entry | undefined, completion: Entry | undefined, revealed: Entry | undefined, today: string): DrillState | undefined {
  if (stored?.kind === 'drill') return stored.value;
  return legacyDrill(completion?.kind === 'completion' && !!completion.value?.help, revealed?.kind === 'revealed' && revealed.value, today);
}

/** Days after the last practice until a learned module wants a refresher; each clean refresher moves it further out. */
export const REFRESH_INTERVALS = [10, 30, 75, 180];
export const refreshInterval = (reps: number) => REFRESH_INTERVALS[Math.min(reps, REFRESH_INTERVALS.length - 1)];
/** A clean refresher lengthens the next interval, one with trouble starts over. */
export function refreshTopic(state: TopicState | undefined, clean: boolean, today: string): TopicState {
  return { reps: clean ? (state?.reps ?? 0) + 1 : 0, last: today };
}
