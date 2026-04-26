# UXS-003 — Recipe Editor

> **Status** · Draft v0.1 · April 2026 · drafted from prototype mockups (OC-02 Figs 4–5)
> **IA anchor** · §surfaces/recipe-editor · §topbar-patterns/recipe-editor · §shared-tokens
> **Related PRD** · [PRD-003 Recipe Editor](../prd/PRD-003-recipe-editor.md)
> **Related ADRs** · [ADR-006 p5.js as sketch language](../adr/ADR-006-p5js-sketch-language.md) · [ADR-008 Shared payload format](../adr/ADR-008-shared-payload-format.md)
> **Related RFCs** · [RFC-001 Recipe YAML schema](../rfc/RFC-001-recipe-yaml-schema.md) — *needs revision; the prototype shows a flat schema with comment-marked sections rather than the two-tier shape RFC-001 v0.1 proposed* · [RFC-004 Live preview architecture](../rfc/RFC-004-live-preview-architecture.md) · [RFC-005 YAML round-tripping](../rfc/RFC-005-yaml-round-tripping.md)

---

## Why this UXS exists

The Recipe Editor is where data becomes art. Of the four primary surfaces, it is the one whose visual contract most closely controls *the act of authorship*. The single preview canvas above a flip toggle, the five mood presets, the energy×presence quadrant, the colour-character spectrum, and the temporal-weight slider are not generic UI controls — they are creative instruments. This UXS specifies their static visual contract; behaviour (live preview update, flip animation, slider interaction) lives in the RFCs above.

## Principles

- **Preview is permanent.** The render canvas is always visible at the top, occupying roughly the upper third. It does not collapse, does not hide. The artist sees the work changing as they work.
- **Flip, don't tab.** Creative mode and YAML mode are alternative views of the same recipe state, not separate panels. The flip toggle makes the duality explicit. Both serve the same artist; both are first-class.
- **Creative controls are instruments, not forms.** Mood pills are not radio buttons. The energy×presence quadrant is not a coordinate input. They are tools that map directly to artistic intent — calmness, turbulence, presence, ghost. Their visual language is closer to a synthesizer panel than a settings dialog.
- **Power respect.** Power users editing YAML directly see their work honoured. Amber-highlighted lines indicate "this came from creative mode"; everything else is structural and editable. The system never silently overwrites.

## Scope

**In scope** · Recipe Editor topbar with status badges; preview canvas with overlay metadata and Preview-full / Render-now affordances; flip toggle bar (creative / yaml); creative-mode controls (mood, energy×presence, colour character, temporal weight); YAML mode display with structural / creative-line colour coding; bottom action bar (save recipe / discard); domain tokens specific to the editor's interactive surfaces.

**Non-goals** · Sketch Editor mode (a separate full-screen mode, deferred to its own UXS); the recipe list at `/recipes` (deferred); behavioural rules for live preview, slider interaction, flip animation, YAML editor hotkeys.

**Boundary note** · Live preview update timing (RFC-004), flip animation, slider drag behaviour, and the YAML round-tripping detection algorithm (RFC-005) all belong in their respective RFCs. This UXS specifies static appearance only — what each control looks like, not how it responds.

## Theme

Dark only.

## Tokens

### Inherited from IA

- **Surface** · `canvas`, `surface`, `elevated`, `overlay`, `border`, `border-strong`
- **Text** · `text`, `text-secondary`, `text-muted`, `text-disabled`
- **Intent** · `intent-info` (primary actions: save recipe, render now); `intent-alert` (discard / destructive)
- **Typography** · `type-display`, `type-data`, `type-body`, `type-axis`, `type-label`
- **Spacing** · base unit 4px

### Defined here — `editor-*`

The Recipe Editor introduces its own surface-specific tokens: the creative-line colour for YAML highlighting, the structural-line colour, and the colour-character gradient.

| Token | Value | Usage |
|---|---|---|
| `editor-creative` | `#EF9F27` | Amber — creative-controlled YAML lines, MOOD active pill border, the "amber lines are your creative choices" hint |
| `editor-structure` | `#5DCAA5` | Teal — structural YAML lines (region:, sources:, schedule:), save action |
| `editor-quadrant-active` | `#5DCAA5` | Teal — active dot in the energy×presence quadrant |
| `editor-quadrant-grid` | `border` | Hairline cross dividing the quadrant into four regions |
| `editor-spectrum-cold` | `#2D5BA8` | Cold end of colour-character spectrum (Arctic) |
| `editor-spectrum-thermal` | `#EF9F27` | Mid of colour-character spectrum (Thermal) |
| `editor-spectrum-otherworldly` | `#9B7BCA` | Warm/strange end of colour-character spectrum (Otherworldly) |
| `editor-slider-handle` | `text` | Slider handles — solid white circle |

