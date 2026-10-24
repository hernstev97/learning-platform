import Anthropic from '@anthropic-ai/sdk';
import { v } from 'convex/values';
import { action, internalMutation, internalQuery, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { internal } from './_generated/api';
import { requireOwner } from './auth';
import { assertId } from './model';
import {
  buildPrompt, costMicros, leaksSolution, promptChars, tutorAllowed, tutorConfig, tutorRequestProblem, tutorStatus, usageMonth, worstCaseMicros,
  TUTOR_MAX_TOKENS, type TutorReply, type TutorStatus,
} from '../src/engine/tutor';

// Optional AI tutor (LRN-6). Without ANTHROPIC_API_KEY in the Convex environment it does not exist for the app.
// The client sends only learning content (src/engine/tutor-context.ts); nothing here adds IDs or account data.

const findMonth = (ctx: QueryCtx | MutationCtx, month: string) => ctx.db.query('tutorUsage').withIndex('by_month', (q) => q.eq('month', month)).unique();

/** `month` comes from the client clock so that a subscription moves on at the turn of the month; the server's is the fallback. */
export const status = query({
  args: { month: v.optional(v.string()) },
  handler: async (ctx, args): Promise<TutorStatus> => {
    await requireOwner(ctx);
    const config = tutorConfig(process.env);
    if (!config.enabled) return tutorStatus(config, '', 0, 0, 0);
    const month = args.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(args.month) ? args.month : usageMonth(new Date());
    const row = await findMonth(ctx, month);
    return tutorStatus(config, month, row?.costMicros ?? 0, row?.pendingMicros ?? 0, row?.requests ?? 0);
  },
});

/** No request runs this long (90 s timeout, at most two attempts); an older reservation was left by an aborted action. */
const STALE_RESERVATION_MS = 15 * 60_000;

/** Books the most a request can cost before it is sent; false when that would exceed the monthly budget. */
export const reserve = internalMutation({
  args: { month: v.string(), micros: v.number(), budgetMicros: v.number() },
  handler: async (ctx, { month, micros, budgetMicros }) => {
    const row = await findMonth(ctx, month);
    const pending = row && Date.now() - row.updatedAt < STALE_RESERVATION_MS ? row.pendingMicros : 0;
    if ((row?.costMicros ?? 0) + pending + micros > budgetMicros) return false;
    if (row) await ctx.db.patch(row._id, { pendingMicros: pending + micros, updatedAt: Date.now() });
    else await ctx.db.insert('tutorUsage', { month, requests: 0, inputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, outputTokens: 0, costMicros: 0, pendingMicros: micros, updatedAt: Date.now() });
    return true;
  },
});

/** Replaces a reservation by the actual usage from the response; without usage (failed request) it only releases it. */
export const settle = internalMutation({
  args: { month: v.string(), reserved: v.number(), usage: v.union(v.null(), v.object({ input: v.number(), cacheWrite: v.number(), cacheRead: v.number(), output: v.number(), costMicros: v.number() })) },
  handler: async (ctx, { month, reserved, usage }) => {
    const row = await findMonth(ctx, month);
    if (!row) return;
    await ctx.db.patch(row._id, {
      pendingMicros: Math.max(0, row.pendingMicros - reserved),
      ...(usage ? {
        requests: row.requests + 1,
        inputTokens: row.inputTokens + usage.input, cacheWriteTokens: row.cacheWriteTokens + usage.cacheWrite,
        cacheReadTokens: row.cacheReadTokens + usage.cacheRead, outputTokens: row.outputTokens + usage.output,
        costMicros: row.costMicros + usage.costMicros,
      } : {}),
      updatedAt: Date.now(),
    });
  },
});

/** For tests and the eval: the stored counters of one month. */
export const monthUsage = internalQuery({
  args: { month: v.string() },
  handler: async (ctx, { month }) => await findMonth(ctx, month),
});

const tutorRequest = {
  areaId: v.string(),
  kind: v.string(),
  level: v.union(v.literal(1), v.literal(2), v.literal(3)),
  done: v.boolean(),
  lesson: v.object({ title: v.string(), text: v.string() }),
  exercise: v.string(),
  attempt: v.string(),
  feedback: v.string(),
  previous: v.array(v.string()),
  question: v.string(),
  leak: v.object({ lang: v.string(), groups: v.array(v.object({ answers: v.array(v.string()), given: v.string(), exact: v.optional(v.boolean()) })), lines: v.array(v.number()), lineTexts: v.array(v.string()), options: v.array(v.number()), visible: v.string() }),
};

/**
 * One hint (levels 1–3) or, once solved, one answer. Checks owner, size and budget first. An answer that contains an
 * accepted solution while the exercise is unsolved is discarded and requested once more; a second leak returns
 * `leak` and the page falls back to the static hints.
 */
export const ask = action({
  args: tutorRequest,
  handler: async (ctx, request): Promise<TutorReply> => {
    await requireOwner(ctx);
    const config = tutorConfig(process.env);
    if (!config.enabled) return { ok: false, reason: 'disabled' };
    assertId(request.areaId);
    if (tutorRequestProblem(request)) return { ok: false, reason: 'too_large' };
    if (!tutorAllowed(request.areaId, request.kind, request.leak)) return { ok: false, reason: 'not_allowed' };
    // No automatic retries: a retried request could be billed twice without being counted.
    const client = new Anthropic({ apiKey: config.apiKey, maxRetries: 0, timeout: 90_000 });
    for (const retry of [false, true]) {
      const prompt = buildPrompt(request, retry);
      const month = usageMonth(new Date());
      const reserved = worstCaseMicros(config.model, promptChars(prompt));
      if (!await ctx.runMutation(internal.tutor.reserve, { month, micros: reserved, budgetMicros: config.budgetMicros })) return { ok: false, reason: 'budget' };
      let message: Anthropic.Message;
      try {
        message = await client.messages.create({ model: config.model, max_tokens: TUTOR_MAX_TOKENS, output_config: { effort: config.effort }, system: prompt.system, messages: prompt.messages });
      } catch (error) {
        // After a timeout the request may still have been billed: the reservation then counts as spent.
        const timedOut = error instanceof Anthropic.APIConnectionTimeoutError;
        await ctx.runMutation(internal.tutor.settle, { month, reserved, usage: timedOut ? { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, costMicros: reserved } : null });
        // Status and class only: the request carries the learner's text.
        console.error('tutor request failed', error instanceof Anthropic.APIError ? `${error.constructor.name} ${error.status ?? ''}` : String((error as Error)?.name));
        return { ok: false, reason: 'provider' };
      }
      const counted = { input: message.usage.input_tokens ?? 0, cacheWrite: message.usage.cache_creation_input_tokens ?? 0, cacheRead: message.usage.cache_read_input_tokens ?? 0, output: message.usage.output_tokens };
      await ctx.runMutation(internal.tutor.settle, { month, reserved, usage: { ...counted, costMicros: costMicros(config.model, counted) } });
      if (message.stop_reason === 'refusal') return { ok: false, reason: 'refusal' };
      if (message.stop_reason === 'max_tokens') return { ok: false, reason: 'truncated' };
      const text = message.content.flatMap((block) => block.type === 'text' ? [block.text] : []).join('\n\n').trim();
      if (!text) return { ok: false, reason: 'provider' };
      if (request.done || !leaksSolution(text, request.leak, request.attempt)) return { ok: true, text, retried: retry };
    }
    return { ok: false, reason: 'leak' };
  },
});
