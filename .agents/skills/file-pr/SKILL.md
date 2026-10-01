---
name: file-pr
description: File a concise pull request. Use when the user asks to file, open, or create a PR.
---

# File PR

Before filing, determine the repository's default branch and check whether a PR for this branch already exists. Review the local diff against the remote default branch and verify that every change belongs to the user's requested goal. If unrelated changes are present, do not file the PR until they are excluded.

PR titles usually become commit messages, so follow the repository's title conventions. Look at recently merged PRs and Git history for example. Prefer a concise, human-readable title that explains why the change matters:

BAD
> ❌ perf(server): negotiate permessage-deflate on the websocket

GOOD
> ✅ perf(server): cut websocket frame size by 70%+ with gzippping

Open the description with a simple explanation of the problem based on the user's original prompt, then briefly explain the solution. Do not lead with an implementation inventory:

BAD
> ❌ Removed implicit workspace carry-over from every "new thread" entry point (cmd +n / cmd+shift+o, sidebar v1/v2 buttons/ command palette). New threads inherit only the project from context; branch, worktree, and env mode always come from the configured defaults. Deleted buildContextualThreadOptions, startNewThreadInProjectFromContext, and the v1 sidebar's seed-context machinery.

GOOD
> ✅ My "new worktree" default was ignored when starting new threads on existing worktrees. Super unintuitive. Now your preferences always apply.

If the change is visible to users, attach screenshots after the explanation, plus a short video when behavior over time matters. Use the `pr-media` skill for this (if present).

Open a real PR rather than a draft so review bots run. If the user also asked to babysit it, continue with the `babysit-pr` skill.
