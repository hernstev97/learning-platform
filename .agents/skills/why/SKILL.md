---
name: why
description: "Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. Reads git history, in-repo docs, comments, tests, and any text already in the conversation, then returns a cited read on decisions and tradeoffs. Use how for runtime behavior."
---

# Why

Investigate the motivation and intent behind code. Why was it built this way? What edge cases were considered? What product, business, or operational constraints shaped the design? What alternatives were rejected, and why?

Companion to the `how` skill. `how` answers what the code does and how it works. `why` answers what forces led to its shape.

## How this skill works

Historical context lives in text: commit messages, patches, review notes that made it into git, documents in the tree, comments, tests, and anything the user already pasted. You cannot tell from the question alone which of those holds the answer, so search every class that is actually present, then synthesize with explicit confidence calibration.

Null results are first-class evidence. "We searched the docs tree for this symbol and found no design note" is a finding. The default is coverage of the text you can read, not a short path to a plausible story.

Do not infer intent from code shape. Do not call out to issue trackers, chat, dashboards, error products, or warehouses. If the user pasted a ticket, a chat export, or a log, that pasted text is a source. Do not go fetch more of it.

If you can run investigator passes in parallel, give each source class its own pass. If you cannot, walk the classes yourself. Either way, do not edit files. The files in `references/` are the instructions for each pass.

## Operating Posture

Operate as a careful, cautious, precise investigator. Think like a detective piecing together a historical case from fragmentary records. When the record is thin, say so.

Concretely:

- **Evidence before narrative.** Collect the pieces first, then see what story they support. Never pick a story and recruit the evidence that fits it.
- **Precision over polish.** Prefer the exact quote and citation over a smooth paraphrase. A reader should be able to follow any claim back to its source and verify it in under a minute.
- **Consider what you haven't seen.** The evidence you find is a sample, not the whole truth. Before concluding, ask what you would expect to see if an alternative explanation were true, and whether you looked for it.
- **Name the gaps.** If a thread goes cold, a source isn't in the tree, or a question has no answer, document the gap. Don't paper it over with an authoritative-sounding guess.
- **Hedge on purpose.** When evidence is indirect, your language should signal it ("appears to", "likely", "suggests"). Confidence-matching phrasing is a feature of the output, not a stylistic choice the synthesizer may override.
- **No shortcut by code-reading.** The code tells you what it does, rarely why it exists. Resist inferring intent from code shape.

This posture is the working method, not a disclaimer.

## Core Epistemics

This skill builds a **patchwork understanding** from fragmented historical evidence. Tickets go stale. Commit messages lie. People change their minds between the description of a change and the implementation. The original author may have left.

Be ruthlessly honest about what you know versus what you're inferring. The goal is not a satisfying story; it is to surface evidence, calibrate confidence, and let the user decide.

Principles:

- **Cite everything.** Every claim about intent should reference a specific commit hash, file:line, doc path, or the location of user-supplied text. If you can't cite it, it's inference, not fact, and must be labeled as such.
- **Prefer "appears to" over "because".** Hedge when evidence is indirect. Reserve confident language for direct, explicit evidence.
- **Surface contradictions.** If two sources disagree, show both. Don't quietly pick the one that fits your narrative.
- **Acknowledge gaps.** If a question has no answer in any source you searched, say so. An honest "we couldn't find out why" beats a confident guess.
- **Multiple hypotheses are valid.** When the evidence fits several stories, present them all with the evidence for each. Let the user triangulate.
- **Beware rationalization.** Code that makes sense today may have been written for reasons that no longer apply, or for no good reason at all. Don't retrofit intent.

Read `references/epistemics.md` for the full confidence framework and phrasing guide. The synthesizer must follow it.

## Step 1. Understand the Target and the Question

Parse what the user is asking. The **target** is usually a chunk of code, a pattern, a feature, or a named design decision. The **question** is usually one of:

