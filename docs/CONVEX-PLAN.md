# Personal persistence implementation plan

Inspection: the existing app uses Vite and plain TypeScript/DOM rendering, a History API router, build-time YAML/Markdown content loading, and lazy area chunks. The handbook and historical completion report describe the original local-only architecture; this change supersedes only the persistence/account parts.

Current mutable state lives in `learn:<area>:v1`: exercise completions with fingerprints, type-specific answer drafts, revealed solutions, read lessons, Leitner card reviews, project checkboxes, and an index-based last route. Filter selections, open hints, code-run output and the current card-training queue are transient UI state. Bear v2 JSON import and JSON backup/restore already exist. Percentages are derived from current content IDs/fingerprints.

1. Keep the framework, router, design, curriculum and exercise engines. Use Clerk's JavaScript SDK and Convex's reactive JavaScript client; no React conversion.
2. Enforce one configured Clerk issuer + subject in a shared server guard, before any private read/write. No client-supplied owner, email allowlist, signup flow or account tables. Missing configuration fails closed.
3. Persist individual state entries and answer drafts, plus stable learning positions. Keep drafts separately queryable so curriculum-wide progress does not download every saved answer on each change. Derive aggregates in the existing engine.
4. Preserve project steps. Give acceptance criteria explicit immutable IDs, initially retaining their old `abnahme-N` keys. Store exercise IDs in resume positions, resolving the current URL index on the client.
5. Offer a deliberate legacy import after authenticated server hydration. Import only missing fields, preserve server tombstones and reset boundaries, record import receipts atomically, retain original local keys. JSON restore remains available.
6. Use Convex subscriptions/reconnection and optimistic updates. Do not persist a second offline database. Report pending/error states and warn before leaving with unacknowledged writes.
7. Test every public endpoint against missing/wrong/malformed identity, persistence, repeat writes, concurrent independent edits, resets, migration and aggregation. Run existing content, unit, browser and build checks; document any hosted checks requiring credentials.

Setup assumptions: Steven configures Convex separately. Clerk issuer, publishable key and immutable allowed user ID will be documented placeholders. No remote deployment or credentials are assumed.