`editor-creative` and `editor-structure` are intentionally close to `domain-sst-accent` and `intent-info` — but they're different tokens because their semantics are different. Creative-line colouring and source identity are not the same concept.

## Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ OCEANCANVAS  /north_atlantic_sst       live · OISST   25 Apr 2026   field │  ← topbar (42px)
├──────────────────────────────────────────────────────────────────────────┤
│                                                          ┌──────────────┐│
│ FIELD RENDER                                             │   Becalmed   ││
│ 14.2°  (domain-sst-accent, type-data)                    │              ││
│ region mean · North Atlantic                             │ SST · GEBCO  ││
│                                                          └──────────────┘│
│                                                                          │
│            PREVIEW CANVAS                                                │
│            (live render with current recipe state                        │
│             — same payload format as pipeline, downsampled per RFC-004)  │
│                                                                          │
│                                                                          │
│                                                                          │
│                                                                          │
│                                              preview full   render now   │  ← affordances bottom-right
│                                              (text-secondary text buttons)│
├──────────────────────────────────────────────────────────────────────────┤
│ [creative]  [yaml]    mood · energy · colour · time          sketch editor↗│ ← flip bar (44px)
├──────────────────────────────────────────────────────────────────────────┤
│ MOOD                                                                     │
│ [Becalmed*] [Deep current] [Storm surge] [Surface shimmer] [Arctic still]│  ← mood pills row
│  ^ active                                                                │
│                                                                          │
│ ENERGY × PRESENCE                                                        │
│ ┌────────────────────────────┬────────────────────────────┐              │
│ │  Storm                     │  Turbulent ghost           │              │
│ │  (label upper-left,        │  (label upper-left,        │              │
│ │   text-muted italic)       │   text-muted italic)       │              │
│ │                            │                            │              │
│ ├──────────────●─────────────┼────────────────────────────┤              │  ← quadrant 2x2 grid
│ │  Becalmed                  │  Dormant                   │              │
│ │            ●               │                            │   calm ·     │     active dot in
│ │            (active)        │                            │   present   │     editor-quadrant-active
│ │                            │                            │              │
│ └────────────────────────────┴────────────────────────────┘              │
│                                                                          │
│ COLOUR CHARACTER                                                         │
│ [██████████████████│██████████████████████████████████████████]          │  ← gradient bar
│  Arctic cold        Thermal                       Otherworldly           │     editor-spectrum-cold
│              ▼ handle                                                    │     → -thermal → -otherworldly
│                                                                          │
│ TEMPORAL WEIGHT                                                          │
│ moment ⊓ epoch                                              ephemeral    │
│ [────────────────────────────●─────────────────────────────────────]     │  ← horizontal slider
│                                                                          │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐    │
│  │      save recipe              │  │      discard                  │    │  ← action bar (~52px)
│  │  (intent-info border)         │  │  (text-secondary, no border)  │    │
│  └───────────────────────────────┘  └───────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### YAML mode (Fig 5)

```
├──────────────────────────────────────────────────────────────────────────┤
│ [creative]  [yaml*]    amber lines are your creative choices  sketch editor↗│  ← flip toggled
├──────────────────────────────────────────────────────────────────────────┤
│ # recipe: north_atlantic_sst                                             │
│ name:     north_atlantic_sst                                             │  ← editor-structure
│ region:                                                                  │     teal/blue lines
│   lat:    [25, 65]                                                       │
│   lon:    [-80, 0]                                                       │
│ sources:                                                                 │
│   primary:    oisst                                                      │
│   context:    gebco                                                      │
│   audio:      openmeteo                                                  │
│ schedule:     daily                                                      │
│                                                                          │
│ # ⊓ creative controls ⊓ mood: Becalmed                                   │  ← comment marker
│ render:                                                                  │     in editor-creative
│   type:     field                                                        │
│   colormap: thermal                                                      │  ← editor-creative
│   opacity:  0.71                                                         │     amber lines
│   smooth:   true                                                         │
│   clamp_percentile: [2, 98]                                              │
│   overlay:                                                               │
│     levels:  5                                                           │
│     weight:  0.29                                                        │
│ audio:                                                                   │
│   feature:  wave_height                                                  │
│   ...                                                                    │
│                                                                          │
│  structure (blue)    creative controls (amber)    values                 │  ← legend at bottom
└──────────────────────────────────────────────────────────────────────────┘
```

