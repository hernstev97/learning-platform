# Source playbooks

The why skill runs one investigator pass per textual source class. Each pass reads a single playbook.

| Class | Playbook | What it reads |
|---|---|---|
| Version control | [`code-archaeology.md`](./sources/code-archaeology.md) | git history, patches, comments, tests |
| In-repository documents | [`in-repo-docs.md`](./sources/in-repo-docs.md) | ADRs, specs, README, `docs/`, changelogs, checked-in postmortems |
| User-supplied text | (none) | Text already in the conversation. Quote it; don't go fetch more. |

Cross-cutting:

- [`incident-postmortem.md`](./sources/incident-postmortem.md). Add this if the target code looks defensive (null checks, retry, timeout, rate limit, feature flag, egress guard, crash handler).
