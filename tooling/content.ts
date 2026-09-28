// Loads, validates and normalises everything under content/.
// Used by the Vite plugin (dev + build), by `pnpm content:check`, by `pnpm verify` and by the tests.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { createMarkdown, codeBlock, slug } from './markdown.ts';
import { escape } from '../src/engine/highlight.ts';
import { shuffledOrder, tokens } from '../src/engine/answers.ts';
import type {
  Area, AreaSummary, Card, Catalog, Exercise, GlossaryEntry, Level, Module, ModuleSummary, Project, Resource, TrackSummary,
} from '../src/content/types.ts';

export const ROOT = join(import.meta.dirname, '..');
export const CONTENT = join(ROOT, 'content');
export const RESERVED = ['karten', 'projekte', 'spickzettel', 'glossar', 'beruf'];
const TYPES = ['gap', 'choice', 'order', 'output', 'command', 'code', 'practice', 'bug', 'explain'] as const;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validId = (id: unknown): id is string => typeof id === 'string' && id.length <= 120 && ID.test(id) && !['constructor', 'prototype'].includes(id);

export class ContentError extends Error {}
export type Issue = { file: string; where: string; message: string };
export type Loaded = {
  catalog: Catalog;
  areas: Record<string, Area>;
  errors: Issue[];
  warnings: Issue[];
  /** Raw authored exercises, for code verification. */
  raw: RawExercise[];
};
export type RawExercise = { area: string; module: string; file: string; exercise: Record<string, any>; normalized: Exercise };

type Obj = Record<string, any>;
const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
const rel = (file: string) => relative(ROOT, file);

class Reporter {
  errors: Issue[] = [];
  warnings: Issue[] = [];
  file: string;
  constructor(file: string) { this.file = file; }
  error(where: string, message: string) { this.errors.push({ file: rel(this.file), where, message }); }
  warn(where: string, message: string) { this.warnings.push({ file: rel(this.file), where, message }); }
}

function readYaml(file: string, report: Reporter): Obj | null {
  try {
    const data = parseYaml(readFileSync(file, 'utf8'), { prettyErrors: true, uniqueKeys: true });
    if (typeof data !== 'object' || data === null || Array.isArray(data)) { report.error('Datei', 'erwartet ein YAML-Objekt auf oberster Ebene'); return null; }
    return data;
  } catch (error) {
    report.error('YAML', (error as Error).message.split('\n').slice(0, 6).join('\n'));
    return null;
  }
}

/** Typed field access that records problems instead of throwing. */
function fields(obj: Obj, where: string, report: Reporter, allowed: string[]) {
  for (const key of Object.keys(obj)) if (!allowed.includes(key)) report.error(where, `unbekanntes Feld "${key}" (erlaubt: ${allowed.join(', ')})`);
  const str = (key: string, required = true): string => {
    const value = obj[key];
    if (value === undefined || value === null) { if (required) report.error(where, `"${key}" fehlt`); return ''; }
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value !== 'string') { report.error(where, `"${key}" muss Text sein`); return ''; }
    if (required && !value.trim()) report.error(where, `"${key}" ist leer`);
    return value;
  };
  const list = <T = any>(key: string, required = false): T[] => {
    const value = obj[key];
    if (value === undefined || value === null) { if (required) report.error(where, `"${key}" fehlt`); return []; }
    if (!Array.isArray(value)) { report.error(where, `"${key}" muss eine Liste sein`); return []; }
    return value;
  };
  const num = (key: string, fallback: number, min = 0, max = Infinity): number => {
    const value = obj[key];
    if (value === undefined) return fallback;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) { report.error(where, `"${key}" muss eine Zahl zwischen ${min} und ${max} sein`); return fallback; }
    return value;
  };
  return { str, list, num };
}

function resources(value: unknown, where: string, report: Reporter): Resource[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) { report.error(where, '"resources" muss eine Liste sein'); return []; }
  return value.flatMap((item, i) => {
    if (typeof item !== 'object' || !item || typeof item.title !== 'string' || typeof item.url !== 'string') { report.error(`${where} › resources[${i}]`, 'erwartet { title, url }'); return []; }
    if (!/^https:\/\//.test(item.url)) report.error(`${where} › resources[${i}]`, 'URL muss mit https:// beginnen');
    return [{ title: item.title, url: item.url }];
  });
}

