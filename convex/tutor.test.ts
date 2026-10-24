import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from './schema';
import { api, internal } from './_generated/api';
import { tutorRequest } from '../src/engine/tutor-context';
import { buildPrompt, costMicros, promptChars, worstCaseMicros, type TutorRequest } from '../src/engine/tutor';
import type { ExplainExercise, GapExercise, Module, PracticeExercise } from '../src/content/types';

// The tutor against a fake provider: fetch is replaced, so the official SDK builds its real request but nothing leaves
// the machine. The fake answers like the Messages API and simulates the prompt cache by comparing request prefixes.

const modules = import.meta.glob('./**/*.ts');
const identity = { issuer: 'https://learning.clerk.accounts.dev', subject: 'user_owner' };
// Small stand-ins for content (the Convex deployment typechecks this file without tooling/ and content/).
const base = { wiki: null, hints: [], resources: [], fingerprint: 'fp', source: null, explanation: '<p>Erklärung</p>' };
const gap: GapExercise = {
  ...base, id: 'alle-typen/lueckentext', module: 'alle-typen', title: 'Eine Funktion ergänzen', prompt: '<p>Ergänze das Schlüsselwort und den Rückgabewert.</p>',
  type: 'gap', lang: 'python', code: '⟦1⟧ doppelt(x):\n    return ⟦2⟧',
  gaps: [{ id: 'g1', label: 'Funktionsdefinition', answers: ['def'], hint: '', multiline: false }, { id: 'g2', label: 'Rückgabe', answers: ['x * 2', '2 * x'], hint: '', multiline: false }],
};
// About 3,000 characters like a short lesson, so cache sizes resemble real requests.
const lesson = `<h2 id="einstieg">Einstieg</h2>${'<p>Eine Funktion bündelt Anweisungen unter einem Namen und gibt mit <code>return</code> einen Wert zurück.</p>'.repeat(30)}`;
const module = { title: 'Alle Übungsarten', lesson, toc: [{ id: 'einstieg', title: 'Einstieg' }], exercises: [gap] } as unknown as Module;
const analysis: ExplainExercise = { ...base, id: 'texte/wirkung', module: 'texte', title: 'Was bewirkt die Frage?', prompt: '<p>Erkläre die Wirkung.</p>', type: 'explain', lang: 'prose', code: 'Wer reitet so spät durch Nacht und Wind?', points: ['Die Frage zieht dich in die Szene.'] };
const own: PracticeExercise = { ...base, id: 'texte/eigener-text', module: 'texte', title: 'Drei eigene Sätze', prompt: '<p>Schreib drei Sätze.</p>', type: 'practice', lang: 'prose', starter: '', solution: '', checklist: ['Drei Sätze.'] };
const texts = { title: 'Übungen mit Fließtext', lesson: '<p>Fließtext statt Code.</p>', toc: [], exercises: [analysis, own] } as unknown as Module;
const ask = (overrides: Partial<Parameters<typeof tutorRequest>[0]> = {}): TutorRequest => tutorRequest({
  areaId: 'beispiel', module, exercise: gap, draft: { g1: 'fun', g2: 'x + x' }, done: false, feedback: '', previous: [], question: '', level: 1, ...overrides,
});
const create = () => convexTest(schema, modules);
const month = new Date().toISOString().slice(0, 7);

type Sent = { url: string; headers: Record<string, string>; body: string; json: { model: string; max_tokens: number; system: unknown; messages: { content: { text: string; cache_control?: unknown }[] }[]; [key: string]: unknown } };
let sent: Sent[];
let replies: { text: string; stop?: string }[];
const seenPrefixes = new Set<string>();
const fakeProvider = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!url.startsWith('https://api.anthropic.com/v1/messages')) throw new Error(`unexpected request to ${url}`);
  const body = String(init?.body);
  const json = JSON.parse(body) as Sent['json'];
  sent.push({ url, headers: Object.fromEntries(new Headers(init?.headers).entries()), body, json });
  // Cache simulation: the prefix up to the last breakpoint is read from the cache when an identical one was sent before.
  const prefix = JSON.stringify([json.model, json.system, json.messages[0].content.slice(0, 2)]);
  const prefixTokens = Math.ceil(prefix.length / 4);
  const hit = seenPrefixes.has(prefix);
  seenPrefixes.add(prefix);
  const reply = replies.shift() ?? { text: 'Welches Schlüsselwort leitet in Python eine Funktion ein?' };
  return new Response(JSON.stringify({
    id: `msg_${sent.length}`, type: 'message', role: 'assistant', model: json.model,
    content: [{ type: 'text', text: reply.text, citations: null }], stop_reason: reply.stop ?? 'end_turn', stop_sequence: null, stop_details: null,
    usage: { input_tokens: Math.ceil(json.messages[0].content[2].text.length / 4), cache_creation_input_tokens: hit ? 0 : prefixTokens, cache_read_input_tokens: hit ? prefixTokens : 0, output_tokens: 120 },
  }), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_fake' } });
});

