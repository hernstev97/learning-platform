import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { formatIssues, lessonBlocks, loadContent } from './content.ts';
import { codeBlock, createMarkdown } from './markdown.ts';

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
  it('reads where a module can be done and lets prose practice go without a model answer', () => {
    const loaded = loadContent(undefined, join(import.meta.dirname, 'fixtures'));
    const { modules } = loaded.areas.beispiel;
    expect([modules['alle-typen'].place, modules.texte.place]).toEqual(['pc', 'unterwegs']);
    expect(loaded.catalog.areas[0].modules.map((m) => [m.id, m.place])).toEqual([['alle-typen', 'pc'], ['texte', 'unterwegs']]);
    // Summaries carry `lang` only for running text, so labels and resume links know a cloze from code.
    expect(loaded.catalog.areas[0].modules[1].exercises.find((e) => e.type === 'gap')!.lang).toBe('prose');
    expect(loaded.catalog.areas[0].modules[0].exercises.some((e) => 'lang' in e)).toBe(false);
    const practice = modules.texte.exercises.find((e) => e.type === 'practice')!;
    expect(practice.type === 'practice' && [practice.lang, practice.solution]).toEqual(['prose', '']);
    const root = mkdtempSync(join(tmpdir(), 'learning-place-'));
    try {
      cpSync(join(import.meta.dirname, 'fixtures/beispiel'), join(root, 'beispiel'), { recursive: true });
      const texte = join(root, 'beispiel/modules/texte.yaml');
      writeFileSync(texte, readFileSync(texte, 'utf8').replace('place: unterwegs', 'place: bus').replace('    lang: prose\n    checklist:', '    lang: prose\n    solution: Ein Mustertext.\n    checklist:'));
      const alle = join(root, 'beispiel/modules/alle-typen.yaml');
      writeFileSync(alle, readFileSync(alle, 'utf8').replace(/    solution: \|\n      fn main\(\) \{\n          for n[\s\S]*?\n    checklist:/, '    checklist:'));
      const changed = loadContent(undefined, root);
      const messages = changed.errors.map((issue) => `${issue.where}: ${issue.message}`);
      expect(messages).toContain('Modul texte: "place" muss unterwegs oder pc sein');
      expect(messages).toContain('Modul alle-typen › Übung 8 (praxis): "solution" fehlt');
      expect(messages).toContain('Modul texte › Übung 6 (eigener-text): "solution" gibt es bei lang: prose nicht – eigene Texte haben keine Musterlösung; Hilfen gehören in "hints" oder "wiki"');
      expect(messages).toHaveLength(3);
      expect(changed.areas.beispiel.modules.texte.place).toBeNull();
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
  it('keeps headings of later blocks out of a lesson\'s table of contents', () => {
    const md = createMarkdown();
    const { toc } = md.document('## Erster Abschnitt\n\nText\n\n## Zweiter Abschnitt\n');
    md.block('## Auftrag\n\nBrief eines Projekts');
    expect(toc.map((entry) => entry.title)).toEqual(['Erster Abschnitt', 'Zweiter Abschnitt']);
    const module = loadContent(undefined, join(import.meta.dirname, 'fixtures')).areas.beispiel.modules['alle-typen'];
    expect(module.toc.every((entry) => module.lesson.includes(`id="${entry.id}"`))).toBe(true);
  });
  it('renders images from public/media as sized figures and reports missing files and alt texts', () => {
    const root = mkdtempSync(join(tmpdir(), 'learning-media-'));
    try {
      // Smallest valid PNG header: signature, IHDR length and type, then width 640 and height 360.
      const png = Buffer.alloc(33);
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]).copy(png);
      png.writeUInt32BE(640, 16);
      png.writeUInt32BE(360, 20);
      const media = join(root, 'public');
      mkdirSync(join(media, 'media', 'kurs'), { recursive: true });
      writeFileSync(join(media, 'media', 'kurs', 'szene.png'), png);
      writeFileSync(join(media, 'media', 'kurs', 'pixel@2x.png'), png);
      const md = createMarkdown({ media });
      const figure = md.block('![Szenen-Dock mit drei Nodes](/media/kurs/szene.png "Der Baum der Testszene")');
      expect(figure).toBe('<figure class="figure"><a class="figure-link" href="/media/kurs/szene.png" target="_blank" rel="noopener"><img src="/media/kurs/szene.png" alt="Szenen-Dock mit drei Nodes" width="640" height="360" loading="lazy" decoding="async"><span class="sr-only"> (in voller Größe, neuer Tab)</span></a><figcaption>Der Baum der Testszene</figcaption></figure>\n');
      expect(md.block('![Spielbild, doppelt aufgelöst](/media/kurs/pixel@2x.png)')).toContain('width="320" height="180"');
      expect(md.takeImageProblems()).toEqual([]);
      md.block('Text mit ![](/media/kurs/szene.png) und ![Fehlt](/media/kurs/fehlt.png) und ![Außen](https://example.com/a.png)');
      expect(md.takeImageProblems()).toEqual([
        'Bild /media/kurs/szene.png braucht einen Alt-Text, der beschreibt, was zu sehen ist',
        'Bild /media/kurs/fehlt.png fehlt: erlaubt sind PNG-Dateien unter public/media/',
        'Bild https://example.com/a.png fehlt: erlaubt sind PNG-Dateien unter public/media/',
      ]);
      expect(md.takeImageProblems()).toEqual([]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  it('highlights GDScript without making it runnable', () => {
    const html = codeBlock('@export var windup := 12  # Frames\nfunc _ready() -> void:\n\t$Hitbox.monitoring = false\n\tplay(&"attack")', 'gdscript run');
    expect(html).toContain('<span>GDScript</span>');
    expect(html).not.toContain('data-run');
    expect(html).toContain('<span class="syntax-annotation">@export</span>');
    expect(html).toContain('<span class="syntax-keyword">func</span>');
    expect(html).toContain('<span class="syntax-variable">$Hitbox</span>');
    expect(html).toContain('<span class="syntax-string">&amp;&quot;attack&quot;</span>');
    expect(html).toContain('<span class="syntax-comment"># Frames</span>');
    expect(codeBlock('pass', 'gd')).toContain('<span>GDScript</span>');
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