const md = createMarkdown();
const block = (source: string) => source.trim() ? md.block(source) : '';
const inline = (source: string) => md.inline(source.trim());
const level = (value: unknown, where: string, report: Reporter): Level => {
  if (value === undefined) return 1;
  if (value === 1 || value === 2 || value === 3) return value;
  report.error(where, '"level" muss 1, 2 oder 3 sein');
  return 1;
};
const trimCode = (value: string) => value.replace(/^\n+/, '').replace(/\s+$/, '');

const COMMON = ['id', 'type', 'title', 'prompt', 'explanation', 'wiki', 'hints', 'resources'];
const BY_TYPE: Record<string, string[]> = {
  gap: ['lang', 'code', 'gaps'],
  choice: ['lang', 'code', 'options'],
  order: ['lang', 'lines', 'alternatives'],
  output: ['lang', 'code', 'expected', 'accept', 'verify'],
  command: ['context', 'answers', 'output', 'symbol'],
  code: ['lang', 'starter', 'solution', 'setup', 'tests'],
  practice: ['lang', 'starter', 'solution', 'checklist', 'verify'],
  bug: ['lang', 'code', 'lines', 'fix', 'verify'],
  explain: ['lang', 'code', 'points'],
};

function exercise(raw: Obj, moduleId: string, where: string, report: Reporter): Exercise | null {
  if (typeof raw !== 'object' || !raw) { report.error(where, 'Übung muss ein Objekt sein'); return null; }
  const type = raw.type;
  if (!TYPES.includes(type)) { report.error(where, `"type" muss einer von ${TYPES.join(', ')} sein`); return null; }
  const f = fields(raw, where, report, [...COMMON, ...BY_TYPE[type]]);
  const id = f.str('id');
  if (id && !validId(id)) report.error(where, `id "${id}" muss ein gültiger kebab-case-Schlüssel sein (a-z, 0-9, -, maximal 120 Zeichen, keine reservierten Objektschlüssel)`);
  const wikiRaw = raw.wiki;
  let wiki: Exercise['wiki'] = null;
  if (typeof wikiRaw === 'string') wiki = { title: 'Zum Nachlesen', body: block(wikiRaw) };
  else if (wikiRaw && typeof wikiRaw === 'object') wiki = { title: String(wikiRaw.title ?? 'Zum Nachlesen'), body: block(String(wikiRaw.body ?? '')) };
  const hints = f.list<string>('hints').map((hint, i) => { if (typeof hint !== 'string') report.error(where, `hints[${i}] muss Text sein`); return inline(String(hint)); });
  const base = {
    id: `${moduleId}/${id}`, module: moduleId, title: f.str('title'), prompt: block(f.str('prompt')), explanation: block(f.str('explanation')),
    wiki, hints, resources: resources(raw.resources, where, report), source: null,
  };
  const lang = (required = true) => { const value = f.str('lang', required); return value.toLowerCase(); };
  switch (type) {
    case 'gap': {
      const language = lang();
      const authored = trimCode(f.str('code'));
      const gapMeta = f.list<Obj>('gaps');
      const answers: string[] = [];
      const code = authored.replace(/⟦([\s\S]*?)⟧/g, (_, answer: string) => { answers.push(answer); return `⟦${answers.length}⟧`; });
      if (!answers.length) report.error(where, 'code enthält keine Lücke ⟦…⟧');
      if (/[⟦⟧]/.test(code.replace(/⟦\d+⟧/g, ''))) report.error(where, 'unpaarige Lückenklammern ⟦ ⟧');
      if (gapMeta.length && gapMeta.length !== answers.length) report.error(where, `"gaps" hat ${gapMeta.length} Einträge, der Code aber ${answers.length} Lücken`);
      const gaps = answers.map((answer, i) => {
        const meta = gapMeta[i] ?? {};
        const g = fields(meta, `${where} › gaps[${i}]`, report, ['label', 'hint', 'accept']);
        if (!answer.trim() || !tokens(answer, language).length) report.error(where, `Lücke ${i + 1} ist leer`);
        const accept = g.list<string>('accept').map(String);
        if (!meta.hint) report.warn(where, `Lücke ${i + 1} hat keinen Hinweis`);
        return { id: `g${i + 1}`, label: g.str('label', false) || `Lücke ${i + 1}`, answers: [answer, ...accept], hint: inline(g.str('hint', false)), multiline: answer.includes('\n') || answer.length > 65 };
      });
      return { ...base, type, lang: language, code, gaps, fingerprint: fingerprint([type, language, code, gaps.map((g) => g.answers)]) };
    }
    case 'choice': {
      const options = f.list<Obj>('options', true).map((option, i) => {
        const o = fields(option ?? {}, `${where} › options[${i}]`, report, ['text', 'correct', 'why']);
        if (typeof option?.correct !== 'boolean') report.error(`${where} › options[${i}]`, '"correct" muss true oder false sein');
        if (!option?.why) report.warn(where, `Option ${i + 1} hat keine Begründung ("why")`);
        return { html: inline(o.str('text')), correct: option?.correct === true, why: inline(o.str('why', false)) };
      });
      if (options.length < 2) report.error(where, 'mindestens zwei Optionen');
      if (!options.some((o) => o.correct)) report.error(where, 'keine Option ist korrekt');
      const code = raw.code ? trimCode(f.str('code')) : null;
      const language = code ? lang() : lang(false);
      return { ...base, type, lang: language, code, multiple: options.filter((o) => o.correct).length > 1, options, fingerprint: fingerprint([type, code, options.map((o) => [o.html, o.correct])]) };
    }
    case 'order': {
      const language = lang();
      const rawLines = raw.lines;
      const lines: string[] = Array.isArray(rawLines) ? rawLines.map(String) : typeof rawLines === 'string' ? trimCode(rawLines).split('\n') : [];
      if (lines.length < 3) report.error(where, '"lines" braucht mindestens drei Zeilen');
      if (lines.some((line) => !line.trim())) report.error(where, '"lines" darf keine Leerzeilen enthalten');
      const alternatives = f.list<number[]>('alternatives').map((alt, i) => {
        const valid = Array.isArray(alt) && alt.length === lines.length && [...alt].sort((a, b) => a - b).every((v, j) => v === j + 1);
        if (!valid) report.error(where, `alternatives[${i}] muss eine Permutation von 1..${lines.length} sein`);
        return valid ? alt.map((v) => v - 1) : [];
      }).filter((alt) => alt.length);
      return { ...base, type, lang: language, lines, alternatives, shuffled: shuffledOrder(lines.length, base.id), fingerprint: fingerprint([type, lines, alternatives]) };
    }
    case 'output': {
      const expected = [f.str('expected'), ...f.list<string>('accept').map(String)].map((value) => value.replace(/\n$/, ''));
      const code = trimCode(f.str('code'));
      return { ...base, type, lang: lang(), code, expected, fingerprint: fingerprint([type, code, expected]) };
    }
    case 'command': {
      const answers = f.list<string>('answers', true).map(String);
      if (!answers.length) report.error(where, '"answers" braucht mindestens einen Befehl');
      const context = f.str('context', false);
      const output = f.str('output', false);
      return { ...base, type, context: context ? block(context) : null, answers, output: output ? output.replace(/\n$/, '') : null, symbol: f.str('symbol', false) || '$', fingerprint: fingerprint([type, answers]) };
    }
    case 'code': {
      if (lang() !== 'python') report.error(where, 'code-Übungen laufen nur mit lang: python');
      const tests = f.list<Obj>('tests', true).map((test, i) => {
        const t = fields(test ?? {}, `${where} › tests[${i}]`, report, ['name', 'code']);
        return { name: t.str('name'), code: trimCode(t.str('code')) };
      });
      if (!tests.length) report.error(where, 'mindestens ein Test');
      const starter = trimCode(f.str('starter'));
      const solution = trimCode(f.str('solution'));
      const setup = trimCode(f.str('setup', false));
      return { ...base, type, lang: 'python', starter, solution, setup, tests, fingerprint: fingerprint([type, tests, setup]) };
    }
    case 'practice': {
      const checklist = f.list<string>('checklist', true).map((item) => inline(String(item)));
      if (!checklist.length) report.error(where, '"checklist" braucht mindestens einen Punkt');
      const solution = trimCode(f.str('solution'));
      return { ...base, type, lang: lang(), starter: trimCode(f.str('starter', false)), solution, checklist, fingerprint: fingerprint([type, base.title, checklist]) };
    }
    case 'bug': {
      const language = lang();
      const code = trimCode(f.str('code'));
      const count = code.split('\n').length;
      const lines = f.list<number>('lines', true);
      if (!lines.length) report.error(where, '"lines" braucht mindestens eine fehlerhafte Zeile');
      for (const line of lines) if (!Number.isInteger(line) || line < 1 || line > count) report.error(where, `Zeile ${line} gibt es nicht (Code hat ${count} Zeilen)`);
      const fixes = f.list<Obj>('fix').map((fix, i) => {
        const ff = fields(fix ?? {}, `${where} › fix[${i}]`, report, ['line', 'answers']);
        const line = fix?.line;
        if (!lines.includes(line)) report.error(`${where} › fix[${i}]`, `"line" ${line} ist keine der fehlerhaften Zeilen`);
        const answers = ff.list<string>('answers', true).map(String);
        const original = code.split('\n')[line - 1] ?? '';
        if (answers.some((answer) => tokens(answer, language).join(' ') === tokens(original, language).join(' '))) report.error(`${where} › fix[${i}]`, 'eine akzeptierte Korrektur ist identisch mit der fehlerhaften Zeile');
        return { line: Number(line), answers };
      });
      return { ...base, type, lang: language, code, lines: [...lines].sort((a, b) => a - b), fixes, fingerprint: fingerprint([type, code, lines, fixes]) };
    }
    case 'explain': {
      const points = f.list<string>('points', true).map((point) => inline(String(point)));
      if (points.length < 2) report.error(where, '"points" braucht mindestens zwei Kernpunkte');
      const code = trimCode(f.str('code'));
      return { ...base, type, lang: lang(), code, points, fingerprint: fingerprint([type, code, points]) };
    }
  }
  return null;
}

