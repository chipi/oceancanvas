# RFC-013 — Editor controls: circular knobs + envelope-aware indicators

> **Status** · Draft v0.1 · 2026-05-14
> **TA anchor** · components/web-frontend · contracts/recipe-yaml
> **Related** · RFC-004 Live preview architecture · RFC-011 Tension arc · RFC-012 Atmospheric audio (paired) · RFC-014 Modulation graph (deferred, forward-compat target)
> **Closes into** · ADR-031 (Knob component contract + interaction model)
> **Why this is an RFC** · Replacing the editor's `<input type="range">` sliders with a circular knob component is straightforward in isolation, but lands on top of two genuinely open questions: which drag-interaction model fits a Web-based editor that emulates a desktop plugin (rotary vs. vertical drag, modifier-key fine-tune, double-click reset), and how the component is shaped *now* so that RFC-014's modulation graph can plug in *later* without a second migration. There is also a scope question — every slider in the editor, or only the audio-side controls landed by RFC-012? Each choice has real consequences for accessibility, bundle size, and the cost of the migration.

---

## The question

The current editor controls are HTML range inputs styled with CSS — vertical for channel mix and EQ, horizontal for the temporal-weight slider, and a custom SVG handle for the tension-arc peak. They work, but they sit in an aesthetic neighbourhood that the audio identity work in RFC-012 is leaving behind. Native Instruments-style plugins establish a recognisable visual language — large circular knobs with value arcs, label below, current value above, vertical drag to set, double-click to reset — that signals "this is a tactile instrument, not a form." Adopting that language is the headline UX shift paired with the new audio identity.

The architectural question is **what the shared `<Knob>` component looks like at its API and interaction level so that (a) the migration from sliders is mechanical, (b) accessibility is preserved, and (c) the forthcoming modulation graph (RFC-014) can attach without redesigning the component.** Three sub-questions sit underneath:

- **Drag affordance.** Rotary drag (follow a circle), vertical drag (up = more), or both? Desktop plugin conventions favour vertical drag; web users may expect rotary; touch users want neither and need a tap-target with arrows.
- **Envelope-aware indicator.** RFC-014 will let any parameter be driven by an envelope. The knob must show both the *set point* (where the recipe defines it) and the *current modulated value* (where the envelope is now). The component has to be shaped for this now even though RFC-014 isn't drafted — otherwise a second migration happens later.
- **Replacement scope.** Every slider in the editor (TimelineScrubber, spectrumInput, EQ bands, channel mix, ArcEditor peak), or only the audio controls landed by RFC-012? A linear timeline scrubber is fundamentally non-rotary; forcing it into a knob is wrong.

This RFC is paired with **RFC-012** — they ship together. RFC-012's new audio parameters (`atmosphere`, `vocal_presence`, atmospheric defaults) only feel right with a control surface that matches the new identity.

## Use cases

1. **Editing the new audio identity.** An author opens the Video Editor with an `ambient`-identity recipe, sees `atmosphere`, `vocal_presence`, `drone.presence` as three large knobs with current values displayed and value-arcs filled to current position. Dragging vertically rebalances the audio in real time. The feeling is "studio plugin," not "settings form."
2. **Fine adjustment.** The author Shift+drags a knob to fine-tune `pulse_sensitivity` at 10× resolution. Releases at 0.28, presses backtick or double-clicks to reset to default (0.30). Pressing ↑ five times nudges back to 0.33.
3. **Forward-compat preview of modulation.** Once RFC-014 lands, the author binds `atmosphere` to a tension-arc envelope. The knob now shows the recipe's *set point* as a static tick and the *current modulated value* as a brighter arc that animates during playback. The static set point is still draggable; the envelope drives the animated overlay.
4. **Accessibility.** A screen-reader user navigates to the `atmosphere` knob with Tab, hears "Atmosphere, slider, current value 0.6 out of 1.0," uses ↑ ↓ to adjust. ARIA semantics make the rotary visual irrelevant to non-visual interaction — the contract is still `role="slider"`.

## Goals