- "Why was X designed this way?" Design rationale.
- "Why do we do X instead of Y?" Tradeoff or alternatives.
- "What edge cases motivated this?" Defensive reasoning.
- "What business or product constraint led to this?" External forcing function.
- "Why does this code still exist?" Dead-code territory.
- "What's the history of X?" Broad archaeological sweep.

If the target is vague ("why do we do it this way?" with no clear referent), make your best guess from conversation context (open files, recent edits, what was just discussed). State your interpretation briefly so the user can redirect if you're off, then proceed.

## Step 2. Establish the Code Anchor

Before investigating sources, anchor the work in concrete code. You need:

- The relevant file path(s) and line range(s)
- The key symbols (function names, class names, constants)
- An initial commit list. The last few commits touching the target.
- Review or ticket identifiers mentioned in those commits, if any

Build this inline. It's cheap, and every later pass needs it.

```
git blame -L <start>,<end> <file>
git log --follow -p -- <file>
git log --oneline -20 -- <file>
git log -1 --format=%B <commit>
```

Capture this as seed context (file paths, symbols, commits, identifiers). Hand it to every investigator pass so they don't rediscover it.

## Step 3. Search Every Textual Source Class

**Default to covering every class below.** Each class holds a different kind of "why." You cannot tell from the question which one answers it without looking.

### Source classes

1. **Version control.** Git history, patches, blame, commit messages, notes, comments, TODOs, tests. Always search. The only guaranteed source. Best at surfacing *implementation-time rationale that shipped with the diff*: commit messages that state the problem, inline comments that encode a constraint, test names that encode an edge case. Playbook: `references/sources/code-archaeology.md`.

2. **In-repository documents.** ADRs, specs, RFCs, READMEs, `docs/`, changelogs, checked-in postmortems, architecture notes. Best at surfacing *long-form design rationale* written before or beside the code: problem statements, alternatives considered, rejected approaches. Playbook: `references/sources/in-repo-docs.md`.

3. **User-supplied text.** Anything already in the conversation: a pasted ticket, a chat export, a review comment, a log, a paragraph of context. Best at surfacing *rationale that never landed in the repo*. There is no playbook. Quote it, cite it as user-supplied, and do not treat it as a license to go fetch related threads.

If the target looks defensive (null checks, retry logic, timeout handling, rate limiting, feature flags, egress guards, crash handlers), also apply `references/sources/incident-postmortem.md` inside the version-control and documents passes.

### How to run the passes

Each investigator pass gets:

1. The base prompt from `references/investigator-prompt.md`
2. The playbook for its source class
3. The incident playbook when the target looks defensive
4. The code anchor from Step 2
5. The user's original question

One pass per source class. Don't dump git, docs, and a pasted ticket into a single undifferentiated search. Specializing keeps coverage honest.

### When to skip a class

Only skip with an **explicit, written justification** that goes in the final "Sources Consulted" section. Two valid reasons:

- **The class has no material.** Example: "In-repository documents skipped. No `docs/`, ADR, or design markdown in this tree." Flag it as a gap, not a choice.
- **The source is provably irrelevant**, not just "probably irrelevant." A high bar. Example: "Incident angle skipped. Target is a rename with no defensive behavior."

"It's a small feature, docs won't have anything" is **not** sufficient. Search; let the null result speak.

User-supplied text is skipped only when the user didn't paste any. That's normal. Record it as "none provided," not as a failed search.

If the target is a single trivial commit whose message already contains a complete answer, you may answer inline **only after** confirming the other classes wouldn't contradict it. Say so explicitly. This should be rare.

## Step 4. Synthesize

Run one synthesizer pass over the investigator findings. It gets:

1. The investigator findings, including any null results and any classes skipped with justification
2. The code anchor from Step 2
3. The user's original question
4. The epistemics framework from `references/epistemics.md`
5. The synthesizer prompt template from `references/synthesizer-prompt.md`

Its job is the final output: a confidence-weighted, evidence-cited narrative with clearly separated "what we know" and "what we're inferring" sections, plus honest acknowledgment of gaps and null-result sources.

