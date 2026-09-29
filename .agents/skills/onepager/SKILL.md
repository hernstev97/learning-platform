---
name: onepager
description: Publish an audit, research write-up, plan, comparison, or UI exploration as one styled web page on Postplan, readable from any device. Uses the learn.kiumu.app design (paper, ink, hard shadows) with a table of contents, wide tables, charts, diagrams, and CSS-only UI demos. Use when the user asks for an audit, research, or plan "als Seite", "als Onepager", "per Link", "zum Lesen am Handy", or wants a result published with Postplan.
metadata:
  requires: "node, npx (postplan is run via npx)"
---

# Onepager

Turn an audit, a piece of research, or a plan into one long, scannable web page and publish it on Postplan. `template.html` in this directory holds the whole design system and a showcase of every component. `check.mjs` checks a page before upload.

Do not use this for HTML that ships as part of a product, or for answers short enough to stay in chat.

## What Postplan allows

Every draft is served with `default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src https: data:`. That has consequences the upload does not warn about:

- **No JavaScript runs.** The upload accepts inline scripts, but the browser never executes them. Build every interaction with HTML and CSS.
- **Web fonts never load.** The font stack names DM Sans and JetBrains Mono first, so devices with those fonts installed use them and all others fall back to system fonts. Do not embed fonts.
- **Images load only from `https:` or `data:` URLs.** Prefer inline SVG. CSS `url()` to the network is blocked.

The upload rejects `form`, `iframe`, `object`, `embed`, `applet`, `base`, `link`, `on*` attributes, `javascript:` URLs, meta refresh, and files over 512 KB.

Pages are public to anyone who has the URL. Never include secrets, tokens, internal hostnames, private URLs, personal data about third parties, or local filesystem paths.

## Workflow

1. **Do the work first.** Research, audit, or plan until the content holds up. Collect evidence (file:line, command output, sources with dates) before writing any HTML.
2. **Pick the page type.** It sets the area colour through the `<body>` class:

   | Type | Class | Colour |
   | --- | --- | --- |
   | Audit | `type-audit` | orange |
   | Research | `type-research` | blue |
   | Plan | `type-plan` | green |
   | Decision or comparison | `type-decision` | violet |
   | UI exploration | `type-ui` | pink |
   | Note or summary | `type-note` | yellow |

3. **Copy the template** to `~/.local/share/onepager/<slug>.html`. Choose a short, stable kebab-case slug. The same path later updates the same URL, so never write pages to `/tmp`.
4. **Replace the showcase.** Keep the first `<style>` block byte for byte. Put page-specific CSS, mostly for UI mocks, in the second block and prefix every rule with a mock class. Replace all body content, delete components you do not use, and remove `data-template` from `<body>`. Set `lang`, `<title>`, the topbar type, the dates, and the footer.
5. **Check:** `node <this skill's directory>/check.mjs <file>`. Fix every error and rerun until it prints `ok`.
6. **Upload:** `npx postplan upload <file> --description "<Type>: <title>"`.
7. **Report** the public URL and the local path, plus the answer of the page in two or three sentences. Do not repeat the page in chat.

## Page structure

Every page has the same frame, in this order:

1. **Topbar** with logo, page type, date, and an `Inhalt` link that appears on narrow screens.
2. **Hero** in the area colour: crumbs (type / project), kicker line, a short title of at most six words (it renders huge and uppercase), a lead of one or two sentences that already gives the answer, and 2 to 4 key numbers in `.stat-grid`.
3. **Summary** (`.tldr`) with 3 to 5 bullets. A reader who stops here knows the result. Add `.verdict` below it when the page ends in a recommendation or decision.
4. **Numbered sections** (`<section class="doc-section" id="…">`). Numbers come from CSS counters. List every section in both the sidebar `.toc` and the mobile `.toc-mobile`, in the same order. `check.mjs` enforces this.
5. **Footer** with date, scope, and origin (repository and commit when the page is about code).

Section skeletons by type. Adapt them; drop what has no content.

- **Audit:** scope and method (what was checked, what was not, with which tools), findings (`.finding` cards sorted by severity, with the severity filter above them), findings overview table, measures (`.steps`, optionally `.gantt`), appendix. Every finding has an ID, a severity, the finding, evidence, impact, and a recommendation. Severity: `critical` breaks security, data, or core function now; `high` will hurt soon or affects many; `medium` costs time or quality; `low` is polish; `info` is an observation.
- **Research:** question and context, short answer, options (comparison matrix), assessment per criterion, recommendation, open questions, sources. Every factual claim links a numbered source (`<a class="cite" href="#q1">[1]</a>`). Sources carry publisher and access date. Mark your own assessment as such and keep it apart from what sources say.
- **Plan:** goal and non-goals, current state, target picture (diagram), steps with a definition of done each, schedule, risks (table with likelihood, impact, countermeasure), open decisions.

