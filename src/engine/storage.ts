import { tasks } from './curriculum';
import { isCorrect } from './validation';
import type { Answers, Progress, Task } from './types';

export const STORAGE_KEY = 'kotlin-lernen:bear:progress:v2';
export const LEGACY_KEY = 'kotlin-lernen:progress:v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export const freshProgress = (): Progress => ({ version: 2, activeId: tasks[0].id, drafts: {}, completed: {} });
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
function readAnswers(task: Task, value: unknown): Answers {
  if (!record(value)) return {};
  return Object.fromEntries(task.gaps.flatMap((gap) => {
    const answer = value[gap.id];
    return typeof answer === 'string' && answer.length <= 12000 ? [[gap.id, answer]] : [];
  }));
}
export function readProgress(storage: StoragePort): { progress: Progress; warning: string | null; legacy: boolean } {
  const progress = freshProgress();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { progress, warning: null, legacy: !!storage.getItem(LEGACY_KEY) };
    const data: unknown = JSON.parse(raw);
    if (!record(data) || data.version !== 2) throw new Error('Unknown progress format');
    if (tasks.some((task) => task.id === data.activeId)) progress.activeId = data.activeId as string;
    for (const task of tasks) {
      const draft = record(data.drafts) ? data.drafts[task.id] : undefined;
      if (record(draft)) progress.drafts[task.id] = readAnswers(task, draft);
      const completion = record(data.completed) ? data.completed[task.id] : undefined;
      if (record(completion) && completion.fingerprint === task.fingerprint && typeof completion.at === 'string') {
        const answers = readAnswers(task, completion.answers);
        if (isCorrect(task, answers)) progress.completed[task.id] = { answers, at: completion.at, fingerprint: task.fingerprint };
      }
    }
    return { progress, warning: null, legacy: false };
  } catch {
    return { progress, warning: 'Dein Bear-Lernstand konnte nicht geladen werden. Neue Eingaben versuchen wir erneut zu speichern.', legacy: false };
  }
}
export function writeProgress(storage: StoragePort, progress: Progress): boolean {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
