import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query, type MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { requireOwner } from './auth';
import { assertId, assertPair, draftInput, entry, entryKey, grade, validateDraft, validateEntry, type Entry } from './model';
import { schedule } from '../src/engine/review';

async function checkGeneration(ctx: MutationCtx, areaId: string, generation: number) {
  assertId(areaId);
  const reset = await ctx.db.query('areaResets').withIndex('by_area', (q) => q.eq('areaId', areaId)).unique();
  if (!Number.isSafeInteger(generation) || generation !== (reset?.generation ?? 0)) throw new ConvexError('PROGRESS_WAS_RESET');
  return reset;
}
async function put(ctx: MutationCtx, areaId: string, value: Entry, missingOnly = false) {
  validateEntry(value);
  const key = entryKey(value);
  const existing = await ctx.db.query('progress').withIndex('by_area_key', (q) => q.eq('areaId', areaId).eq('key', key)).unique();
  if (existing && (missingOnly || (value.kind !== 'position' && JSON.stringify(existing.value) === JSON.stringify(value)))) return;
  const record = { areaId, key, value, updatedAt: Date.now() };
  if (existing) await ctx.db.replace(existing._id, record); else await ctx.db.insert('progress', record);
}

export const snapshot = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const entries = (await ctx.db.query('progress').collect()).map(({ areaId, key, value, updatedAt }) => ({ areaId, key, value, updatedAt }));
    const resets = (await ctx.db.query('areaResets').collect()).map(({ areaId, generation }) => ({ areaId, generation }));
    return { entries, resets };
  },
});

export const set = mutation({
  args: { areaId: v.string(), generation: v.number(), changes: v.array(entry) },
  handler: async (ctx, { areaId, generation, changes }) => {
    await requireOwner(ctx);
    await checkGeneration(ctx, areaId, generation);
    if (changes.length > 32) throw new ConvexError('BATCH_TOO_LARGE');
    for (const value of changes) await put(ctx, areaId, value);
  },
});

export const reviewCard = mutation({
  // `knew` is the former two-button rating (true = good, false = again); tabs opened before the update still send it.
  args: { areaId: v.string(), generation: v.number(), cardId: v.string(), grade: v.optional(grade), knew: v.optional(v.boolean()), today: v.string() },
  handler: async (ctx, { areaId, generation, cardId, grade, knew, today }) => {
    await requireOwner(ctx);
    await checkGeneration(ctx, areaId, generation);
    assertId(cardId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || !Number.isFinite(Date.parse(today))) throw new ConvexError('INVALID_DATE');
    const rating = grade ?? (knew === undefined ? undefined : knew ? 'good' : 'again');
    if (!rating) throw new ConvexError('INVALID_GRADE');
    const current = await ctx.db.query('progress').withIndex('by_area_key', (q) => q.eq('areaId', areaId).eq('key', `card:${cardId}`)).unique();
    const state = current?.value.kind === 'card' ? current.value.value : undefined;
    const next = schedule(state, rating, today);
    await put(ctx, areaId, { kind: 'card', id: cardId, value: next });
    await ctx.db.insert('cardReviews', { areaId, generation, cardId, grade: rating, day: today, reviewedAt: Date.now(), box: next.box, due: next.due });
  },
});

export const draft = query({
  args: { areaId: v.string(), exerciseId: v.string() },
  handler: async (ctx, { areaId, exerciseId }) => {
    await requireOwner(ctx);
    assertId(areaId); assertPair(exerciseId);
    const reset = await ctx.db.query('areaResets').withIndex('by_area', (q) => q.eq('areaId', areaId)).unique();
    const value = await ctx.db.query('drafts').withIndex('by_area_generation_exercise', (q) => q.eq('areaId', areaId).eq('generation', reset?.generation ?? 0).eq('exerciseId', exerciseId)).unique();
    return value ? { json: value.json, fingerprint: value.fingerprint } : null;
  },
});

export const saveDraft = mutation({
  args: { areaId: v.string(), generation: v.number(), draft: draftInput },
  handler: async (ctx, { areaId, generation, draft }) => {
    await requireOwner(ctx);
    await checkGeneration(ctx, areaId, generation);
    validateDraft(draft);
    const existing = await ctx.db.query('drafts').withIndex('by_area_generation_exercise', (q) => q.eq('areaId', areaId).eq('generation', generation).eq('exerciseId', draft.exerciseId)).unique();
    if (existing?.json === draft.json && existing.fingerprint === draft.fingerprint) return;
    const record = { areaId, generation, ...draft, updatedAt: Date.now() };
    if (existing) await ctx.db.replace(existing._id, record); else await ctx.db.insert('drafts', record);
  },
});