- **One reusable component.** `<Knob>` lives in `gallery/src/components/Knob/`, parameterised by value, range, step, label, format, size, and forward-compat modulation state. Every audio-side control in RFC-012 routes through it.
- **Vertical-drag interaction by default.** Industry standard for plugin emulation; trivial on touch (no rotary gesture detection needed). Modifier keys: Shift = fine-tune (10×), double-click = reset, ↑/↓ keyboard, Home/End for bounds.
- **Three sizes.** `sm` (32px) for inline rows; `md` (48px) default; `lg` (72px) for headline parameters (`atmosphere`, `vocal_presence`). Sizes are CSS — no separate component per size.
- **Envelope-aware from day one.** A reserved `modulation` prop accepts a forward-compat shape (`{ current: number, range: [number, number], source: string }`). When supplied, the knob renders a dual indicator: static set point + animated current value. When null, renders single static state. RFC-014 lights up the prop; RFC-013 ships with it inert.
- **Accessibility preserved.** `role="slider"`, `aria-valuemin/max/now`, keyboard navigation, screen-reader announcements identical to the existing range inputs. The rotary visual is a presentation choice; the semantics are slider semantics.
- **Replacement scope: audio-controls only in this RFC.** Channel mix volumes, EQ bands, `atmosphere`, `vocal_presence`, `pulse_sensitivity`, `accent_style` (pill group, not knob), `drone.presence`, `drone.glide`. The TimelineScrubber and the ArcEditor peak handle remain linear/2D respectively. A future RFC can extend the knob to non-audio controls if the visual identity benefits.
- **No third-party dependency.** SVG + React, no new npm packages. The codebase already builds SVG controls (ArcEditor); the patterns extend cleanly.

## Constraints

- **Self-hostable** (TA constraints). No CDN-loaded knob library; the component ships in the gallery bundle.
- **Cross-browser, cross-touch.** Pointer Events API (already used in ArcEditor). Works on Chrome/Firefox/Safari desktop and iOS Safari / Android Chrome.
- **Accessibility per WAI-ARIA** — knob uses the `slider` role per the W3C ARIA pattern recommendation for rotary controls; keyboard interaction matches standard slider keys.
- **Bundle size.** No bundle regression beyond the new component itself. Total cost target ≤ 3KB gzipped for the Knob module.
- **Deterministic preview.** Knob change events fire `onChange` synchronously; recipe round-trip is unaffected.

## Proposed approach

### Component API

```tsx
import { Knob } from "components/Knob";

<Knob
  value={atmosphere}
  onChange={setAtmosphere}
  min={0}
  max={1}
  step={0.01}
  defaultValue={0.6}              // double-click reset target
  size="lg"                       // "sm" | "md" | "lg"
  label="Atmosphere"
  format={(v) => v.toFixed(2)}    // optional value formatter
  disabled={false}
  modulation={null}               // forward-compat for RFC-014; null today
/>
```

### Modulation prop shape (forward-compat for RFC-014)

```ts
type ModulationState = {
  current: number;                // current modulated value (e.g. envelope-driven)
  range: [number, number];        // min/max the envelope can reach
  source: string;                 // "tension_arc" | "envelope:<id>" — display string
} | null;
```

When `modulation === null`, the knob renders a single static arc and value. When supplied, it renders:

- Static set-point tick at `value` (small notch on the ring)
- Animated arc filled to `current`
- `source` shown as a small label below the main label ("← tension_arc")
- Drag still modifies `value` (the set point); `current` is read-only

RFC-013 ships with `modulation` always null. RFC-014 lights it up.

### Interaction model

- **Pointer down + vertical drag** — drag up to increase, drag down to decrease. Drag distance maps to value range with a sensitivity constant (200px = full range at `md` size).
- **Shift + drag** — 10× slower (fine-tune).
- **Double-click** — reset to `defaultValue`.
- **Keyboard** — ↑ / ↓ increment by `step`. Shift+↑/↓ increments by `step / 10`. Home / End jump to min / max.
- **Touch** — same vertical-drag semantics. Tap holds for 200ms to enter fine-tune mode (visual feedback: ring thickens).
- **No rotary drag.** Following a circle with the cursor is slow on desktop and unreliable on touch; the visual is rotary, the gesture is linear.

### Visual language

- **Ring arc** from 7 o'clock (min) to 5 o'clock (max) — leaves the bottom open for the value label. Filled arc shows `value`. Stroke width scales with size.
- **Center label** — current value, formatted via `format` prop, regenerated on change. Hidden when ring is animating from modulation (the animated arc carries the information).
- **Below**: parameter `label`.
- **Optional source label** when `modulation` is supplied.
- **Disabled state** — desaturated, reduced opacity, no pointer events.

