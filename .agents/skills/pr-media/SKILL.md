---
name: pr-media
description: Capture, compress, and attach screenshots and short screen recordings to a GitHub pull request or PR comment, in three quality tiers. Use whenever a PR changes something users can see (UI, styling, animation, terminal output), when such a PR changes visibly during review, or when the user asks to add screenshots or a video to a PR.
metadata:
  requires: "gh >= 2.99 (for --attach), ffmpeg, ImageMagick 7"
---

# PR Media

Reviewers should see what changed without checking out the branch. Every PR with a visible change gets screenshots. Add a short video when the change plays out over time, such as an interaction, a flow, or an animation. Skip media for changes nobody can see, and never screenshot code or diffs.

`gh` uploads the files with `--attach`. `compress.sh` in this directory turns raw captures into small files for a tier.

## Pick a tier

Default to `low`. Go higher only when the reviewer has to judge the visual detail itself. When in doubt, stay low and crop tighter: a tight crop shows more than extra resolution does. If the user names a tier, use it.

| Tier | Use for | Screenshot | Video |
| --- | --- | --- | --- |
| `low` | features, flows, layout, copy, visible bug fixes | WebP q80, up to 1280 px wide | H.264, up to 1280 px, 15 fps, CRF 32 |
| `medium` | spacing, typography, alignment, icons, breakpoints, small text | WebP q90, up to 1920 px, from a 2x capture | H.264, up to 1920 px, 30 fps, CRF 26 |
| `high` | animations, easing, colors, gradients, shadows, 1 px borders, dark mode contrast | lossless PNG at 2x | H.264 at native size, up to 60 fps, CRF 18 |

On a 1280×720 dashboard with hover effects and transitions, a full-viewport screenshot came out at 22 KB, 50 KB, and 292 KB, and video at roughly 9, 27, and 100 KB per second. Scrolling and full-page transitions cost several times more.

The tier applies per file. One PR can carry a `low` video of the flow next to a `high` crop of the one animation that matters.

## Capture

Run the branch's real app with demo data and a fixed viewport (1280×800 CSS px for desktop). Use the light theme unless the change concerns theming; then capture both.

- **Show the change, not the app.** Crop to the affected area plus enough surroundings to locate it. One screenshot per distinct state.
- **Before and after.** When the change modifies existing UI and the default branch is cheap to run (for example in a second worktree), capture both with the same viewport, theme, data, and crop.
- **Pixel density.** Capture at device pixel ratio 2 for `medium` and `high`. For `low`, 1x is enough.
- **Short videos.** Start right before the interaction and stop once the result settles. Show each interaction once at normal speed and stay under 15 seconds.
- **Source quality.** Compression cannot restore frames or detail the source lacks. For `high` animation reviews, record at 60 fps and check the source with `ffprobe` first. Playwright's `recordVideo` writes 25 fps VP8 at a modest bitrate. That is fine for `low` but too coarse for `high`.

Use the harness's browser preview or recording tools when they exist. Otherwise use Playwright (`page.screenshot({ clip })`, `deviceScaleFactor: 2`, `recordVideo`), `grim` and `wf-recorder` on Wayland, `screencapture` on macOS, `xcrun simctl io booted screenshot|recordVideo` for iOS simulators, or `adb exec-out screencap -p` and `adb shell screenrecord` for Android.

Write captures to `${TMPDIR:-/tmp}/pr-media/<repo>-<branch>/`, never into the repository.

Uploads cannot be deleted, and on public repositories anyone can see them. Before attaching, look at every screenshot and scrub through every video. Nothing may show tokens, keys, email addresses, customer data, notifications, other tabs, or private paths.

## Compress

```bash
bash <this skill's directory>/compress.sh <low|medium|high> <input> [--crop WxH+X+Y] [--from SEC] [--to SEC] [-o OUTPUT]
```

Images become WebP (`low`, `medium`) or PNG (`high`). Videos become MP4. The script never upscales, never raises the frame rate, drops audio, and prints the size of the result.

Open every output and check that the change is clearly visible. If it is not, crop tighter first, then go up one tier. If a file exceeds 10 MB, shorten or crop it instead of lowering the quality.

Videos use H.264 with 4:2:0 chroma and BT.709 tags, which every browser plays. Even at `high`, video colors drift by a few RGB steps. For color changes the PNG is the reference, and the description states the old and new values (`#1f883d → #1a7f37`). If you encode by hand, keep the BT.709 conversion and the `setparams` tags from the script. ffmpeg's default conversion makes Chrome show `#197E39` as `#11713A`.

## Attach

Write the body to a file and reference each file by the path you pass to `--attach`. `gh` uploads the files and rewrites those references in place. It appends files the body does not reference at the end.

```bash
gh pr create --title "…" --body-file "$dir/body.md" \
  --attach "$dir/before.webp" --attach "$dir/after.webp" --attach "$dir/demo.mp4"
```

Put the media after the explanation of the problem and the solution:

```md
| Before | After |
| --- | --- |
| ![Before: the toggle hides in the overflow menu](/tmp/pr-media/app-settings/before.webp) | ![After: the toggle sits in the header](/tmp/pr-media/app-settings/after.webp) |

![](/tmp/pr-media/app-settings/demo.mp4)
```

- A video only renders as a player when its `![](…)` stands alone in its own paragraph. Inside a table or a sentence it becomes a plain link.
- Videos have no alt text. Give every image alt text that says what to look at.
- GitHub accepts PNG, JPEG, GIF, WebP, SVG, MP4, MOV, and WebM. Images are limited to 10 MB. Videos are limited to 10 MB on free plans and 100 MB on paid plans.

The description shows the current state. When later commits change what is visible, update its media: read the body with `gh pr view <n> --json body -q .body`, replace the outdated asset URLs with the new local paths, and run `gh pr edit <n> --body-file … --attach …`. To answer a review comment with media, use `gh pr comment <n> --body-file … --attach …`.

Afterwards, confirm that the body contains no local paths. If some uploads fail, `gh` keeps the ones that succeeded and exits non-zero. Attach the missing files with another `gh pr edit`.

If `gh --version` is older than 2.99, ask the user to update `gh`. Do not commit media to the repository as a workaround.
