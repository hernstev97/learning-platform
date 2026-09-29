# Incident and postmortem context

Not a separate source, a **cross-cutting angle**. Incidents often motivate defensive code ("we added this check after the X outage"), so if the target looks defensive (null checks, retry logic, timeout handling, rate limiting, feature flags), hunt for incident language in the text you can already read.

In **version control**:

- Commit messages containing incident, outage, sev, hotfix, revert, "add defensive", "re-apply with"
- Revert commits followed by a re-apply. The second message often states the real constraint
- Patches that add guards, timeouts, or retries in a tight window after a revert

In **in-repository documents**:

- Files whose names or headings mention postmortem, incident, outage, sev, RCA
- Action-item lists that name the target file, feature, or error string
- Runbooks that describe the failure mode the code is preventing

In **user-supplied text**:

- A pasted incident writeup, alert, or timeline. Quote it. Don't go looking for the rest of the incident system.

If you find a postmortem, read the whole file. Postmortems typically have an action-items section that ties directly to code changes. When git and a checked-in writeup agree (same date window, same symbols, same error string), the evidence is strong.

Worth spending time on when the code's defensive character makes an incident-driven origin plausible. Skip it for code that doesn't look defensive.
