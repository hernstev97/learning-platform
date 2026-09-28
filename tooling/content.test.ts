import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { formatIssues, loadContent } from './content.ts';
import { codeBlock } from './markdown.ts';

describe('content', () => {
  it('fixture area loads without errors and covers every exercise type', () => {
    const loaded = loadContent(undefined, join(import.meta.dirname, 'fixtures'));
    expect(formatIssues(loaded.errors)).toBe('');
    const types = new Set(loaded.areas.beispiel.modules['alle-typen'].exercises.map((e) => e.type));
    expect([...types].sort()).toEqual(['bug', 'choice', 'code', 'command', 'explain', 'gap', 'order', 'output', 'practice']);
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