Colours use existing `tokens.css` variables — `--editor-knob-track`, `--editor-knob-fill`, `--editor-knob-handle`, `--editor-knob-modulation` — new tokens added in this RFC's landing commit.

### Replacement scope (in this RFC)

| Site | Current | After |
|---|---|---|
| `AudioWaveform.tsx` channel mix volume | vertical `<input type="range">` | `<Knob size="sm" min=0 max=1.5>` |
| `AudioWaveform.tsx` EQ bands (bass/mid/treble) | vertical `<input type="range">` | `<Knob size="sm" min=-12 max=12 format={(v) => `${v}dB`}>` |
| New audio controls (RFC-012) — atmosphere, vocal_presence, drone.presence, pulse_sensitivity | n/a | `<Knob size="lg">` for the first two; `<Knob size="md">` for the rest |
| `CreativeControls.module.css` `.slider`, `.sliderWrap` (temporal weight) | horizontal `<input type="range">` | `<Knob size="md">` |
| `CreativeControls.module.css` `.spectrumInput` | range input | `<Knob size="md">` |
| `ArcEditor.tsx` peak handle | SVG drag on 2D canvas | **unchanged** — peak position is genuinely 2D, knob is wrong shape |
| `TimelineScrubber.tsx` | linear scrubber | **unchanged** — time is linear, knob is wrong shape |
| Pill groups (accent_style, identity, etc.) | button group | **unchanged** — discrete enum, pills remain |

### Accessibility

```tsx
<div
  role="slider"
  tabIndex={disabled ? -1 : 0}
  aria-label={label}
  aria-valuemin={min}
  aria-valuemax={max}
  aria-valuenow={value}
  aria-valuetext={format(value)}
  aria-disabled={disabled}
>
  …
</div>
```

Standard slider semantics; screen-reader behaviour identical to the range inputs being replaced. The W3C ARIA Authoring Practices Guide explicitly recommends `role="slider"` for rotary knobs — the rotary visual is a UI detail, the underlying control is a slider.

### Tests

A `Knob.test.tsx` vitest suite covers: value change via drag, keyboard increment, Shift fine-tune, double-click reset, disabled state, ARIA attributes, modulation prop rendering (set point + animated current). Touch interaction is smoke-tested with synthetic Pointer events.

### Storybook / preview

Not in scope. The Video Editor itself becomes the showcase — RFC-012's new ambient-identity recipes serve as the visual reference.

## Alternatives considered

### Alternative — keep range inputs, restyle aggressively

CSS-only restyling of `<input type="range">` can produce knob-like visuals. No new component.

Rejected. Range inputs cannot render a circular ring in pure CSS without absurd transforms; the value indicator and the modulation overlay both require SVG. Restyling also can't deliver the envelope-aware dual indicator that RFC-014 will rely on. The migration is unavoidable; postponing it costs a second migration when modulation lands.

### Alternative — adopt a third-party knob library (`react-rotary-knob`, `react-nexusui`, etc.)

Mature libraries with the visual language already implemented. Drop-in replacement.

