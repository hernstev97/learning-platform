# In-repository documents

## What this source contains

Documents checked into the tree, not pages in an external wiki.

- ADRs (architectural decision records)
- Technical specs, RFCs, design docs
- README and `docs/` trees
- Meeting notes or design-review writeups that someone committed
- Postmortems and incident writeups stored as files
- Runbooks that may explain defensive code
- Strategy or roadmap markdown that set priorities
- CHANGELOG and release-note files (when they carry rationale, not only version lists)

This is where "why" often lives in long form before or beside the code.

## How to search it

Search the tree. Typical homes: `docs/`, `doc/`, `adr/`, `rfcs/`, `design/`, `.github/`, repo-root `*.md`.

Try:

- The feature name
- Key symbols / class names from the target code
- Error strings or user-visible terms
- Ticket or incident IDs from the code anchor
- Filenames matching `*adr*`, `*rfc*`, `*design*`, `*postmortem*`, `*architecture*`

Read the full file, not the title or the first heading. Rationale is often buried mid-document.

Follow links that stay inside the repo. If a doc points at a ticket, a chat thread, or a page outside the tree, record that as a lead. Do not follow it off-repo.

## What good evidence looks like here

- A design doc with a "Problem statement" or "Motivation" section that matches the target code's purpose
- An "Alternatives considered" or "Rejected approaches" section
- A postmortem that names the target code as the fix for a specific incident
- An ADR with status, context, decision, and consequences filled in non-trivially
- A README or package doc that states a constraint the code is honoring

## Common pitfalls

- **Outdated docs.** Specs are often written before implementation and not updated. The doc may describe a plan that changed. Cross-check against the actual commit dates.
- **Doc vs. reality drift.** A spec may say "we'll do X" but the code actually does Y. Flag the divergence; the synthesizer will surface the contradiction.
- **Boilerplate templates.** Some orgs require a "Why" section that gets filled with fluff. Look for specificity.
- **Unlinked docs.** The most relevant file may not be linked from the target. Broad filename and content searches help.
- **Multiple drafts.** If a topic has several docs, prefer the one that was finalized or most recently updated. Check git history on the doc itself.

## What to return

For each relevant doc:

- Path in the repo
- Authors and last-touch date, if git history on that file is cheap
- The motivation text (verbatim quote), with heading or line location
- Whether the doc reads as finalized or draft
- Any in-repo links worth citing