export const exportDrafts = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireOwner(ctx);
    const resets = new Map((await ctx.db.query('areaResets').collect()).map((r) => [r.areaId, r.generation]));
    const result = await ctx.db.query('drafts').paginate({ ...paginationOpts, numItems: Math.min(paginationOpts.numItems, 16) });
    return { ...result, page: result.page.filter((d) => d.generation === (resets.get(d.areaId) ?? 0)) };
  },
});

/** Chunked, transactional, insert-only import: explicit false/null records are tombstones. */
export const importLegacy = mutation({
  args: { areaId: v.string(), generation: v.number(), importId: v.string(), mode: v.union(v.literal('legacy'), v.literal('backup')), entries: v.array(entry), drafts: v.array(draftInput) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const reset = await checkGeneration(ctx, args.areaId, args.generation);
    if (!/^[a-f0-9]{64}$/.test(args.importId)) throw new ConvexError('INVALID_IMPORT_ID');
    if (args.entries.length > 32 || args.drafts.length > 4) throw new ConvexError('BATCH_TOO_LARGE');
    const receipt = await ctx.db.query('imports').withIndex('by_area_import', (q) => q.eq('areaId', args.areaId).eq('importId', args.importId)).unique();
    if (receipt) return;
    if (args.mode === 'legacy' && reset) throw new ConvexError('LEGACY_IMPORT_AFTER_RESET');
    for (const value of args.entries) await put(ctx, args.areaId, value, true);
    for (const draft of args.drafts) {
      validateDraft(draft);
      const existing = await ctx.db.query('drafts').withIndex('by_area_generation_exercise', (q) => q.eq('areaId', args.areaId).eq('generation', args.generation).eq('exerciseId', draft.exerciseId)).unique();
      if (!existing) await ctx.db.insert('drafts', { areaId: args.areaId, generation: args.generation, ...draft, updatedAt: Date.now() });
    }
    await ctx.db.insert('imports', { areaId: args.areaId, importId: args.importId, importedAt: Date.now() });
  },
});

export const resetArea = mutation({
  args: { areaId: v.string(), generation: v.number() },
  handler: async (ctx, { areaId, generation }) => {
    await requireOwner(ctx);
    const reset = await checkGeneration(ctx, areaId, generation);
    for (const record of await ctx.db.query('progress').withIndex('by_area_key', (q) => q.eq('areaId', areaId)).collect()) await ctx.db.delete(record._id);
    if (reset) await ctx.db.patch(reset._id, { generation: generation + 1 });
    else await ctx.db.insert('areaResets', { areaId, generation: 1 });
    await ctx.scheduler.runAfter(0, internal.progress.purgeDrafts, { areaId, generation });
    await ctx.scheduler.runAfter(0, internal.progress.purgeReviews, { areaId, generation });
    // Keep receipts: an old device must not silently restore a deliberately reset area.
  },
});

/** Old draft generations become unreadable immediately; physical deletion is bounded to <1 MB per batch. */
export const purgeDrafts = internalMutation({
  args: { areaId: v.string(), generation: v.number() },
  handler: async (ctx, { areaId, generation }) => {
    const reset = await ctx.db.query('areaResets').withIndex('by_area', (q) => q.eq('areaId', areaId)).unique();
    if (!reset || reset.generation <= generation) return;
    const rows = await ctx.db.query('drafts').withIndex('by_area_generation_exercise', (q) => q.eq('areaId', areaId).eq('generation', generation)).take(16);
    for (const row of rows) await ctx.db.delete(row._id);
    if (rows.length === 16) await ctx.scheduler.runAfter(0, internal.progress.purgeDrafts, { areaId, generation });
  },
});

/** Review history of a reset generation, deleted in bounded batches like drafts. */
export const purgeReviews = internalMutation({
  args: { areaId: v.string(), generation: v.number() },
  handler: async (ctx, { areaId, generation }) => {
    const reset = await ctx.db.query('areaResets').withIndex('by_area', (q) => q.eq('areaId', areaId)).unique();
    if (!reset || reset.generation <= generation) return;
    const rows = await ctx.db.query('cardReviews').withIndex('by_area_generation_card', (q) => q.eq('areaId', areaId).eq('generation', generation)).take(256);
    for (const row of rows) await ctx.db.delete(row._id);
    if (rows.length === 256) await ctx.scheduler.runAfter(0, internal.progress.purgeReviews, { areaId, generation });
  },
});
