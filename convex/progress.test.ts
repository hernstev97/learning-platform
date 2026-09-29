import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from './schema';
import { api, internal } from './_generated/api';
import * as backend from './progress';
import type { Entry } from './model';

const modules = import.meta.glob('./**/*.ts');
const identity = { issuer: 'https://learning.clerk.accounts.dev', subject: 'user_owner' };
const areaId = 'python';
const lesson: Entry = { kind: 'lesson', id: 'intro', completedAt: '2026-09-28T10:00:00.000Z' };
const completion: Entry = { kind: 'completion', id: 'intro/first', value: { fp: 'abc123', at: '2026-09-28T10:00:00.000Z' } };
const draft = { exerciseId: 'intro/first', fingerprint: 'abc123', json: '"print(1)"' };
const note = { moduleId: 'intro', text: 'Offene Frage: Warum?' };
const imported = { areaId, generation: 0, importId: 'a'.repeat(64), mode: 'legacy' as const, entries: [lesson, completion], drafts: [draft] };
const create = () => convexTest(schema, modules);
type Client = ReturnType<ReturnType<typeof create>['withIdentity']>;
beforeEach(() => { vi.stubEnv('CLERK_JWT_ISSUER_DOMAIN', identity.issuer); vi.stubEnv('ALLOWED_CLERK_USER_ID', identity.subject); });
afterEach(() => vi.unstubAllEnvs());

const endpoints = [
  ['snapshot', (t: Client) => t.query(api.progress.snapshot, {})],
  ['draft', (t: Client) => t.query(api.progress.draft, { areaId, exerciseId: draft.exerciseId })],
  ['exportDrafts', (t: Client) => t.query(api.progress.exportDrafts, { paginationOpts: { numItems: 10, cursor: null } })],
  ['set', (t: Client) => t.mutation(api.progress.set, { areaId, generation: 0, changes: [lesson] })],
  ['saveDraft', (t: Client) => t.mutation(api.progress.saveDraft, { areaId, generation: 0, draft })],
  ['reviewCard', (t: Client) => t.mutation(api.progress.reviewCard, { areaId, generation: 0, cardId: 'first', knew: true, today: '2026-09-28' })],
  ['importLegacy', (t: Client) => t.mutation(api.progress.importLegacy, imported)],
  ['resetArea', (t: Client) => t.mutation(api.progress.resetArea, { areaId, generation: 0 })],
  ['note', (t: Client) => t.query(api.progress.note, { areaId, moduleId: note.moduleId })],
  ['noteIndex', (t: Client) => t.query(api.progress.noteIndex, {})],
  ['exportNotes', (t: Client) => t.query(api.progress.exportNotes, { paginationOpts: { numItems: 10, cursor: null } })],
  ['saveNote', (t: Client) => t.mutation(api.progress.saveNote, { areaId, note })],
] as const;

describe.each(endpoints)('authorization: %s', (_name, call) => {
  it('allows the configured owner', async () => { await expect(call(create().withIdentity(identity))).resolves.not.toThrow(); });
  it('rejects an unauthenticated request', async () => { await expect(call(create())).rejects.toThrow('ACCESS_DENIED'); });
  it('rejects a different user even with the same email', async () => { await expect(call(create().withIdentity({ ...identity, subject: 'user_intruder', email: 'owner@example.com' }))).rejects.toThrow('ACCESS_DENIED'); });
  it('rejects the same subject from a different issuer', async () => { await expect(call(create().withIdentity({ ...identity, issuer: 'https://attacker.example' }))).rejects.toThrow('ACCESS_DENIED'); });
  it('rejects inconsistent identity claims', async () => { await expect(call(create().withIdentity({ ...identity, tokenIdentifier: 'malformed' }))).rejects.toThrow('ACCESS_DENIED'); });
  it('fails closed when the allowlist is missing', async () => { vi.stubEnv('ALLOWED_CLERK_USER_ID', ''); await expect(call(create().withIdentity(identity))).rejects.toThrow('ACCESS_DENIED'); });
  it('fails closed when the issuer is malformed', async () => { vi.stubEnv('CLERK_JWT_ISSUER_DOMAIN', 'http://bad/'); await expect(call(create().withIdentity(identity))).rejects.toThrow('ACCESS_DENIED'); });
});

