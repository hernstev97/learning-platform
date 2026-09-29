import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { entry, grade } from './model';

export default defineSchema({
  // One personal dataset. Only requireOwner may grant access; no client owner IDs.
  progress: defineTable({ areaId: v.string(), key: v.string(), value: entry, updatedAt: v.number() })
    .index('by_area_key', ['areaId', 'key']),
  drafts: defineTable({ areaId: v.string(), generation: v.number(), exerciseId: v.string(), fingerprint: v.string(), json: v.string(), updatedAt: v.number() })
    .index('by_area_generation_exercise', ['areaId', 'generation', 'exerciseId']),
  // One row per card rating, for the history and a later change of algorithm. Not part of the snapshot.
  cardReviews: defineTable({ areaId: v.string(), generation: v.number(), cardId: v.string(), grade, day: v.string(), reviewedAt: v.number(), box: v.number(), due: v.string() })
    .index('by_area_generation_card', ['areaId', 'generation', 'cardId']),
  areaResets: defineTable({ areaId: v.string(), generation: v.number() }).index('by_area', ['areaId']),
  imports: defineTable({ areaId: v.string(), importId: v.string(), importedAt: v.number() })
    .index('by_area_import', ['areaId', 'importId']),
});
