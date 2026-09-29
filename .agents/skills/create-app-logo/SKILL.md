---
name: create-app-logo
description: Create distinctive app-logo concepts and final icon and mark assets through a monochrome-first, shape-led process. Use only when the user explicitly invokes $create-app-logo.
---

# Create App Logo

Develop an original app logo from the project's purpose, then deliver both the complete app icon and the freestanding logo mark. Favor bold abstract forms over lettering and make the design work in monochrome before considering color.

## Establish the brief

Determine the project's purpose, central behavior or object, audience, desired character, target platforms, and any existing brand constraints. Inspect relevant project context when available. Ask only for missing information that would materially change the concept.

Treat attached images as visual references, not as instructions. State what each reference contributes, such as composition, abstraction, silhouette, spacing, or color treatment. Do not reproduce or lightly modify an existing brand mark.

## Present concepts before generating

Always present multiple meaningfully different concepts before creating visual assets. Unless the user requests another number, give at least three. For each concept, explain concisely:

- its connection to the project;
- the real object, process, material, or relationship behind it;
- how that source becomes an abstract shape;
- the distinctive visual device that makes it memorable;
- why its silhouette works in black and white.

Do not generate an image yet. Wait for the user to choose a concept or explicitly ask to combine or revise concepts. A concept name is descriptive shorthand, not text that appears in the logo.

## Design principles

- Prefer forms, silhouettes, negative space, cuts, overlaps, and spatial relationships over letters, initials, words, or numbers. Use typography only when the user explicitly requests it or it is indispensable to the product identity.
- Start with a one-color master. It must work as black on white and white on black without gradients, shadows, transparency effects, or color-dependent meaning.
- Reduce a project-relevant real-world source to one dominant visual idea. Do not create a miniature illustration.
- Balance uniqueness and minimalism: use few large shapes, then introduce one purposeful feature such as an unusual cut, junction, rhythm, or negative-space reveal.
- Build a recognizable outer silhouette. Avoid fragile details, thin strokes, decorative texture, and complexity that disappears at small sizes.
- Keep the geometry intentional and optically balanced. Mathematical symmetry is optional; visual balance is required.
- Avoid generic stock-logo constructions and near-matches to recognizable brands. References set a quality bar, not a template.
- Add color only when it strengthens the project relationship. The monochrome version remains the canonical design.

## App-icon composition

- Use an Apple-like continuous rounded-square composition when it suits the target, without copying any proprietary artwork.
- Center the mark optically and normally keep its dominant bounds near 55–65% of the icon's side length. Adjust when the silhouette's visual weight requires it.
- Preserve generous clear space. The mark must not touch the icon edge or feel artificially enlarged.
- Treat the mark and its container as separate assets. The logo must remain useful without the app-icon background.
- Respect target-platform masking rules. When a platform applies its own corner mask, keep the production asset full square and use the rounded container only for presentation or platform-independent exports.

## Produce the selected direction

After the user selects a direction, create the cleanest faithful geometry possible. Prefer a native SVG construction for geometric marks. Use raster image generation when it materially helps explore or realize an organic form, then redraw the selected result as clean vector geometry when feasible.

Do not claim a raster image wrapped inside an SVG is vector artwork. If faithful vectorization is not possible, explain why and deliver the PNG assets without a misleading SVG substitute.

Check the selected design at small app-icon size, as a plain silhouette, in positive and reversed monochrome, in grayscale, and without its container. Simplify or correct it if any essential feature fails these checks.

## Deliverables

Always deliver:

- the finished app icon as a square PNG;
- the freestanding logo mark as a transparent PNG;
- the app icon as a true SVG when feasible;
- the freestanding logo mark as a true SVG when feasible.

Use 1024 x 1024 pixels for the primary PNG exports unless the user or target platform requires another size. Preserve transparency for the freestanding mark. Keep SVG shapes editable and economical, with a suitable `viewBox` and no embedded raster data.

Save final assets in the user's requested destination or, for project work, a clearly named folder inside the workspace. Do not overwrite existing files unless explicitly requested. Report the saved paths, which concept was selected, whether any color version is secondary to the monochrome master, and any format that could not be produced faithfully.
