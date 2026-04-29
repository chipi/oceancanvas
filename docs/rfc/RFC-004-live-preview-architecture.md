# RFC-004 — Live preview architecture

> **Status** · Decided · closed 2026-04-30 → [ADR-020](../adr/ADR-020-live-preview-architecture.md)
> **TA anchor** · §components/render-system · §components/web-frontend · §constraints (shared payload, determinism)
> **Related** · PRD-003 Recipe Editor · RFC-002 Render payload format · ADR-008 Shared payload format
> **Closes into** · [ADR-020](../adr/ADR-020-live-preview-architecture.md)
> **Why this is an RFC** · The Recipe Editor's live preview is the primary surface where artists see their work take shape. It must be both *responsive* (fast feedback during exploration) and *faithful* (what you see is what the pipeline will render). These goals pull in opposite directions. The architecture choice has consequences for the editor's feel, the pipeline's reliability, and the trust between author and tool.

---

## The question

When the artist drags the energy×presence point in the Recipe Editor, the preview canvas updates. What is actually running in that preview canvas, and what data is it running on?

Three plausible architectures:

1. **Real sketch + full payload.** The editor runs the actual p5.js sketch with the same payload format the pipeline uses, against today's full-resolution processed data.
2. **Real sketch + downsampled payload.** Same sketch code path, but the payload is reduced (lower-resolution data, fewer particles, simpler context layer).
3. **Approximation.** A simplified preview that mimics the look but doesn't run the pipeline sketch. Faster, but parity is not guaranteed.

Each choice trades off responsiveness, fidelity, and parity differently. The constraint from ADR-008 — that the editor preview and pipeline render must share the same payload format — narrows but does not eliminate the choice.

## Use cases

1. **Initial preset selection.** Artist opens the editor on a new recipe, clicks through five mood presets to see how each looks. Fast switching matters; absolute fidelity less so.
2. **Fine-tuning energy×presence.** Artist drags the 2D point slowly. Preview should update smoothly — at least 10 frames per second of feedback.
3. **Pre-commit validation.** Before saving the recipe, the artist wants to see exactly what the pipeline will produce. They click "Preview full" or "Render now."
4. **Sketch override development.** A user writing a custom p5.js sketch needs the preview to behave identically to the pipeline render — they're debugging the sketch, not exploring presets.

The four cases want different fidelity/responsiveness ratios. A unified architecture that handles all four is the goal.

## Goals

- Interactive preview updates within 200ms of a control change for the common case (preset switch, knob drag).
- "Preview full" and "Render now" produce output identical to what the pipeline would produce on the same date (byte-identical when payloads match).
- Sketch override development works in the editor — what the developer sees in the preview is what the pipeline will render.
- The same sketch code path runs in both contexts — no editor-only code branches in the sketch.

## Constraints

- *Shared payload format* — same `window.OCEAN_PAYLOAD` shape in editor and pipeline (TA §constraints; ADR-008).
- *Determinism* — same payload + same sketch = same render (TA §constraints). Any difference in output means a difference in input.
- *No editor-only sketch code* — sketches must not branch on a "preview mode" flag. The sketch is one code path with one set of inputs.

## Proposed approach

**Real sketch, two payload tiers, explicit "Preview full" affordance.**

The editor preview runs the actual p5.js sketch, in a sandboxed iframe, against a *downsampled* version of the recipe's payload. The downsampling is deterministic — the same recipe and date always produces the same downsampled payload — so the preview is reproducible across sessions. The downsampling lives in the editor's payload-builder, not in the sketch:

```
Pipeline path (full):
  data/processed/oisst/2026-04-25.json (280×360 floats)
  → payload.primary.data (280 × 360 = 100,800 values)
  → sketch renders 1200×900 PNG

Editor preview path (downsampled):
  data/processed/oisst/2026-04-25.json (280×360 floats)
  → editor downsamples to 140×180 = 25,200 values
  → payload.primary.data (25,200 values)
  → sketch renders 600×450 PNG (fits in editor preview pane)
```