## Components

All components are in `template.html`. Copy the markup from there.

| Need | Component |
| --- | --- |
| Result first | `.tldr`, `.verdict` |
| Side notes | `.callout` with `-note`, `-warning`, `-key`, `-tip`, `-practice`, `-deep` |
| Audit findings | `.finding[data-sev]` inside `.findings`, filter with `.filter` + `.chips` |
| Tables | `.table-wrap`, plus `.tall` (long), `.first-sticky` (wide), `.num`, `.wide`, `.nowrap`, `tr[data-sev]` |
| Comparison | table cells with `.yes`, `.no`, `.part` |
| Status and severity | `.tag` with `.green`, `.yellow`, `.red`, `.grey`, … or `.tag.sev` inside `[data-sev]` |
| Comparisons in numbers | `.chart` + `.bars` (`style="--v:0–100"`) |
| Shares | `.stack` + `.legend` |
| Time series | `.chart.svg-chart` with inline SVG |
| Linear process | `.flow` (up to five steps, `.hl` marks one) |
| Branching process, architecture | `.diagram` with inline SVG and `dg-*` classes |
| Plan steps | `.steps` with `li.done` / `li.active` |
| Schedule | `.gantt` (`--cols`, bars with `--from` / `--to`) |
| UI mocks | `.variants` > `.demo` with `.demo-bar`, `.demo-letter`, `.demo-stage` (`.phone` for 390 px) |
| CSS-only interaction | `.tabs` (radio), `.switch` (checkbox + `:has()`), `.accordion` (`details name`), `[popover].popover` (`popovertarget`) |
| Code | `.codeblock` with `.codeblock-bar`, manual `syntax-*` and `diff-add` / `diff-del` spans |
| Sources | `.sources` with `li id="q1"` |

## Design rules

- **Stay in the system.** Use only the tokens (`--paper`, `--ink`, `--white`, `--muted`, `--accent`, the six area colours) and the existing components. No rounded corners, gradients, soft shadows, or new fonts. The look is 3 px ink borders, hard offset shadows, uppercase headings, and mono labels. Everything must work in light and dark mode, so never hardcode `#000` or `#fff` in content.
- **Colour carries meaning.** The area colour marks the page type. Severity colours mark severity only. The accent marks hover and the current item.
- **Text** is dense and scannable, written like a spec: no marketing voice, no filler, no em dashes. Apply the `unslop` skill if it is available. Write in the user's language, German by default, and set `<html lang>` to match.
- **Tables** may be long and wide. The first column identifies the row. Units go in the header, numbers get `.num`. Use `.tall` from about 12 rows and `.first-sticky` from about 6 columns. Sort by what matters to the reader, since there is no sorting in the browser. The caption says what the table shows.
- **Charts:** load the `dataviz` skill if it is available and follow its method, but keep this palette. Bars for comparison, stacks for shares, lines for time. Print values on the chart. The caption states the takeaway, not only the topic.
- **Diagrams:** `.flow` for straight sequences, inline SVG for anything with branches, loops, or layers. Style SVG only through the `dg-*` classes so dark mode works. Set a `viewBox`, give the SVG `role="img"` and an `aria-label`, and keep IDs inside the SVG unique on the page.
- **UI demos** are real, styled mocks, never descriptions. Label variants A, B, C so the user can answer with a letter. The mock may use the design of the product being designed. The frame stays in this system. Interaction works only through the CSS patterns listed above.
- **Mobile:** nothing gets a fixed width outside a scroll container. Wide tables, diagrams, and SVG charts scroll inside their frame.
- **IDs** are lowercase kebab-case, unique, and ASCII.
- **Size:** stay well below 512 KB. Use inline SVG instead of raster images. When a raster image is unavoidable, compress it and embed it as a `data:` URL.

## Updating a page

Uploading the same absolute path again updates the draft behind the same URL and adds a version. Update the date in the topbar and footer. Use `--new` only when the user wants a separate draft. `npx postplan list` shows existing drafts.

## Publishing

Steven has given standing permission to upload every page created or updated with this skill. Upload is required, including in Auto mode. Do not ask for separate permission and do not stop at the local file.

If the upload fails validation, fix the markup and retry. If it fails on authentication, ask the user to run `npx postplan auth login`, then retry.

Do not open a browser and do not claim the page is online before the upload succeeded. Check the page in a browser only when the user asks.