function loadModule(areaId: string, moduleId: string, report: Reporter, raw: RawExercise[]): Module | null {
  const data = readYaml(report.file, report);
  if (!data) return null;
  const where = `Modul ${moduleId}`;
  const f = fields(data, where, report, ['id', 'title', 'level', 'minutes', 'summary', 'goals', 'resources', 'lesson', 'exercises']);
  if (data.id !== moduleId) report.error(where, `id "${data.id}" muss dem Dateinamen "${moduleId}" entsprechen`);
  const lessonSource = f.str('lesson');
  const { html: lesson, toc } = md.document(lessonSource);
  const words = lessonSource.split(/\s+/).length;
  if (words < 1000) report.warn(where, `Lektion ist mit ${words} Wörtern kurz (Richtwert: 1500–3000)`);
  const links = (lessonSource.match(/\]\(https:\/\//g) ?? []).length;
  if (links < 4) report.warn(where, `Lektion verlinkt nur ${links}× auf externe Dokumentation (Richtwert: 6+)`);
  const exercises: Exercise[] = [];
  const seen = new Set<string>();
  f.list<Obj>('exercises', true).forEach((item, i) => {
    const label = `${where} › Übung ${i + 1}${item?.id ? ` (${item.id})` : ''}`;
    const normalized = exercise(item, moduleId, label, report);
    if (!normalized) return;
    if (seen.has(normalized.id)) report.error(label, `doppelte id "${item.id}"`);
    seen.add(normalized.id);
    exercises.push(normalized);
    raw.push({ area: areaId, module: moduleId, file: rel(report.file), exercise: item, normalized });
  });
  if (exercises.length < 10) report.warn(where, `nur ${exercises.length} Übungen (Richtwert: 10–14)`);
  const types = new Set(exercises.map((e) => e.type));
  if (exercises.length >= 8 && types.size < 4) report.warn(where, `nur ${types.size} Übungsarten – mische mehr Formate`);
  if (!types.has('bug') && !(exercises.some((e) => e.type === 'code' && /fehler|bug|korrigier|repar/i.test(e.title + e.prompt)))) report.warn(where, 'keine Fehlersuche (bug)');
  if (!types.has('explain')) report.warn(where, 'keine Erklär-Übung (explain)');
  if (!types.has('output')) report.warn(where, 'keine Vorhersage-Übung (output)');
  const choices = exercises.filter((e) => e.type === 'choice').length;
  if (choices > exercises.length / 3) report.warn(where, `${choices} von ${exercises.length} Übungen sind Multiple Choice – mehr aktive Formate`);
  const noResources = exercises.filter((e) => !e.resources.length).length;
  if (noResources > exercises.length / 2) report.warn(where, `${noResources} Übungen ohne Doku-Link (resources)`);
  return {
    id: moduleId, title: f.str('title'), summary: f.str('summary'), level: level(data.level, where, report), minutes: f.num('minutes', 60, 5, 600),
    goals: f.list<string>('goals').map((goal) => inline(String(goal))), lesson, toc, resources: resources(data.resources, where, report), exercises, bear: false,
  };
}

/** The imported Bear course (see content/kotlin/bear/README.md) becomes ten regular modules. */
function loadBear(areaDir: string, path: string, report: Reporter): { modules: Module[]; files: Record<string, string> } {
  const file = join(areaDir, path);
  if (!existsSync(file)) { report.error('bear', `${path} fehlt`); return { modules: [], files: {} }; }
  const course = JSON.parse(readFileSync(file, 'utf8'));
  const chapterIds = new Set<string>();
  for (const chapter of course.chapters) {
    if (!validId(chapter.id) || chapterIds.has(chapter.id)) report.error('bear', 'Kapitel braucht eine gültige, eindeutige, stabile id');
    chapterIds.add(chapter.id);
  }
  const taskIds = new Set<string>();
  for (const task of course.tasks) {
    if (!validId(task.id) || taskIds.has(task.id) || !chapterIds.has(task.chapterId)) report.error('bear', 'Aufgabe braucht eine eindeutige id und eine vorhandene chapterId');
    taskIds.add(task.id);
  }
  const paragraphs = (text: string) => text.split(/\n{2,}/).map((p) => `<p>${escape(p)}</p>`).join('');
  const modules = course.chapters.map((chapter: Obj, index: number): Module => {
    const id = String(chapter.id);
    const tasks = course.tasks.filter((task: Obj) => task.chapterId === id);
    const topics = tasks.map((task: Obj) => ({ id: slug(`${task.id}-${task.wiki.title}`), title: task.wiki.title, body: task.wiki.body }));
    const lesson = `<p>${escape(chapter.description)} Alle zehn Aufgaben stammen aus echtem Bear-Code (Commit <code>${escape(course.revision.slice(0, 7))}</code>). Du rekonstruierst die Originalzeilen; über den Dateiverweis siehst du jeden Ausschnitt im vollständigen Dateikontext.</p>`
      + `<aside class="callout callout-note"><p class="callout-title"><span>Hinweis</span></p><p>Die Prüfung vergleicht mit Bears Implementierung und führt keinen Kotlin-Compiler aus. Vorhandener Projektcode ist kein automatischer Best-Practice-Beweis; die Texte benennen bekannte Grenzen.</p></aside>`
      + topics.map((topic: Obj) => `<h2 id="${topic.id}"><a class="anchor" href="#${topic.id}" aria-hidden="true" tabindex="-1">#</a>${escape(topic.title)}</h2>${paragraphs(topic.body)}`).join('');
    return {
      id, title: chapter.title, summary: chapter.description, level: index < 4 ? 1 : index < 8 ? 2 : 3, minutes: 60,
      goals: [], lesson, toc: topics.map((topic: Obj) => ({ id: topic.id, title: topic.title })), resources: [], bear: true,
      exercises: tasks.map((task: Obj): Exercise => ({
        id: `${id}/${task.id}`, module: id, type: 'gap', lang: 'kotlin', title: task.title, prompt: paragraphs(task.prompt),
        explanation: paragraphs(task.explanation), wiki: { title: task.wiki.title, body: paragraphs(task.wiki.body) }, hints: [],
        resources: task.resources, code: task.code, gaps: task.gaps.map((g: Obj) => ({ ...g, hint: escape(g.hint) })), source: task.source, fingerprint: task.fingerprint,
      })),
    };
  });
  return { modules, files: course.files };
}

function loadArea(dir: string, raw: RawExercise[], sink: { errors: Issue[]; warnings: Issue[] }, allowMissing: boolean): { summary: AreaSummary; area: Area } | null {
  const report = new Reporter(join(dir, 'area.yaml'));
  const data = readYaml(report.file, report);
  const flush = (r: Reporter) => { sink.errors.push(...r.errors); sink.warnings.push(...r.warnings); };
  if (!data) { flush(report); return null; }
  const f = fields(data, 'Bereich', report, ['id', 'title', 'short', 'tagline', 'description', 'color', 'order', 'outcomes', 'tracks']);
  const id = f.str('id');
  if (!validId(id)) report.error('Bereich', `id "${id}" muss ein gültiger kebab-case-Schlüssel sein`);
  const color = f.str('color');
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) report.error('Bereich', '"color" muss #RRGGBB sein');
  const modules: Record<string, Module> = {};
  const tracks: TrackSummary[] = [];
  let files: Record<string, string> = {};
  f.list<Obj>('tracks', true).forEach((track, t) => {
    const where = `Track ${t + 1}`;
    const tf = fields(track ?? {}, where, report, ['title', 'description', 'modules', 'bear']);
    const ids: string[] = [];
    if (track?.bear) {
      const bear = loadBear(dir, String(track.bear), report);
      files = { ...files, ...bear.files };
      for (const module of bear.modules) { modules[module.id] = module; ids.push(module.id); }
    }
    for (const moduleId of tf.list<string>('modules')) {
      if (!validId(moduleId)) { report.error(where, `Modul-id "${moduleId}" muss ein gültiger kebab-case-Schlüssel sein`); continue; }
      if (RESERVED.includes(moduleId)) { report.error(where, `Modul-id "${moduleId}" ist für eine Bereichsseite reserviert`); continue; }
      if (modules[moduleId]) { report.error(where, `Modul "${moduleId}" ist doppelt`); continue; }
      const file = join(dir, 'modules', `${moduleId}.yaml`);
      if (!existsSync(file)) { (allowMissing ? report.warn : report.error).call(report, where, `modules/${moduleId}.yaml fehlt`); continue; }
      const moduleReport = new Reporter(file);
      const module = loadModule(id, moduleId, moduleReport, raw);
      flush(moduleReport);
      if (module) { modules[moduleId] = module; ids.push(moduleId); }
    }
    tracks.push({ title: tf.str('title'), description: tf.str('description', false), modules: ids });
  });
  if (existsSync(join(dir, 'modules'))) {
    const listed = new Set(Object.keys(modules));
    for (const name of readdirSync(join(dir, 'modules'))) {
      if (name.endsWith('.yaml') && !listed.has(name.slice(0, -5))) report.warn('Bereich', `modules/${name} ist in keinem Track eingetragen`);
    }
  }

  const cards: Card[] = [];
  const cardFile = join(dir, 'interview.yaml');
  if (existsSync(cardFile)) {
    const r = new Reporter(cardFile);
    const doc = readYaml(cardFile, r);
    if (doc) {
      const cf = fields(doc, 'interview', r, ['cards']);
      const seen = new Set<string>();
      cf.list<Obj>('cards', true).forEach((card, i) => {
        const where = `Karte ${i + 1}${card?.id ? ` (${card.id})` : ''}`;
        const c = fields(card ?? {}, where, r, ['id', 'q', 'a', 'tags', 'level']);
        const cid = c.str('id');
        if (!validId(cid)) r.error(where, 'id muss ein gültiger kebab-case-Schlüssel sein');
        if (seen.has(cid)) r.error(where, `doppelte id "${cid}"`);
        seen.add(cid);
        cards.push({ id: cid, question: block(c.str('q')), answer: block(c.str('a')), tags: c.list<string>('tags').map(String), level: level(card?.level, where, r) });
      });
    }
    flush(r);
  }

  const projects: Project[] = [];
  const projectFile = join(dir, 'projects.yaml');
  if (existsSync(projectFile)) {
    const r = new Reporter(projectFile);
    const doc = readYaml(projectFile, r);
    if (doc) {
      const pf = fields(doc, 'projects', r, ['projects']);
      pf.list<Obj>('projects', true).forEach((project, i) => {
        const where = `Projekt ${i + 1}${project?.id ? ` (${project.id})` : ''}`;
        const p = fields(project ?? {}, where, r, ['id', 'title', 'capstone', 'level', 'hours', 'summary', 'brief', 'skills', 'steps', 'acceptance', 'stretch', 'portfolio']);
        if (project?.capstone !== undefined && typeof project.capstone !== 'boolean') r.error(where, '"capstone" muss true oder false sein');
        const pid = p.str('id');
        if (!validId(pid)) r.error(where, 'id muss ein gültiger kebab-case-Schlüssel sein');
        const stepIds = new Set<string>();
        const steps = p.list<Obj>('steps', true).map((step, s) => {
          const sf = fields(step ?? {}, `${where} › steps[${s}]`, r, ['id', 'title', 'detail']);
          const title = sf.str('title');
          const sid = sf.str('id');
          if (!validId(sid)) r.error(where, 'Schritt-id muss ein gültiger kebab-case-Schlüssel sein');
          if (stepIds.has(sid)) r.error(where, `Schritt-id "${sid}" doppelt – gib eine eigene id an`);
          stepIds.add(sid);
          return { id: sid, title: inline(title), detail: block(sf.str('detail', false)) };
        });
        if (steps.length < 3) r.warn(where, 'weniger als drei Schritte');
        const acceptance = p.list<Obj>('acceptance').map((item, a) => {
          const af = fields(item ?? {}, `${where} › acceptance[${a}]`, r, ['id', 'text']);
          const id = af.str('id');
          if (!validId(id) || stepIds.has(id)) r.error(where, `Abnahme-id "${id}" muss gültig und eindeutig sein`);
          stepIds.add(id);
          return { id, text: inline(af.str('text')) };
        });
        if (projects.some((p) => p.id === pid)) r.error(where, `Projekt-id "${pid}" doppelt`);
        projects.push({
          id: pid, title: p.str('title'), capstone: project?.capstone === true, level: level(project?.level, where, r), hours: p.num('hours', 10, 1, 500), summary: inline(p.str('summary')),
          brief: block(p.str('brief')), skills: p.list<string>('skills').map(String), steps, acceptance,
          stretch: p.list<string>('stretch').map((s) => inline(String(s))), portfolio: block(p.str('portfolio', false)),
        });
      });
      const capstones = projects.filter((project) => project.capstone);
      if (capstones.length > 1) r.error('projects', `${capstones.length} Abschlussprojekte (capstone: true) – erlaubt ist eines`);
      if (!capstones.length) r.warn('projects', 'kein Abschlussprojekt (capstone: true)');
      for (const project of capstones) if (project.acceptance.length < 5) r.warn(`Projekt ${project.id}`, 'Abschlussprojekt braucht mindestens fünf Abnahmekriterien (acceptance)');
    }
    flush(r);
  }

  const glossary: GlossaryEntry[] = [];
  const glossaryFile = join(dir, 'glossary.yaml');
  if (existsSync(glossaryFile)) {
    const r = new Reporter(glossaryFile);
    const doc = readYaml(glossaryFile, r);
    if (doc) {
      const gf = fields(doc, 'glossary', r, ['terms']);
      const seen = new Set<string>();
      gf.list<Obj>('terms', true).forEach((term, i) => {
        const g = fields(term ?? {}, `Begriff ${i + 1}`, r, ['term', 'definition']);
        const name = g.str('term');
        if (seen.has(name.toLowerCase())) r.error(`Begriff ${i + 1}`, `"${name}" doppelt`);
        seen.add(name.toLowerCase());
        glossary.push({ term: name, definition: block(g.str('definition')) });
      });
      glossary.sort((a, b) => a.term.localeCompare(b.term, 'de', { sensitivity: 'base' }));
    }
    flush(r);
  }
  const page = (name: string) => existsSync(join(dir, name)) ? md.document(readFileSync(join(dir, name), 'utf8')).html : null;
  const cheatsheet = page('cheatsheet.md');
  const career = page('career.md');

  const moduleSummaries: ModuleSummary[] = tracks.flatMap((track) => track.modules).map((mid) => {
    const m = modules[mid];
    return { id: m.id, title: m.title, summary: m.summary, level: m.level, minutes: m.minutes, bear: m.bear, exercises: m.exercises.map((e) => ({ id: e.id, type: e.type, fingerprint: e.fingerprint })) };
  });
  const summary: AreaSummary = {
    id, title: f.str('title'), short: f.str('short', false) || f.str('title'), tagline: f.str('tagline'), description: f.str('description'), color,
    outcomes: f.list<string>('outcomes').map((o) => inline(String(o))), tracks, modules: moduleSummaries,
    cards: cards.map((c) => c.id), projects: projects.map((p) => ({ id: p.id, title: p.title, capstone: p.capstone, level: p.level, hours: p.hours, summary: p.summary, steps: [...p.steps.map((s) => s.id), ...p.acceptance.map((a) => a.id)] })),
    counts: {
      modules: moduleSummaries.length, exercises: moduleSummaries.reduce((n, m) => n + m.exercises.length, 0), cards: cards.length,
      projects: projects.length, glossary: glossary.length, minutes: moduleSummaries.reduce((n, m) => n + m.minutes, 0),
    },
    pages: { cheatsheet: !!cheatsheet, career: !!career, glossary: glossary.length > 0 },
  };
  (summary as AreaSummary & { order: number }).order = f.num('order', 99);
  flush(report);
  return { summary, area: { id, modules, cards, projects, glossary, cheatsheet, career, files } };
}

export function loadContent(only?: string[], root = CONTENT, options: { allowMissing?: boolean } = {}): Loaded {
  const sink = { errors: [] as Issue[], warnings: [] as Issue[] };
  const raw: RawExercise[] = [];
  const areas: Record<string, Area> = {};
  const summaries: AreaSummary[] = [];
  for (const name of readdirSync(root).sort()) {
    if (only?.length && !only.includes(name)) continue;
    const dir = join(root, name);
    if (!existsSync(join(dir, 'area.yaml'))) continue;
    const loaded = loadArea(dir, raw, sink, options.allowMissing ?? false);
    if (!loaded) continue;
    if (loaded.summary.id !== name) sink.errors.push({ file: `content/${name}/area.yaml`, where: 'Bereich', message: `id "${loaded.summary.id}" muss dem Ordnernamen "${name}" entsprechen` });
    areas[loaded.summary.id] = loaded.area;
    summaries.push(loaded.summary);
  }
  summaries.sort((a, b) => ((a as any).order - (b as any).order) || a.id.localeCompare(b.id));
  for (const s of summaries) delete (s as any).order;
  return { catalog: { areas: summaries, builtAt: new Date().toISOString() }, areas, errors: sink.errors, warnings: sink.warnings, raw };
}

export function formatIssues(issues: Issue[]): string {
  return issues.map((issue) => `  ${issue.file} · ${issue.where}\n    ${issue.message.replace(/\n/g, '\n    ')}`).join('\n');
}

/** For code blocks that exercise renderers want pre-rendered (unused keys are harmless). */
export { codeBlock };
