import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { formatIssues, lessonBlocks, loadContent } from './content.ts';
import { codeBlock } from './markdown.ts';

describe('content', () => {
  it('fixture area loads without errors and covers every exercise type', () => {
    const loaded = loadContent(undefined, join(import.meta.dirname, 'fixtures'));
    expect(formatIssues(loaded.errors)).toBe('');
    const types = new Set(loaded.areas.beispiel.modules['alle-typen'].exercises.map((e) => e.type));
    expect([...types].sort()).toEqual(['bug', 'choice', 'code', 'command', 'explain', 'gap', 'order', 'output', 'practice', 'scenario', 'sql']);
    expect(loaded.catalog.areas[0].projects.filter((p) => p.capstone)).toHaveLength(1);
  });
  it('published content is valid', () => {
    const loaded = loadContent();
    expect(formatIssues(loaded.errors)).toBe('');
    const ids = loaded.catalog.areas.flatMap((a) => a.modules.flatMap((m) => m.exercises.map((e) => `${a.id}:${e.id}`)));
    expect(new Set(ids).size).toBe(ids.length);
    for (const area of loaded.catalog.areas) {
      expect(area.cards.length, `${area.id}: Interview-Karten`).toBeGreaterThan(0);
      expect(area.projects.filter((project) => project.capstone), `${area.id}: Abschlussprojekt`).toHaveLength(1);
      expect(area.pages, `${area.id}: Nachschlagen und Beruf`).toEqual({ cheatsheet: true, career: true, glossary: true });
    }
  });
  it('previews the tables of SQL exercises and rejects broken schemas', () => {
    const loaded = loadContent(undefined, join(import.meta.dirname, 'fixtures'));
    const sql = loaded.areas.beispiel.modules['alle-typen'].exercises.find((e) => e.type === 'sql')!;
    expect(sql.type === 'sql' && sql.tables).toEqual([{ name: 'bestellungen', columns: ['id', 'region', 'betrag'], rows: [[1, 'Nord', 120.5], [2, 'Süd', 80], [3, 'Nord', 40], [4, 'West', null]], cells: [['1', 'Nord', '120.5'], ['2', 'Süd', '80.0'], ['3', 'Nord', '40.0'], ['4', 'West', '']], total: 4 }]);
    const root = mkdtempSync(join(tmpdir(), 'learning-sql-'));
    try {
      cpSync(join(import.meta.dirname, 'fixtures/beispiel'), join(root, 'beispiel'), { recursive: true });
      const file = join(root, 'beispiel/modules/alle-typen.yaml');
      writeFileSync(file, readFileSync(file, 'utf8').replace('CREATE TABLE bestellungen (id', 'CREATE TABLE bestellungen (region TEXT, id').replace('    ordered: true', '    ordered: yes'));
      const messages = loadContent(undefined, root).errors.map((issue) => issue.message).join('\n');
      expect(messages).toContain('"schema" lässt sich nicht ausführen: duplicate column name: region');
      expect(messages).toContain('"ordered" muss true oder false sein');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it('normalises scenario exercises and requires setup, checks and a solution', () => {
    const loaded = loadContent(undefined, join(import.meta.dirname, 'fixtures'));
    const scenario = loaded.areas.beispiel.modules['alle-typen'].exercises.find((e) => e.type === 'scenario')!;
    expect(scenario.type === 'scenario' && { setup: scenario.setup, checks: scenario.checks, solution: scenario.solution }).toEqual({
      setup: 'rm -f /home/ops/hallo.txt',
      checks: [{ name: 'hallo.txt enthält genau „hallo“', run: 'grep -qx hallo /home/ops/hallo.txt' }],
      solution: 'echo hallo > ~/hallo.txt',
    });
    const root = mkdtempSync(join(tmpdir(), 'learning-scenario-'));
    try {
      cpSync(join(import.meta.dirname, 'fixtures/beispiel'), join(root, 'beispiel'), { recursive: true });
      const file = join(root, 'beispiel/modules/alle-typen.yaml');
      writeFileSync(file, readFileSync(file, 'utf8').replace('    setup: rm -f /home/ops/hallo.txt\n', '').replace('        run: grep -qx hallo /home/ops/hallo.txt', '        command: grep -qx hallo /home/ops/hallo.txt'));
      const messages = loadContent(undefined, root).errors.map((issue) => issue.message);
      expect(messages).toContain('"setup" fehlt');
      expect(messages).toContain('unbekanntes Feld "command" (erlaubt: name, run)');
      expect(messages).toContain('"run" fehlt');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it('reports list items that YAML read as objects instead of text', () => {
    const root = mkdtempSync(join(tmpdir(), 'learning-yaml-'));
    try {
      cpSync(join(import.meta.dirname, 'fixtures/beispiel'), join(root, 'beispiel'), { recursive: true });
      const file = join(root, 'beispiel/modules/alle-typen.yaml');
      writeFileSync(file, readFileSync(file, 'utf8').replace('- Die Reihenfolge der Arme ist korrekt.', '- Die Reihenfolge der Arme: korrekt.'));
      expect(loadContent(undefined, root).errors.map((issue) => issue.message)).toContain('"checklist[1]" ist kein Text – YAML hat ": " als Schlüssel gelesen; setze den Eintrag in Anführungszeichen');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it('makes Python and SQL blocks runnable, other languages not', () => {
    expect(codeBlock('SELECT 1;', 'sql run')).toContain('data-run="sql"');
    expect(codeBlock('print(1)', 'python run')).toContain('data-run="python"');
    expect(codeBlock('SELECT 1;', 'sql')).not.toContain('data-run');
    expect(codeBlock('=SUMME(A1:A3)', 'excel run')).not.toContain('data-run');
  });
  it('gives shell and console blocks marked vm a terminal, other languages not', () => {
    expect(codeBlock('$ ls', 'console vm')).toContain('data-vm');
    expect(codeBlock('ls -la', 'bash vm')).toContain('data-vm');
    expect(codeBlock('$ ls', 'console')).not.toContain('data-vm');
    expect(codeBlock('print(1)', 'python vm')).not.toContain('data-vm');
    const module = loadContent(undefined, join(import.meta.dirname, 'fixtures')).areas.beispiel.modules['alle-typen'];
    expect({ lab: module.lab, vm: module.vm }).toEqual({ lab: "printf 'Ada\\nLinus\\nGrace\\n' > /home/ops/namen.txt\ngroupadd -f lernende && usermod -aG lernende ops", vm: true });
    expect(lessonBlocks('```console vm fails\n$ false\n```\n```python run\nprint(1)\n```\n').map((b) => [b.n, b.vm, b.flags])).toEqual([[1, true, ['vm', 'fails']], [2, false, ['run']]]);
    // A block closes only on a fence of the same character that is at least as long; tilde fences count too.
    const nested = '````markdown\n```console vm\n$ ls\n```\n````\n~~~console vm\n$ uptime\n~~~\n';
    expect(lessonBlocks(nested).map((b) => [b.n, b.lang, b.vm, b.code])).toEqual([[1, 'markdown', false, '```console vm\n$ ls\n```\n'], [2, 'console', true, '$ uptime\n']]);
    const root = mkdtempSync(join(tmpdir(), 'learning-vm-'));
    try {
      cpSync(join(import.meta.dirname, 'fixtures/beispiel'), join(root, 'beispiel'), { recursive: true });
      const file = join(root, 'beispiel/modules/alle-typen.yaml');
      writeFileSync(file, readFileSync(file, 'utf8').replace('  ```excel\n', '  ```excel vm\n').replace('  $ sort ~/namen.txt\n', ''));
      const messages = loadContent(undefined, root).errors.map((issue) => issue.message);
      expect(messages.some((m) => /als "vm" markiert, aber kein bash- oder console-Block/.test(m))).toBe(true);
      expect(messages.some((m) => /als "vm" markiert, enthält aber keinen Befehl/.test(m))).toBe(true);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it('does not offer deliberately invalid Rust snippets as executable playground examples', () => {
    expect(codeBlock('fn main() { invalid }', 'rust nocheck')).not.toContain('data-playground');
    expect(codeBlock('fn main() {}', 'rust')).toContain('data-playground="rust"');
  });
  it('keeps Bear exercise IDs and fingerprints when chapters and tasks are reordered', () => {
    const root = mkdtempSync(join(tmpdir(), 'learning-bear-ids-'));
    try {
      cpSync(join(import.meta.dirname, '../content/kotlin'), join(root, 'kotlin'), { recursive: true });
      const identities = () => loadContent(['kotlin'], root).catalog.areas[0].modules.flatMap((m) => m.exercises.map((e) => `${e.id}:${e.fingerprint}`)).sort();
      const before = identities();
      const file = join(root, 'kotlin/bear/bear-course.json');
      const course = JSON.parse(readFileSync(file, 'utf8'));
      course.chapters.reverse(); course.tasks.reverse(); course.chapters[0].title = 'Renamed chapter';
      writeFileSync(file, JSON.stringify(course));
      expect(identities()).toEqual(before);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
