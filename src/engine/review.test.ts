import { describe, expect, it } from 'vitest';
import { byWeakness, nextReview, schedule } from './review.ts';
import type { CardState } from './storage.ts';

const today = '2026-09-28';
const card = (box: number, extra: Partial<CardState> = {}): CardState => ({ box, due: today, seen: 3, last: '2026-09-20', ...extra });

describe('card scheduling', () => {
  it('moves a new card by rating: forgotten today, hard and okay tomorrow, easy in three days', () => {
    expect(schedule(undefined, 'again', today)).toEqual({ box: 1, due: today, seen: 1, last: today, grade: 'again', lapses: 1 });
    expect(schedule(undefined, 'hard', today)).toMatchObject({ box: 1, due: '2026-09-29' });
    expect(schedule(undefined, 'good', today)).toMatchObject({ box: 1, due: '2026-09-29' });
    expect(schedule(undefined, 'easy', today)).toMatchObject({ box: 2, due: '2026-10-01' });
  });
  it('keeps hard cards in their box, promotes okay by one and easy by two, never beyond box 5', () => {
    expect(schedule(card(3), 'hard', today)).toMatchObject({ box: 3, due: '2026-10-05' });
    expect(schedule(card(3), 'good', today)).toMatchObject({ box: 4, due: '2026-10-14' });
    expect(schedule(card(3), 'easy', today)).toMatchObject({ box: 5, due: '2026-11-02' });
    expect(schedule(card(5), 'easy', today)).toMatchObject({ box: 5, due: '2026-11-02' });
  });
  it('sends a forgotten card back to box 1 and counts the lapse', () => {
    const forgotten = schedule(card(4, { lapses: 1 }), 'again', today);
    expect(forgotten).toMatchObject({ box: 1, due: today, seen: 4, lapses: 2, grade: 'again' });
    expect(schedule(forgotten, 'good', today)).toMatchObject({ box: 2, lapses: 2, grade: 'good' });
  });
  it('shows weak cards more often: repeated weak ratings return far sooner than strong ones', () => {
    const review = (grade: 'hard' | 'good' | 'easy') => [1, 2, 3].reduce<CardState | undefined>((state) => schedule(state, grade, today), undefined)!;
    expect(review('hard').due < review('good').due).toBe(true);
    expect(review('good').due < review('easy').due).toBe(true);
  });
  it('orders due cards weakest first', () => {
    const cards = { strong: card(4), shaky: card(2, { lapses: 3 }), low: card(1, { due: '2026-09-27' }), lower: card(1, { due: '2026-09-20' }), fresh: card(2) };
    const order = Object.entries(cards).sort(([, a], [, b]) => byWeakness(a, b)).map(([id]) => id);
    expect(order).toEqual(['lower', 'low', 'shaky', 'fresh', 'strong']);
  });
  it('labels when a card returns after each rating', () => {
    expect(['again', 'hard', 'good', 'easy'].map((g) => nextReview(card(2), g as 'again', today))).toEqual(['heute', '3 Tage', '7 Tage', '16 Tage']);
    expect(nextReview(undefined, 'good', '2026-10-24')).toBe('1 Tag');
  });
});