Two specific affordances in the editor flip bar:

- **Preview full**. Switches the preview to full payload + canvas resolution. Renders take 1–3 seconds; not interactive but matches pipeline output exactly.
- **Render now**. Triggers an out-of-schedule pipeline render. Writes the PNG to `renders/` and updates `manifest.json`. For when the artist wants the archival version immediately.

Critically, the *sketch code* is the same in all paths. The sketch reads `window.OCEAN_PAYLOAD.primary.data` regardless of whether `data` is 25,200 or 100,800 values. The shape and lat/lon range fields tell the sketch how to interpret the array. No sketch-side branching on size.

This means a sketch override developed in the editor will behave identically in the pipeline — the only difference is array length, which the sketch already handles via `payload.primary.shape`.

## Alternatives considered

### Alternative: real sketch + full payload

Run the sketch with full-resolution data in the editor preview, no downsampling.

Rejected because interactive responsiveness suffers. A 280×360 OISST grid with 4000 particles in a `field` render type is around 50ms per frame in a typical browser — fast enough for "fast preview", marginal for "drag a control and see continuous feedback." For composite renders with multiple sources, latency climbs to 100–200ms per frame. Acceptable for "Preview full" but not for the dragging-a-knob experience the editor needs.

### Alternative: pre-rendered preview cache

Precompute preview frames for common parameter combinations (e.g., the five mood presets at the corners of the energy×presence space). Display the cached preview, interpolate visually between cached frames during drag.

Rejected because it breaks parity with the pipeline. A cached frame is a snapshot; if the data changes (next day's render) or the sketch changes (a code update), the cache is stale and the preview lies. The cost of cache invalidation is more than the cost of running the sketch live.

### Alternative: simplified approximation sketch

Write a separate "preview sketch" per render type that approximates the pipeline sketch's look but uses faster algorithms. Same payload format, different code.

Rejected because it violates the no-editor-only-sketch-code constraint. The whole point of ADR-008 is that one sketch runs in both contexts. A separate approximation sketch means two pieces of code that must be kept in visual sync forever — a guaranteed source of drift.

## Trade-offs

- **Downsampling has visual character.** A 140×180 OISST grid looks slightly different from 280×360 — coarser features, less fine detail. The artist sees an approximation during interactive editing and the actual render only on Preview full / Render now. Acceptable because the artist is making *creative* decisions during interactive use; fine-detail decisions are made at Preview full.
- **The downsampling algorithm is itself a contract.** Bilinear vs. nearest-neighbour vs. mean-pooling affects what the artist sees. Need to lock this in the ADR.
- **Composite renders with multiple sources may still be slow at downsampled scale.** The Preview full button is the relief valve; users learn to use it for complex recipes.

## Open questions

1. Downsampling algorithm: bilinear, nearest-neighbour, or mean-pooling? Bilinear preserves smooth gradients (good for fields); mean-pooling preserves visual statistics. Probably bilinear for v1 — confirm at ADR.
2. Should the downsampling factor be fixed (always 2x) or adaptive (dependent on grid size)? Fixed is predictable; adaptive handles the wide range of source resolutions.
3. Sketch override development: should there be a "force full payload in editor preview" mode for developers, or is "Preview full" sufficient? Probably sufficient.

## How this closes

- **ADR-NNN — Editor live preview architecture.** Locks the real-sketch-with-downsampled-payload approach, the two affordances (Preview full, Render now), and the downsampling parameters.

## Links

- **TA** — §components/render-system · §components/web-frontend · §constraints (shared payload, determinism)
- **Related PRDs** — PRD-003 Recipe Editor (this RFC was flagged in its open threads)
- **Related ADRs** — ADR-008 Shared payload format
- **Related RFCs** — RFC-002 Render payload format