| Region | Position / size | Tokens | Notes |
|---|---|---|---|
| **Topbar** | Full width, 42px | `surface` background, wordmark + recipe-id path in `text-secondary`, status badges on right | Per IA §topbar-patterns/recipe-editor. Status badges: `live · OISST` (data freshness), date in `text`, render type in `text-secondary` |
| **Preview canvas** | Full width, ~38% of viewport height | `canvas` background, render output fills | The actual sketch render. `<iframe>` running the same payload format as pipeline (per ADR-008) |
| **Preview metadata (top-left)** | Upper-left of preview area, padded | `type-label` for "FIELD RENDER" in `text-muted`, value in `domain-sst-accent` `type-data`, sublabel in `text-secondary` | "FIELD RENDER" / "14.2°" / "region mean · North Atlantic" |
| **Preset name (top-right)** | Upper-right of preview, in a small `surface` panel | `text` for preset name, `text-muted` for source list | "Becalmed" / "SST · GEBCO" |
| **Affordances (bottom-right)** | Lower-right of preview, padded | `text-secondary` text buttons, no borders | "preview full" and "render now" — Render-now is `intent-info` to indicate primary affordance |
| **Flip bar** | Full width, 44px | `surface` background, pills in `elevated` background; active pill has `border-strong` | Three regions: pills left, hint text centre-muted, sketch-editor link right |
| **MOOD section** | Body, with `type-label` heading | Mood pills: `elevated` background by default; active pill has `editor-creative` 1px border + `text` label; inactive pills have `text-secondary` label | Five pills in a row with 8px gaps |
| **ENERGY × PRESENCE quadrant** | Body, ~480px tall | 2×2 grid divided by `editor-quadrant-grid` hairlines; quadrant labels in `text-muted` italic at top-left of each quadrant; active position dot in `editor-quadrant-active` filled circle ~14px diameter | Right side of quadrant has `text-secondary` `type-axis` showing current position (e.g. "calm · present") |
| **COLOUR CHARACTER bar** | Full width below quadrant, ~28px tall | gradient from `editor-spectrum-cold` through `-thermal` to `-otherworldly`; handle is `editor-slider-handle` solid white circle ~14px | Three labels below the bar in `text-muted` `type-label`: "Arctic cold" / "Thermal" / "Otherworldly" |
| **TEMPORAL WEIGHT slider** | Full width, ~24px tall | Track at `border-strong`, handle at `editor-slider-handle` | Labels at far left and far right in `text-muted` `type-label`: "moment ⊓ epoch" left, "ephemeral" right |
| **Action bar** | Full width, ~52px | save: `intent-info` 1px border + `text` label centred; discard: no border, `text-secondary` label centred; both fill 50% width with 8px gap | Two-button row, no overlap with the recipe content |
| **YAML editor area** (yaml mode) | Full width replaces the creative controls area | `canvas` background, monospace font; structural lines in `editor-structure`; creative lines in `editor-creative`; comment markers (`# ⊓ creative controls ⊓ ...`) in `editor-creative` `type-label` | Plain text with syntax-aware colour coding. No line numbers in v1. |
| **YAML legend** (yaml mode) | Bottom of YAML area, single line | `text-muted` `type-axis` | "structure (blue)   creative controls (amber)   values" |

## Component states

