export { escape } from '../engine/highlight.ts';
import { escape } from '../engine/highlight.ts';

export const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => root.querySelector<T>(selector)!;
export const $$ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document) => [...root.querySelectorAll<T>(selector)];
export const pad = (value: number) => String(value).padStart(2, '0');

/** Tagged template that escapes interpolations unless they are marked as trusted HTML via raw(). */
export class Raw { value: string; constructor(value: string) { this.value = value; } toString() { return this.value; } }
export const raw = (value: string) => new Raw(value);
type Value = string | number | boolean | null | undefined | Raw | Value[];
function render(value: Value): string {
  if (value === null || value === undefined || value === false) return '';
  if (Array.isArray(value)) return value.map(render).join('');
  if (value instanceof Raw) return value.value;
  return escape(String(value));
}
export function html(strings: TemplateStringsArray, ...values: Value[]): Raw {
  return raw(strings.reduce((out, part, i) => out + part + (i < values.length ? render(values[i]) : ''), ''));
}

export const LEVELS = ['', 'Einstieg', 'Fortgeschritten', 'Profi'] as const;
export const TYPE_LABELS: Record<string, string> = {
  gap: 'Lückencode', choice: 'Auswahl', order: 'Reihenfolge', output: 'Ausgabe vorhersagen', command: 'Terminal',
  code: 'Programmieren', practice: 'Praxisaufgabe', bug: 'Fehler finden', explain: 'Erklären',
};
export const TYPE_VERBS: Record<string, string> = {
  gap: 'Schreiben', choice: 'Verstehen', order: 'Verstehen', output: 'Vorhersagen', command: 'Schreiben',
  code: 'Schreiben', practice: 'Anwenden', bug: 'Fehler finden', explain: 'Erklären',
};
export const minutes = (value: number) => value >= 90 ? `${Math.round(value / 60 * 2) / 2} h`.replace('.', ',') : `${value} min`;
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const icons = {
  arrow: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h16m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/></svg>',
  back: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12H5m6-6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/></svg>',
  check: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/></svg>',
  cross: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"/></svg>',
  play: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v16l14-8z" fill="currentColor"/></svg>',
  up: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V5m-6 6 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/></svg>',
  down: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15m6-6-6 6-6-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/></svg>',
  external: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h10v10M19 5 6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg>',
};