Spot-check citations by re-reading the cited commit, file, or pasted text. Don't propagate a bad quote.

## Step 5. Present

Take the synthesizer's output and present it to the user. You may lightly edit for clarity or add context from the conversation, but **do not rewrite the confidence language**. The epistemic framing is the product. Dropping the hedges to sound more authoritative is the exact failure mode this skill exists to prevent.

## Output Format

The final output uses this structure. Adapt as needed, but keep the confidence separation intact.

**The Question**. Restate what the user asked, concisely.

**The Code in Question**. File paths, line ranges, and key symbols. One or two lines so the reader is anchored.

**What We Found (direct evidence)**. Claims with explicit citations (commit hash, file:line, doc path, or user-supplied text). Each bullet is a thing we have textual evidence for. Use present tense and quote or paraphrase the source.

**What We Can Reasonably Infer**. Claims well-supported by indirect evidence or combinations of signals, but not explicitly stated anywhere. Each bullet must explain the inference chain: "Given A and B, it's likely that C." Use hedged language ("appears to", "likely", "suggests").

**Competing Hypotheses**. If the evidence fits multiple stories, list them. For each, give the hypothesis, the evidence for it, and the evidence against it. Don't force a winner when the record doesn't support one. (Skip this section if there's a clear answer.)

**What We Don't Know**. Explicit gaps. Questions the user asked that the evidence didn't answer. Sources we searched and came up empty. Be specific. "We searched `docs/` and commit messages for 'rate limit' and found no discussion of this threshold" is more useful than "we don't know why."

**Sources Consulted**. One line per source class, including the ones that returned nothing. The reader should see at a glance what was searched, what came back empty, and what was skipped and why.

Format each line as: `- <Source>: <what was searched>. <what was found, or "no relevant results," or "skipped. reason">.`

Example:

- Version control: `git log --follow src/retry.ts`, commits `a1b2c3d` and `e4f5g6h`. `a1b2c3d` introduced exponential backoff and mentioned ticket ENG-4421 in the message. No review discussion in the git text.
- In-repository documents: searched `docs/` and ADR filenames for "retry", "backoff", "ENG-4421". No relevant results.
- User-supplied text: none provided.

After the Sources Consulted block, if the user's `why` question is a precursor to actually changing this code, convert the lineage findings into a Preserve / Change / Avoid / Risk constraint set suitable for planning the change.

## Common Failure Modes to Avoid

- **Confident storytelling**. A plausible narrative built from thin evidence. A bullet with no citation goes in "inferred" or "hypotheses," not "what we found."
- **Citing the code as evidence for its own intent**. "Handles the null case because it checks for null" is mechanics, not motivation. Motivation comes from a message, a comment, a doc, a test, or user-supplied text, or it is labeled as inference.
- **Recency bias**. Assuming the most recent commit is authoritative. The current shape is often the accretion of many earlier decisions. Trace back.
- **Sycophantic agreement**. If the user suggests a reason ("I assume this is for performance?"), treat it as a hypothesis and check the evidence independently, don't just confirm it.
- **Skipping the gaps section**. An honest accounting of what you couldn't find out is part of the value.
- **Skipping a source class by anticipation**. Deciding up front that "docs probably don't have this" without searching. A null result is a data point; a skipped search is a blind spot.
- **Going outside the text.** Do not try to reconstruct production metrics, chat history, or ticket databases. If that evidence isn't in the tree, in git, or in the conversation, it is a gap.

## Reference Files

- `references/epistemics.md`. Confidence tiers and phrasing guide. The synthesizer must follow it.
- `references/investigator-prompt.md`. Base prompt template for investigator passes.
- `references/source-playbook.md`. Index of the source-class playbooks.
- `references/sources/code-archaeology.md`. Version control, comments, tests.
- `references/sources/in-repo-docs.md`. Documents checked into the tree.
- `references/sources/incident-postmortem.md`. Extra queries when the target looks defensive.
- `references/synthesizer-prompt.md`. Prompt template for the synthesizer pass, including the output format.
