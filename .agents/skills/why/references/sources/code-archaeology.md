# Code Archaeology (git + in-repo)

## What this source contains

- Commit history (messages, dates, authors, diffs)
- Inline code comments, TODOs, FIXMEs, deprecation notes
- Tests. Names and assertions often encode the edge cases that motivated a change
- Related files modified in the same commits (co-change signal)
- CHANGELOG entries and release notes that live in the repo
- Ticket or review identifiers mentioned in commit messages

The most trustworthy source, tied directly to the code, and the most complete of what actually shipped. Work from git output and file contents. Do not call a forge, an issue tracker, or any other service.

## How to search it

Expand the seed commit list:

```
git log --follow --oneline -- <file>
git log -S '<exact_string_from_code>' -- <file>
git log -G '<regex>' -- <file>
git blame -L <start>,<end> <file>
git show <hash>
git log <old>..<new> -p -- <file>
```

For each substantive commit, read the full message and the patch. Merge commits and squash messages often carry the only surviving statement of intent.

Look for out-of-band text next to the code:

- ADRs and architecture notes that live beside the implementation (hand those paths to the documents pass rather than writing the docs finding yourself)
- TODOs and FIXMEs near the target
- Tests whose names mention the symbol

## What good evidence looks like here

- A commit message that explains the problem being solved, not just the change ("This fixes the pagination bug that caused X")
- An inline comment near the target line that explains a non-obvious constraint
- A test named `test_handles_edge_case_when_X` that reveals an edge case motivating the code
- A commit message that references a ticket or incident ID
- A CHANGELOG entry that summarizes the user-visible rationale
- A merge or squash message that still contains the original description of the change

## Common pitfalls

- **Squash-merge flatlands.** If the repo squashes, individual commits in the branch history are lost. Fall back to the squash message and the patch.
- **Misleading commit messages.** "Small refactor" sometimes hides an intentional behavior change. Look at the diff, not only the message.
- **Cargo-culted patterns.** The author may have copied a pattern without understanding why. Check if the pattern originated earlier in the codebase and investigate *that* commit.
- **Bot commits and auto-merges.** Dependabot, Renovate, and automated backports usually don't carry motivation. Skip them when trying to find intent.
- **Treating code as evidence of intent.** The code itself isn't evidence for why it exists. Evidence comes from commit messages, comments, tests, docs. Don't cite "the function is named X" as evidence of intent.
- **Identifiers without bodies.** A message that says "fixes ENG-4421" names a ticket. It does not contain the ticket. Record the identifier as a lead. Unless the user pasted that ticket, you do not have its text.

## What to return

Every commit, comment, or test that bears on the question, with:

- The exact text (quoted)
- The hash / file:line
- Author and date
- Whether it's direct (explicitly addresses the question) or circumstantial
