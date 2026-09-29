import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { entry } from './model';

export default defineSchema({
  // One personal dataset. Only requireOwner may grant access; no client owner IDs.
  progress: defineTable({ areaId: v.string(), key: v.string(), value: entry, updatedAt: v.number() })
    .index('by_area_key', ['areaId', 'key']),
  drafts: defineTable({ areaId: v.string(), generation: v.number(), exerciseId: v.string(), fingerprint: v.string(), json: v.string(), updatedAt: v.number() })
    .index('by_area_generation_exercise', ['areaId', 'generation', 'exerciseId']),
  areaResets: defineTable({ areaId: v.string(), generation: v.number() }).index('by_area', ['areaId']),
  // Personal lesson notes. Deliberately outside the reset generation: resetting progress keeps them.
  notes: defineTable({ areaId: v.string(), moduleId: v.string(), text: v.string(), updatedAt: v.number() })
    .index('by_area_module', ['areaId', 'moduleId']),
  imports: defineTable({ areaId: v.string(), importId: v.string(), importedAt: v.number() })
    .index('by_area_import', ['areaId', 'importId']),
});