beforeEach(() => {
  sent = []; replies = []; seenPrefixes.clear(); fakeProvider.mockClear();
  vi.stubEnv('CLERK_JWT_ISSUER_DOMAIN', identity.issuer);
  vi.stubEnv('ALLOWED_CLERK_USER_ID', identity.subject);
  vi.stubGlobal('fetch', fakeProvider);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const withKey = (env: Record<string, string> = {}) => { vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test-not-a-real-key'); for (const [k, value] of Object.entries(env)) vi.stubEnv(k, value); };

describe('access', () => {
  it('rejects everyone but the owner', async () => {
    withKey();
    await expect(create().query(api.tutor.status, {})).rejects.toThrow('ACCESS_DENIED');
    await expect(create().action(api.tutor.ask, ask())).rejects.toThrow('ACCESS_DENIED');
    await expect(create().withIdentity({ ...identity, subject: 'user_intruder' }).action(api.tutor.ask, ask())).rejects.toThrow('ACCESS_DENIED');
    expect(fakeProvider).not.toHaveBeenCalled();
  });
});

describe('without ANTHROPIC_API_KEY', () => {
  it('reports the tutor as absent and never calls a provider', async () => {
    const t = create().withIdentity(identity);
    expect(await t.query(api.tutor.status, {})).toEqual({ enabled: false, problem: null });
    expect(await t.action(api.tutor.ask, ask())).toEqual({ ok: false, reason: 'disabled' });
    expect(fakeProvider).not.toHaveBeenCalled();
    expect(await t.query(internal.tutor.monthUsage, { month })).toBeNull();
  });
  it('stays off with a key but a model whose cost it cannot count', async () => {
    withKey({ TUTOR_MODEL: 'gpt-6-luna' });
    const t = create().withIdentity(identity);
    expect(await t.query(api.tutor.status, {})).toMatchObject({ enabled: false, problem: expect.stringContaining('gpt-6-luna') });
    expect(await t.action(api.tutor.ask, ask())).toEqual({ ok: false, reason: 'disabled' });
    expect(fakeProvider).not.toHaveBeenCalled();
  });
});

describe('a hint', () => {
  it('sends the proposed model and effort without sampling parameters or identifiers, and books the cost', async () => {
    withKey();
    const t = create().withIdentity(identity);
    const reply = await t.action(api.tutor.ask, ask());
    expect(reply).toEqual({ ok: true, text: 'Welches Schlüsselwort leitet in Python eine Funktion ein?', retried: false });
    const [request] = sent;
    expect(request.json).toMatchObject({ model: 'claude-sonnet-5-5', max_tokens: 1500, output_config: { effort: 'medium' } });
    expect(Object.keys(request.json).sort()).toEqual(['max_tokens', 'messages', 'model', 'output_config', 'system']);
    // No personal identifiers anywhere in the payload: no account, issuer, e-mail, metadata or exercise ID.
    const everything = JSON.stringify({ body: request.body, headers: request.headers });
    for (const forbidden of [identity.subject, identity.issuer, 'user_', 'alle-typen/lueckentext', 'metadata']) expect(everything).not.toContain(forbidden);
    const texts = [...request.json.system as { text: string }[], ...request.json.messages[0].content].map((block) => block.text);
    expect([...texts, ...Object.values(request.headers)].join('\n')).not.toMatch(/[\w.+-]+@[a-z0-9-]+\.[a-z]{2,}/i);
    const row = await t.query(internal.tutor.monthUsage, { month });
    const usage = { input: row!.inputTokens, cacheWrite: row!.cacheWriteTokens, cacheRead: row!.cacheReadTokens, output: row!.outputTokens };
    expect(row).toMatchObject({ requests: 1, pendingMicros: 0, outputTokens: 120, costMicros: costMicros('claude-sonnet-5-5', usage) });
    expect(await t.query(api.tutor.status, {})).toMatchObject({ enabled: true, month, requests: 1, spentMicros: row!.costMicros, budgetMicros: 5_000_000, warn: false, exhausted: false });
  });
  it('hits the prompt cache on the next hint for the same exercise', async () => {
    withKey();
    const t = create().withIdentity(identity);
    await t.action(api.tutor.ask, ask());
    const first = await t.query(internal.tutor.monthUsage, { month });
    expect(first!.cacheReadTokens).toBe(0);
    expect(first!.cacheWriteTokens).toBeGreaterThan(1000);
    await t.action(api.tutor.ask, ask({ level: 2, draft: { g1: 'def', g2: '' }, previous: ['Welches Schlüsselwort …?'], question: 'Ist es `fn`?' }));
    const second = await t.query(internal.tutor.monthUsage, { month });
    expect(second!.cacheReadTokens).toBeGreaterThan(1000);
    expect(second!.cacheWriteTokens).toBe(first!.cacheWriteTokens);
    // Byte-identical up to the second breakpoint; everything that changed comes after it.
    const [a, b] = sent.map((s) => s.body);
    const breakpoint = a.lastIndexOf('"cache_control"');
    expect(b.slice(0, breakpoint)).toBe(a.slice(0, breakpoint));
    expect(sent[1].json.messages[0].content.map((block) => !!block.cache_control)).toEqual([true, true, false]);
  });
  it('applies the narrative rule and gives no tutor for own texts', async () => {
    withKey();
    const t = create().withIdentity(identity);
    await t.action(api.tutor.ask, ask({ areaId: 'narrative', module: texts, exercise: analysis, draft: { text: 'Die Frage macht neugierig.', revealed: false, checked: [] } }));
    expect(JSON.stringify(sent[0].json.system)).toContain('keine inhaltlichen Vorschläge');
    expect(await t.action(api.tutor.ask, ask({ areaId: 'narrative', module: texts, exercise: own, draft: { code: 'Es regnet.', checked: [] } }))).toEqual({ ok: false, reason: 'not_allowed' });
    expect(sent).toHaveLength(1);
  });
});

describe('solution check', () => {
  it('discards an answer with the solution and asks once more', async () => {
    withKey();
    replies = [{ text: 'Schreib `def` und gib `x * 2` zurück.' }, { text: 'Was soll die Funktion mit `x` machen?' }];
    const t = create().withIdentity(identity);
    expect(await t.action(api.tutor.ask, ask({ level: 3 }))).toEqual({ ok: true, text: 'Was soll die Funktion mit `x` machen?', retried: true });
    expect(sent).toHaveLength(2);
    expect(sent[1].json.messages[0].content[2].text).toContain('wurde verworfen');
    expect((await t.query(internal.tutor.monthUsage, { month }))!.requests).toBe(2);
  });
  it('gives up after a second leak so the page falls back to the static hints', async () => {
    withKey();
    replies = [{ text: '`def` … `x * 2`' }, { text: 'Also: `def doppelt(x): return 2 * x`' }];
    const t = create().withIdentity(identity);
    expect(await t.action(api.tutor.ask, ask({ level: 3 }))).toEqual({ ok: false, reason: 'leak' });
    expect(sent).toHaveLength(2);
  });
  it('answers freely once the exercise is solved or the solution was shown', async () => {
    withKey();
    replies = [{ text: '`x * 2` und `2 * x` sind gleichwertig, weil die Multiplikation kommutativ ist.' }];
    const t = create().withIdentity(identity);
    expect(await t.action(api.tutor.ask, ask({ done: true, question: 'Geht auch `2 * x`?' }))).toMatchObject({ ok: true, retried: false });
    expect(sent[0].json.messages[0].content[2].text).toContain('Die Übung ist gelöst');
  });
});

describe('monthly budget', () => {
  it('refuses before calling when the worst case of a request would exceed the budget', async () => {
    withKey({ TUTOR_MONTHLY_BUDGET_USD: '0.01' });
    const t = create().withIdentity(identity);
    expect(worstCaseMicros('claude-sonnet-5-5', promptChars(buildPrompt(ask())))).toBeGreaterThan(10_000);
    expect(await t.action(api.tutor.ask, ask())).toEqual({ ok: false, reason: 'budget' });
    expect(fakeProvider).not.toHaveBeenCalled();
    expect(await t.query(api.tutor.status, {})).toMatchObject({ enabled: true, spentMicros: 0, exhausted: true });
  });
  it('never books more than the budget, also for parallel requests', async () => {
    // Room for exactly two worst cases: while two requests are in flight, the other two must be refused.
    const worst = worstCaseMicros('claude-sonnet-5-5', promptChars(buildPrompt(ask())));
    withKey({ TUTOR_MONTHLY_BUDGET_USD: (Math.ceil(worst * 2.5 / 10_000) / 100).toFixed(2) });
    const t = create().withIdentity(identity);
    const respond = fakeProvider.getMockImplementation()!;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    fakeProvider.mockImplementation(async (...args) => { await gate; return respond(...args); });
    const running = Promise.all([1, 2, 3, 4].map(() => t.action(api.tutor.ask, ask())));
    await vi.waitFor(() => expect(fakeProvider).toHaveBeenCalledTimes(2));
    release();
    const replies = await running;
    fakeProvider.mockImplementation(respond);
    expect(replies.filter((r) => r.ok)).toHaveLength(2);
    expect(replies.filter((r) => !r.ok)).toEqual([{ ok: false, reason: 'budget' }, { ok: false, reason: 'budget' }]);
    const row = await t.query(internal.tutor.monthUsage, { month });
    expect(row).toMatchObject({ requests: 2, pendingMicros: 0 });
  });
  it('warns at 80 % and pauses at the end of the budget', async () => {
    withKey({ TUTOR_MONTHLY_BUDGET_USD: '1' });
    const t = create().withIdentity(identity);
    await t.run(async (ctx) => { await ctx.db.insert('tutorUsage', { month, requests: 80, inputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, outputTokens: 0, costMicros: 850_000, pendingMicros: 0, updatedAt: 0 }); });
    expect(await t.query(api.tutor.status, {})).toMatchObject({ warn: true, exhausted: false });
    await t.run(async (ctx) => { const row = (await ctx.db.query('tutorUsage').first())!; await ctx.db.patch(row._id, { costMicros: 990_000 }); });
    expect(await t.query(api.tutor.status, {})).toMatchObject({ warn: true, exhausted: true });
    expect(await t.action(api.tutor.ask, ask())).toEqual({ ok: false, reason: 'budget' });
    expect(fakeProvider).not.toHaveBeenCalled();
  });
  it('counts refused and cut-off answers, and releases the reservation when the provider fails', async () => {
    withKey();
    const t = create().withIdentity(identity);
    replies = [{ text: '', stop: 'refusal' }, { text: 'Lange Überlegung …', stop: 'max_tokens' }];
    expect(await t.action(api.tutor.ask, ask())).toEqual({ ok: false, reason: 'refusal' });
    expect(await t.action(api.tutor.ask, ask())).toEqual({ ok: false, reason: 'truncated' });
    fakeProvider.mockImplementationOnce(async () => new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } }), { status: 400, headers: { 'content-type': 'application/json' } }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await t.action(api.tutor.ask, ask())).toEqual({ ok: false, reason: 'provider' });
    expect(await t.query(internal.tutor.monthUsage, { month })).toMatchObject({ requests: 2, pendingMicros: 0 });
  });
  it('rejects oversized context before reserving anything', async () => {
    withKey();
    const t = create().withIdentity(identity);
    expect(await t.action(api.tutor.ask, { ...ask(), lesson: { title: 'Zu lang', text: 'x'.repeat(60_001) } })).toEqual({ ok: false, reason: 'too_large' });
    expect(await t.query(internal.tutor.monthUsage, { month })).toBeNull();
  });
});
