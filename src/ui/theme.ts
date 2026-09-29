// Light/dark theme. index.html sets data-theme before the first paint; this module keeps it current.
export type Theme = 'light' | 'dark';
export const THEME_KEY = 'learn:theme';
const COLORS: Record<Theme, string> = { light: '#f3f0e8', dark: '#161614' };
const system = () => window.matchMedia('(prefers-color-scheme: dark)');

/** An explicit choice on this device, or null when the system preference applies. */
export function storedTheme(): Theme | null {
  try { const value = localStorage.getItem(THEME_KEY); return value === 'light' || value === 'dark' ? value : null; } catch { return null; }
}
export const currentTheme = (): Theme => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme]);
  listeners.forEach((fn) => fn(theme));
}
const listeners = new Set<(theme: Theme) => void>();
export function onThemeChange(fn: (theme: Theme) => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }

export function setTheme(theme: Theme): void {
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* the choice then lasts for this tab only */ }
  apply(theme);
}

/** Applies the stored or system theme and follows system changes until the user picks one. */
export function initTheme(): void {
  apply(storedTheme() ?? (system().matches ? 'dark' : 'light'));
  system().addEventListener('change', (event) => { if (!storedTheme()) apply(event.matches ? 'dark' : 'light'); });
  // Another tab changed the choice.
  window.addEventListener('storage', (event) => { if (event.key === THEME_KEY) apply(storedTheme() ?? (system().matches ? 'dark' : 'light')); });
}
