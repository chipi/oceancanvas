# PRD-006: Recipe Editor Studio

- **Status**: Draft
- **Related RFCs**: `docs/rfc/RFC-001-recipe-yaml-schema.md`, `docs/rfc/RFC-002-render-payload-format.md`
- **Related ADRs**: `docs/adr/ADR-008-p5js-puppeteer-rendering.md`, `docs/adr/ADR-015-editorial-design-philosophy.md`
- **Related UXS**: `docs/uxs/UXS-002-recipe-editor.md`
- **Source**: OC-02 Section 4 (Surface 2), OC-04 Recipe Editor Studio

## Summary

The recipe editor is where ocean data becomes art. It is a single-surface studio with a persistent live preview (running the actual p5.js sketch with today's real data) and a control surface below it that flips between two modes: creative mode (editorial controls — mood, energy, colour, time) and YAML mode (the recipe file the controls are generating). The editor operates at the level of artistic intent, not technical parameters.

## Background & Context

The design principle for the recipe editor: a 1-1 knob mapping (colormap, particle_count, opacity) is the wrong abstraction for a creative user. Someone thinking "I want this to feel like a storm" should never need to think about particle_count: 4000. The creative control surface lives at the level of intent. Technical parameters are generated output, not user input.

## Goals

- Let users compose generative art recipes through editorial controls (mood, energy, colour character, temporal weight) without exposing technical parameters
- Provide full YAML transparency for power users via the flip toggle
- Show the live preview — today's actual ocean data rendered in real time — as the reference for every creative decision
- Save recipes as YAML files that the pipeline can immediately pick up

## Non-Goals

- Technical parameter editing as the primary path — that is YAML mode, which is secondary
- Recipe versioning or history — Phase 1 supports save and overwrite only
- Multi-recipe comparison — single recipe focus

## User Stories

- *As a user, I can select a mood preset and see the live preview update instantly to reflect that mood.*
- *As a user, I can drag a point in the energy × presence space and watch the render respond without thinking about opacity values.*
- *As a power user, I can flip to YAML mode and see exactly which parameters correspond to my creative choices (highlighted in amber).*
- *As an advanced user, I can open the sketch editor and write raw p5.js code with the render payload pre-loaded.*

## Functional Requirements

### FR1: Live preview

- **FR1.1**: The preview canvas runs the p5.js sketch in the browser with today's data from `data/processed/`
- **FR1.2**: The preview updates when creative controls change (debounced — no repaint on every pixel move)
- **FR1.3**: The preview is always visible — the flip toggle changes only what is below it, not the preview
- **FR1.4**: "Preview full" opens the preview at canvas resolution in a full-browser overlay
- **FR1.5**: "Render now" triggers an immediate pipeline render and writes the PNG to `renders/`

### FR2: Creative mode controls

- **FR2.1**: Mood presets: Becalmed · Deep current · Storm surge · Surface shimmer · Arctic still — each sets the full parameter space simultaneously
- **FR2.2**: Energy × presence: a 2D Cartesian canvas where the user drags a single point. X: calm → turbulent. Y: ghost → solid. Quadrant labels: Storm · Turbulent ghost · Becalmed · Dormant.
- **FR2.3**: Colour character: a continuous spectrum track from Arctic cold → Thermal warmth → Otherworldly — maps to colormap selection
- **FR2.4**: Temporal weight: a named scale (moment → ephemeral → present → lingering → epoch) — maps to tail length, ring decay, layer accumulation
- **FR2.5**: Render type chips: Field · Particles · Contour · Pulse · Scatter (Phase 1: field, particles, contour active)

### FR3: YAML mode

- **FR3.1**: Flip to YAML replaces creative controls with the recipe YAML — preview unchanged
- **FR3.2**: Amber highlighted lines are exactly the parameters set by creative controls — update live as controls change
- **FR3.3**: Structure and source lines are rendered in dim blue; values in teal
- **FR3.4**: The YAML is directly editable — changes snap creative controls to the closest matching position (bidirectional sync)
- **FR3.5**: Flip bar hint text changes between modes: "mood · energy · colour · time" in creative mode, "amber lines are your creative choices" in YAML mode

### FR4: Sketch editor

- **FR4.1**: "Sketch editor ↗" opens a full-screen p5.js code editor — link out, not a mode flip
- **FR4.2**: The editor opens with the auto-generated sketch template for the current render type pre-loaded
- **FR4.3**: `window.OCEAN_PAYLOAD` is pre-loaded — the sketch receives the same payload as the pipeline render

### FR5: Save

- **FR5.1**: "Save recipe" writes the YAML to `recipes/{recipe_name}.yaml`
- **FR5.2**: The pipeline picks up the new recipe on the next daily run without any additional steps

## Success Metrics

- Live preview updates within 200ms of a creative control change
- Amber YAML lines correctly reflect all creative control changes bidirectionally
- A recipe saved from the editor renders correctly on the next pipeline run

## Dependencies

- PRD-003: Recipe system (defines the YAML format the editor produces)
- PRD-004: Rendering pipeline (the sketch code is shared between editor preview and pipeline)
- RFC-001: Recipe YAML schema
- RFC-002: Render payload format

## Release Checklist

- [ ] All five mood presets updating the full parameter space correctly
- [ ] Energy × presence 2D space updating preview with correct mapping
- [ ] Colour character spectrum updating colormap correctly
- [ ] YAML mode showing amber lines that match creative controls bidirectionally
- [ ] Save writing valid YAML that the pipeline can parse
- [ ] Sketch editor opening with correct template and payload
