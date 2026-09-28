export type Resource = { title: string; url: string };
export type Gap = { id: string; label: string; answers: string[]; hint: string; multiline: boolean };
export type Answers = Record<string, string>;
export type Task = {
  id: string;
  chapter: number;
  title: string;
  prompt: string;
  code: string;
  gaps: Gap[];
  explanation: string;
  wiki: { title: string; body: string };
  resources: Resource[];
  source: { file: string; start: number; end: number; revision: string };
  fingerprint: string;
};
export type Progress = {
  version: 2;
  activeId: string;
  drafts: Record<string, Answers>;
  completed: Record<string, { answers: Answers; at: string; fingerprint: string }>;
};
