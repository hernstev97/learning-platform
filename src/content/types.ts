// Normalised content, produced by tooling/content.ts from content/<area>/*.
// Markdown fields are already rendered to trusted HTML at build time.

export type Resource = { title: string; url: string };
export type Level = 1 | 2 | 3;

export type Gap = { id: string; label: string; answers: string[]; hint: string; multiline: boolean };
export type Answers = Record<string, string>;

type ExerciseBase = {
  /** Unique within the area: `<module>/<exercise>`. Stable, because progress is stored under it. */
  id: string;
  module: string;
  title: string;
  prompt: string;
  /** Shown once solved or when the learner reveals the solution. */
  explanation: string;
  /** Optional background reading that does not give the answer away. */
  wiki: { title: string; body: string } | null;
  hints: string[];
  resources: Resource[];
  /** Changes whenever the checked part of the exercise changes; old successes then no longer count. */
  fingerprint: string;
  source: { file: string; start: number; end: number; revision: string } | null;
};

export type GapExercise = ExerciseBase & { type: 'gap'; lang: string; code: string; gaps: Gap[] };
export type ChoiceOption = { html: string; correct: boolean; why: string };
export type ChoiceExercise = ExerciseBase & { type: 'choice'; lang: string; code: string | null; multiple: boolean; options: ChoiceOption[] };
export type OrderExercise = ExerciseBase & { type: 'order'; lang: string; lines: string[]; alternatives: number[][]; shuffled: number[] };
export type OutputExercise = ExerciseBase & { type: 'output'; lang: string; code: string; expected: string[] };
export type CommandExercise = ExerciseBase & { type: 'command'; context: string | null; answers: string[]; output: string | null; symbol: string };
export type CodeTest = { name: string; code: string };
export type CodeExercise = ExerciseBase & { type: 'code'; lang: 'python'; starter: string; solution: string; setup: string; tests: CodeTest[] };
export type PracticeExercise = ExerciseBase & { type: 'practice'; lang: string; starter: string; solution: string; checklist: string[] };
/** Find the faulty line(s), then optionally type the corrected line. Lines are 1-based. */
export type BugFix = { line: number; answers: string[] };
export type BugExercise = ExerciseBase & { type: 'bug'; lang: string; code: string; lines: number[]; fixes: BugFix[] };
/** Explain code in your own words; `explanation` is the model answer, `points` the self-check. */
export type ExplainExercise = ExerciseBase & { type: 'explain'; lang: string; code: string; points: string[] };

export type Exercise = GapExercise | ChoiceExercise | OrderExercise | OutputExercise | CommandExercise | CodeExercise | PracticeExercise | BugExercise | ExplainExercise;
export type ExerciseType = Exercise['type'];

export type TocEntry = { id: string; title: string };
export type Module = {
  id: string;
  title: string;
  summary: string;
  level: Level;
  minutes: number;
  goals: string[];
  lesson: string;
  toc: TocEntry[];
  resources: Resource[];
  exercises: Exercise[];
  /** Set for modules generated from the Bear snapshot. */
  bear: boolean;
};

export type Card = { id: string; question: string; answer: string; tags: string[]; level: Level };
export type ProjectStep = { id: string; title: string; detail: string };
export type Project = {
  id: string;
  title: string;
  /** The realistic job-style project that concludes an area. */
  capstone: boolean;
  level: Level;
  hours: number;
  summary: string;
  brief: string;
  skills: string[];
  steps: ProjectStep[];
  acceptance: string[];
  stretch: string[];
  portfolio: string;
};
export type GlossaryEntry = { term: string; definition: string };

export type TrackSummary = { title: string; description: string; modules: string[] };
export type ModuleSummary = {
  id: string;
  title: string;
  summary: string;
  level: Level;
  minutes: number;
  bear: boolean;
  exercises: { id: string; type: ExerciseType; fingerprint: string }[];
};
export type AreaSummary = {
  id: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  color: string;
  outcomes: string[];
  tracks: TrackSummary[];
  modules: ModuleSummary[];
  cards: string[];
  projects: { id: string; title: string; capstone: boolean; level: Level; hours: number; summary: string; steps: string[] }[];
  counts: { modules: number; exercises: number; cards: number; projects: number; glossary: number; minutes: number };
  pages: { cheatsheet: boolean; career: boolean; glossary: boolean };
};
export type Catalog = { areas: AreaSummary[]; builtAt: string };

export type Area = {
  id: string;
  modules: Record<string, Module>;
  cards: Card[];
  projects: Project[];
  glossary: GlossaryEntry[];
  cheatsheet: string | null;
  career: string | null;
  /** Original files for exercises with a source reference (Bear). */
  files: Record<string, string>;
};