describe('personal state', () => {
  it('audits every exported public endpoint; additions require explicit security coverage', () => {
    const names = Object.entries(backend).filter(([, fn]) => 'isPublic' in fn).map(([name]) => name).sort();
    expect(names).toEqual(endpoints.map(([name]) => name).sort());
  });
  it('makes old drafts unreadable immediately and cleans them up without touching a new generation', async () => {
    const t = create(); const owner = t.withIdentity(identity);
    await owner.mutation(api.progress.saveDraft, { areaId, generation: 0, draft });
    await owner.mutation(api.progress.resetArea, { areaId, generation: 0 });
    expect(await owner.query(api.progress.draft, { areaId, exerciseId: draft.exerciseId })).toBeNull();
    await owner.mutation(api.progress.saveDraft, { areaId, generation: 1, draft: { ...draft, json: '"new"' } });
    await t.mutation(internal.progress.purgeDrafts, { areaId, generation: 0 });
    expect(await owner.query(api.progress.draft, { areaId, exerciseId: draft.exerciseId })).toMatchObject({ json: '"new"' });
    await t.finishInProgressScheduledFunctions();
    expect((await t.run((ctx) => ctx.db.query('drafts').collect())).every((d) => d.generation === 1)).toBe(true);
  });
  it('persists across independent sessions, with idempotent creation and updates', async () => {
    const t = create(); const desktop = t.withIdentity(identity); const phone = t.withIdentity(identity);
    const write = { areaId, generation: 0, changes: [lesson, completion] };
    await desktop.mutation(api.progress.set, write); await desktop.mutation(api.progress.set, write);
    expect((await phone.query(api.progress.snapshot, {})).entries).toHaveLength(2);
    await phone.mutation(api.progress.set, { ...write, changes: [{ kind: 'lesson', id: 'intro', completedAt: null }] });
    expect((await desktop.query(api.progress.snapshot, {})).entries.find((e) => e.key === 'lesson:intro')?.value).toEqual({ kind: 'lesson', id: 'intro', completedAt: null });
    await desktop.mutation(api.progress.set, write);
    expect((await phone.query(api.progress.snapshot, {})).entries.find((e) => e.key === 'lesson:intro')?.value).toEqual(lesson);
  });
  it('edits separate project steps independently and preserves explicit unchecking', async () => {
    const t = create().withIdentity(identity);
    for (const [id, completed] of [['project/one', true], ['project/two', true], ['project/one', false]] as const) await t.mutation(api.progress.set, { areaId, generation: 0, changes: [{ kind: 'step', id, completed }] });
    const state = await t.query(api.progress.snapshot, {});
    expect(state.entries.map((e) => e.value)).toContainEqual({ kind: 'step', id: 'project/two', completed: true });
    expect(state.entries.map((e) => e.value)).toContainEqual({ kind: 'step', id: 'project/one', completed: false });
  });
  it('updates drafts independently of completion and never duplicates a draft', async () => {
    const t = create().withIdentity(identity);
    await t.mutation(api.progress.set, { areaId, generation: 0, changes: [completion] });
    for (const json of ['"a"', '"b"', '"b"']) await t.mutation(api.progress.saveDraft, { areaId, generation: 0, draft: { ...draft, json } });
    expect(await t.query(api.progress.draft, { areaId, exerciseId: draft.exerciseId })).toEqual({ json: '"b"', fingerprint: draft.fingerprint });
    expect((await t.query(api.progress.snapshot, {})).entries[0].value).toEqual(completion);
    expect((await t.query(api.progress.exportDrafts, { paginationOpts: { cursor: null, numItems: 16 } })).page).toHaveLength(1);
  });
  it('grades reviews from the latest stored state, rather than a stale client counter', async () => {
    const t = create();
    const request = { areaId, generation: 0, cardId: 'ownership', knew: true, today: '2026-09-28' };
    await t.withIdentity(identity).mutation(api.progress.reviewCard, request);
    await t.withIdentity(identity).mutation(api.progress.reviewCard, request);
    expect((await t.withIdentity(identity).query(api.progress.snapshot, {})).entries[0].value).toMatchObject({ kind: 'card', value: { box: 2, seen: 2, due: '2026-10-01' } });
  });
  it('imports only missing state, atomically records receipts and never resurrects unchecked progress', async () => {
    const t = create().withIdentity(identity);
    await t.mutation(api.progress.set, { areaId, generation: 0, changes: [{ kind: 'lesson', id: 'intro', completedAt: null }] });
    await t.mutation(api.progress.saveDraft, { areaId, generation: 0, draft: { ...draft, json: '"server wins"' } });
    await t.mutation(api.progress.importLegacy, imported);
    await t.mutation(api.progress.importLegacy, imported);
    expect((await t.query(api.progress.snapshot, {})).entries).toHaveLength(2);
    expect((await t.query(api.progress.snapshot, {})).entries.find((e) => e.key === 'lesson:intro')?.value).toMatchObject({ completedAt: null });
    expect(await t.query(api.progress.draft, { areaId, exerciseId: draft.exerciseId })).toMatchObject({ json: '"server wins"' });
    expect(await t.run((ctx) => ctx.db.query('imports').collect())).toHaveLength(1);
    await t.mutation(api.progress.importLegacy, { ...imported, importId: 'b'.repeat(64), entries: [], drafts: [] });
    expect((await t.query(api.progress.snapshot, {})).entries).toHaveLength(2);
  });
  it('rejects old in-flight writes after reset; only an explicit backup can restore missing entries', async () => {
    const t = create().withIdentity(identity);
    await t.mutation(api.progress.importLegacy, imported);
    await t.mutation(api.progress.resetArea, { areaId, generation: 0 });
    expect((await t.query(api.progress.snapshot, {})).entries).toEqual([]);
    await expect(t.mutation(api.progress.set, { areaId, generation: 0, changes: [lesson] })).rejects.toThrow('PROGRESS_WAS_RESET');
    await expect(t.mutation(api.progress.saveDraft, { areaId, generation: 0, draft })).rejects.toThrow('PROGRESS_WAS_RESET');
    await expect(t.mutation(api.progress.importLegacy, { ...imported, generation: 1, importId: 'c'.repeat(64) })).rejects.toThrow('LEGACY_IMPORT_AFTER_RESET');
    await t.mutation(api.progress.importLegacy, { ...imported, mode: 'backup', generation: 1, importId: 'd'.repeat(64) });
    expect((await t.query(api.progress.snapshot, {})).entries).toHaveLength(2);
  });
  it('rolls back an invalid import chunk and rejects oversized or unsafe drafts', async () => {
    const t = create().withIdentity(identity);
    await expect(t.mutation(api.progress.importLegacy, { ...imported, entries: [lesson, { kind: 'lesson', id: '__proto__', completedAt: null }] })).rejects.toThrow('INVALID_ID');
    expect((await t.query(api.progress.snapshot, {})).entries).toEqual([]);
    expect(await t.run((ctx) => ctx.db.query('imports').collect())).toEqual([]);
    for (const json of ['"' + 'x'.repeat(60_000) + '"', '{"__proto__":{}}', '{bad']) await expect(t.mutation(api.progress.saveDraft, { areaId, generation: 0, draft: { ...draft, json } })).rejects.toThrow();
  });
  it('shares lesson notes across sessions, lists them without text and deletes emptied notes', async () => {
    const t = create(); const desktop = t.withIdentity(identity); const phone = t.withIdentity(identity);
    for (const text of ['Erste Idee', note.text, note.text]) await desktop.mutation(api.progress.saveNote, { areaId, note: { ...note, text } });
    expect(await phone.query(api.progress.note, { areaId, moduleId: note.moduleId })).toBe(note.text);
    expect(await phone.query(api.progress.noteIndex, {})).toEqual([{ areaId, moduleId: note.moduleId }]);
    expect((await phone.query(api.progress.exportNotes, { paginationOpts: { cursor: null, numItems: 16 } })).page).toEqual([{ areaId, ...note }]);
    expect(await t.run((ctx) => ctx.db.query('notes').collect())).toHaveLength(1);
    await phone.mutation(api.progress.saveNote, { areaId, note: { ...note, text: '  \n' } });
    expect(await desktop.query(api.progress.note, { areaId, moduleId: note.moduleId })).toBeNull();
    expect(await desktop.query(api.progress.noteIndex, {})).toEqual([]);
  });
  it('keeps notes when progress is reset and imports only missing notes', async () => {
    const t = create().withIdentity(identity);
    await t.mutation(api.progress.saveNote, { areaId, note });
    await t.mutation(api.progress.resetArea, { areaId, generation: 0 });
    expect(await t.query(api.progress.note, { areaId, moduleId: note.moduleId })).toBe(note.text);
    await t.mutation(api.progress.importLegacy, { ...imported, mode: 'backup', generation: 1, notes: [{ ...note, text: 'aus der Sicherung' }, { moduleId: 'second', text: 'neu' }, { moduleId: 'empty', text: ' ' }] });
    expect(await t.query(api.progress.note, { areaId, moduleId: note.moduleId })).toBe(note.text);
    expect(await t.query(api.progress.note, { areaId, moduleId: 'second' })).toBe('neu');
    expect(await t.query(api.progress.noteIndex, {})).toHaveLength(2);
  });
  it('rejects oversized notes and invalid lesson IDs', async () => {
    const t = create().withIdentity(identity);
    await expect(t.mutation(api.progress.saveNote, { areaId, note: { ...note, text: 'x'.repeat(20_001) } })).rejects.toThrow('NOTE_TOO_LARGE');
    await expect(t.mutation(api.progress.saveNote, { areaId, note: { ...note, moduleId: '__proto__' } })).rejects.toThrow('INVALID_ID');
    await expect(t.mutation(api.progress.importLegacy, { ...imported, notes: Array.from({ length: 5 }, (_, i) => ({ moduleId: `m${i}`, text: 'x' })) })).rejects.toThrow('BATCH_TOO_LARGE');
    expect(await t.query(api.progress.noteIndex, {})).toEqual([]);
  });
  it('rejects spoofed owner arguments and malformed positions', async () => {
    const t = create().withIdentity(identity);
    const forged = { areaId, generation: 0, owner: identity.subject, changes: [lesson] };
    await expect(t.mutation(api.progress.set, forged)).rejects.toThrow();
    await expect(t.mutation(api.progress.set, { areaId, generation: 0, changes: [{ kind: 'position', id: 'last', value: { page: 'exercise', moduleId: 'intro', exerciseId: 'other/exercise' } }] })).rejects.toThrow('INVALID_POSITION');
  });
  it('rejects reserved object keys in all ID segments before writing state', async () => {
    const t = create().withIdentity(identity);
    for (const key of ['constructor', 'prototype', '__proto__']) {
      await expect(t.mutation(api.progress.set, { areaId: key, generation: 0, changes: [lesson] })).rejects.toThrow('INVALID_ID');
      await expect(t.mutation(api.progress.set, { areaId, generation: 0, changes: [{ kind: 'step', id: `project/${key}`, completed: true }] })).rejects.toThrow('INVALID_ID');
    }
    expect((await t.query(api.progress.snapshot, {})).entries).toEqual([]);
  });
});