| Component | Default | Hover | Active | Focus | Disabled | Loading | Empty | Error |
|---|---|---|---|---|---|---|---|---|
| **Mood pill** | `elevated` background, `text-secondary` label | `border-strong` 1px border | `editor-creative` 1px border + `text` label | `border-strong` ring | `text-disabled`, no interaction | n/a | n/a | n/a |
| **Quadrant active dot** | `editor-quadrant-active` filled circle | dot grows ~2px on hover | n/a (the dot is always at the active position) | `border-strong` ring around dot | n/a | shimmer | n/a | n/a |
| **Colour-character handle** | `editor-slider-handle` solid white circle on the gradient bar | handle widens slightly | n/a | `border-strong` ring | n/a | n/a | n/a | n/a |
| **Temporal slider handle** | `editor-slider-handle` on `border-strong` track | handle widens | n/a | `border-strong` ring | n/a | n/a | n/a | n/a |
| **Save recipe button** | `intent-info` 1px border, `text` label, transparent fill | `intent-info` 8% fill | `intent-info` 16% fill | `border-strong` ring | `text-disabled` border + label | spinner replaces label | n/a | label flips to `intent-alert` "save failed" |
| **Discard button** | no border, `text-secondary` label | `border` 1px appears | `border-strong` 1px | `border-strong` ring | `text-disabled` | n/a | n/a | n/a |
| **Preview-full button** | `text-secondary` text button | `text` colour | n/a (one-shot action) | `border-strong` ring | `text-disabled` | spinner replaces label | n/a | label flips to `intent-alert` |
| **Render-now button** | `intent-info` text button | `intent-info` slightly brighter | n/a (one-shot action) | `border-strong` ring | `text-disabled` | spinner | n/a | label flips to `intent-alert` |
| **YAML structural line** | `editor-structure` text | line background `surface` 4% on hover | n/a | `border-strong` outline on the line | n/a | n/a | n/a | line outlined `intent-alert` if invalid |
| **YAML creative line** | `editor-creative` text | line background `surface` 4% | n/a | `border-strong` outline on the line | n/a | n/a | n/a | line outlined `intent-alert` if invalid |

## Accessibility

- **Contrast** · `editor-creative` (`#EF9F27`) over `canvas` is 7:1+; `editor-structure` (`#5DCAA5`) over `canvas` is 9:1+. Both exceed WCAG AA. White slider handles over the gradient bar are clearly distinguishable at every position on the spectrum.
- **Focus** · all controls (mood pills, quadrant dot, sliders, action buttons) show a `border-strong` focus ring. The flip toggle pills also have a focus ring.
- **Keyboard** · mood pills navigable by arrow keys + Enter; quadrant accepts arrow keys for X/Y nudging when focused; sliders accept arrow keys for stepwise adjustment; flip toggle pills accept Enter / Space; YAML editor follows standard text-editor conventions. Keyboard mechanics for slider step size are RFC territory.
- **Reduced motion** · live-preview re-render visual settling, slider handle transitions, and flip animation respect `prefers-reduced-motion`. Per-RFC implementation.
- **Screen readers** · the preview canvas has an `aria-label` describing the recipe and current render type. Mood pills are a `role="radiogroup"` with `aria-checked`. The quadrant has an `aria-label` describing position; sliders use standard slider semantics with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`.

## Acceptance criteria

- [ ] Preview canvas is always visible at top, ~38% of viewport height, never collapses
- [ ] Preview-full and Render-now affordances appear in lower-right of preview, with Render-now in `intent-info` indicating primary
- [ ] Flip bar shows creative/yaml pills with active state via `border-strong`; sketch-editor link in `text-secondary` on right
- [ ] Mood pills use `editor-creative` 1px border for active; inactive pills only have `elevated` background
- [ ] Energy×presence quadrant divided by hairlines; quadrant labels in `text-muted` italic; active dot in `editor-quadrant-active`
- [ ] Colour-character bar uses the three-stop gradient (`-cold` → `-thermal` → `-otherworldly`); handle is solid white
- [ ] Temporal-weight slider has labels at far left ("moment ⊓ epoch") and far right ("ephemeral")
- [ ] Action bar: save recipe in `intent-info` border, discard in `text-secondary` no border
- [ ] YAML mode applies `editor-structure` to top-level keys (region, sources, schedule) and `editor-creative` to lines under `# ⊓ creative controls ⊓ ...` markers
- [ ] YAML legend at bottom in `text-muted` `type-axis`
- [ ] All semantic tokens used; no one-off hex outside `editor-*` definitions in this doc
- [ ] Focus visible on all interactive controls
- [ ] Keyboard reachability and screen-reader labels confirmed

---

## Notes for related RFCs

**RFC-001 (Recipe YAML schema) needs revision.** The prototype's YAML mode shows a *flat* schema with comment markers demarcating the creative-controlled section, not the two-tier `creative:` / `technical:` schema RFC-001 v0.1 proposed. The flat schema is cleaner — power users edit any line without nesting; the editor parses comment markers to know which lines to render in `editor-creative`. RFC-001 v0.2 should adopt the flat-with-comments approach.

**RFC-005 (YAML round-tripping) is unchanged in shape** — the matched / partially-custom / custom detection logic still applies, but it operates on lines below the `# ⊓ creative controls ⊓ ...` marker rather than on a separate `creative:` block. This UXS doesn't lock the matched/partially-custom/custom visual states yet — they're a future addition once the round-tripping is implemented.
