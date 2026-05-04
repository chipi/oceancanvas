# Screenshots

Surface captures used by the project's docs (README, quickstart, concept package). Regenerated automatically from the running stack via Playwright — they are documentation artefacts, not hand-curated PNGs.

## Regenerate

The capture script needs the full Docker stack up with rendered data:

```bash
docker compose up               # in one terminal
make pipeline-run               # ensure recipes have rendered (skip if already)

# in another terminal, from repo root:
make screenshots
```

This runs `e2e/screenshots/capture.spec.ts` against `http://localhost:8080`. Each test navigates to a surface, waits for content to settle, and writes a 2× retina-friendly PNG to this folder.

After the run, inspect the diff:

```bash
git diff docs/concept/images/
```

Any unintentional changes (animation frame, race condition, transient state) — re-run. When the captures look right, commit them.

## What's captured

| File | What it shows | Source surface |
|---|---|---|
| `gallery_front_page.png` | The gallery home with today's renders accumulated across recipes | `/` |
| `gallery_detail.png` | One recipe's detail page with timeline scrubber | `/gallery/<recipe>` |
| `dashboard_overview.png` | The Dashboard with the source rail | `/dashboard` |
| `editor_creative_mode.png` | Recipe Editor in creative mode (mood pills + energy quadrant) | `/recipes/<recipe>` |
| `editor_yaml_mode.png` | Recipe Editor with the YAML pill active | `/recipes/<recipe>` (YAML mode toggled) |
| `video_editor.png` | Video Editor full surface — preview, ribbon, audio sidebar | `/timelapse/<recipe>` |
| `video_editor_audio_panel.png` | Just the audio sidebar — mixer, EQ, arc editor | element-clip of `<aside>` on the Video Editor |
| `pipeline_architecture.png` | Hand-drawn diagram of the six-task pipeline | **NOT auto-captured** — edit by hand if the architecture changes |
| `tech_stack_deployment.png` | Hand-drawn stack diagram | **NOT auto-captured** |
| Other historical PNGs | (`recipe_editor_studio`, `processing_step_detail`, `sea_level_editorial_spread`, `sst_editorial_spread`) | Stale — kept while older docs reference them; safe to delete once orphaned |

## Hero recipe

The capture spec uses `north-atlantic-sst` as the hero recipe — picked because it has the most accumulated renders, uses the `field` render type (the most common visual), and carries both `audio:` and `tension_arc:` blocks. To switch the hero, edit `HERO_RECIPE` at the top of `e2e/screenshots/capture.spec.ts`.

## Why automated

Manual screenshots drift. The audit that uncovered this — README's hero showing pre-v0.4.0 UI without the audio mixer or arc editor — is exactly the failure mode automation prevents. Re-run `make screenshots` after any UI change and the docs stay current.

## Determinism notes

- Viewport is fixed at **1440×900** with `deviceScaleFactor: 2` (retina output).
- The script waits for image load completion (not arbitrary timeouts) before capturing, with a small settle delay.
- Animations / motion in the audio visualizer are NOT paused — that means the waveform display is non-deterministic frame-to-frame. Consider that when a screenshot diff shows a small change in the canvas region; only behavioural changes should worry you.