Rejected. Bundle weight (typically 30–100KB), dependency-graph risk (most are unmaintained or single-author), API mismatch with the forward-compat modulation prop (libraries don't model envelope-driven values), and aesthetic mismatch with the OceanCanvas voice (most libraries ship a generic plugin look). The component is small enough to own — ArcEditor is already an SVG control of comparable complexity.

### Alternative — Web Component (`<oc-knob>`) instead of React component

Framework-agnostic, embeddable in non-React contexts.

Rejected. The gallery is the only consumer; there is no non-React context. Web Components introduce a parallel reactivity model (attribute observation, custom events) that React has to wrap anyway. No benefit, real friction.

### Alternative — rotary drag (follow the circle)

Mouse moves clockwise → value increases. Visually intuitive.

Rejected. Slow on desktop (cursor has to travel a circular path), unreliable on touch (finger occludes the control), poor for fine adjustments (low resolution near the centre). Vertical drag is the consensus answer in every shipping plugin host — Logic, Ableton, Bitwig, Reaper. The visual is rotary, the gesture is linear.

### Alternative — replace every slider in the editor in one pass

Migrate TimelineScrubber, ArcEditor peak, and every other range input simultaneously.

Rejected. Linear and 2D controls are not knobs; forcing them into the visual language harms usability. The point of the redesign is to match identity to control, not to homogenise. The TimelineScrubber stays a scrubber; the ArcEditor stays a 2D handle.

### Alternative — defer envelope-awareness to RFC-014

Build the knob now without `modulation` prop; add it when RFC-014 needs it.

Rejected. Shaping the API to add a single prop later is essentially free; retrofitting the visual to support a dual indicator after the fact requires touching every consumer. A reserved-but-inert prop costs nothing on the day RFC-014 starts.

## Trade-offs

- **Migration touches every audio control.** Five files in the immediate scope (AudioWaveform, CreativeControls, the new RFC-012 controls). Mechanical work but real diff weight.
- **Touch fine-tune via tap-hold** is slightly hidden; the convention isn't universal. Mitigation: tooltip or visual cue on first touch interaction. Worth iterating after first build.
- **Modulation prop ships inert.** Anyone reading the code sees a prop that does nothing yet. Document it inline with a `// see RFC-014` reference; remove the comment when RFC-014 lights it up.
- **Visual consistency burden.** Once knobs ship for audio, the contrast with linear scrubbers and pill groups becomes more visible. Acceptable — different control shapes for different control semantics is the right outcome, not a regression.
- **No Storybook scaffold.** Iteration happens directly in the Video Editor. Faster to ship; slower to test edge cases in isolation. Acceptable for a first version.

## Open questions

1. **Tap-hold for fine-tune on touch** — works for the gesture, but discoverability is poor. Add an on-screen affordance (e.g., a "fine" toggle button next to the knob group)? Recommendation: ship without, add affordance after first author feedback.
2. **Reset behaviour when `defaultValue` is absent.** If the recipe doesn't specify a default, what does double-click do? Options: no-op, reset to the param's mid-point, reset to the preset default. Recommendation: no-op; documentation makes `defaultValue` part of the contract.
3. **Modulation source label format.** "← tension_arc" is one option; an inline icon might be cleaner. Decide once RFC-014 is closer.
4. **Knob hover preview.** Should hovering show a tooltip with the precise value before clicking? Useful for non-touch; redundant for touch. Recommendation: yes on hover-capable devices, gated by `@media (hover: hover)`.
5. **Sensitivity tuning.** 200px = full range at `md` is a starting guess. May need adjustment after first use — author trying to nudge `pulse_sensitivity` by 0.01 wants different ergonomics than author setting `atmosphere` from 0 to 1. Recommendation: ship the constant, treat tuning as a follow-up.
6. **Right-click modulation routing.** Absynth lets authors right-click a parameter knob to assign a modulation source without leaving the knob. RFC-014 and RFC-016 introduce two modulation sources (envelopes, clocks); the natural affordance is a context menu on each Knob — "Bind to envelope…", "Bind to clock…", "Unbind". Recommendation: ship in the RFC-014 landing (not RFC-013) so the source picker is wired against real targets, but the Knob component reserves the right-click handler now.
7. **Clock-aware modulation indicator.** RFC-013's dual indicator (static set point + animated current value) treats `modulation.current` as a monotonic-progress value tied to playback position. RFC-016's clocks are *cyclic* — the current value oscillates rather than progresses. Should the visual treatment differ (e.g., a small phase-circle overlay for cyclic sources, the linear arc overlay for envelopes), or stay uniform? Recommendation: uniform at v1 — `current` is a number in the param range either way; the source label tells the author whether to expect cyclic motion. Revisit if cyclic motion confuses authors.

## How this closes

- **ADR-031 — Knob component contract + interaction model.** Locks the component API (props, modulation shape), the interaction model (vertical drag, modifier keys, keyboard), the size scale (sm/md/lg), the accessibility contract (`role="slider"`, ARIA attributes), and the replacement scope (audio controls in; linear/2D controls out).

Closure trigger: Phase 1 implementation forces the API decision once the Video Editor uses the component for all RFC-012 audio parameters end-to-end.

## Links

- **Source** — RFC-012 *Atmospheric audio* (paired)
- **TA** — components/web-frontend · contracts/recipe-yaml
- **Related RFCs** — RFC-004 Live preview architecture · RFC-011 Tension arc · RFC-012 Atmospheric audio · RFC-014 Modulation graph (deferred)
- **External reference** — [W3C WAI-ARIA Authoring Practices: Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) for the `role="slider"` recommendation on rotary controls
