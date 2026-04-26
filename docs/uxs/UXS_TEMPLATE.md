# UXS-NNN — [Surface name]

> **Status** · Draft v0.1 · [date]
> **IA anchor** · §surfaces/[…] · §shell-regions/[…] · §shared-tokens
> **Related PRD** · PRD-NNN
> **Related ADRs** · ADR-NNN, ADR-NNN
> **Related RFC** · RFC-NNN (for behavioural rules — animation, debounce, keyboard)

---

## Why this UXS exists

[1–2 sentences. What is this surface and why does it warrant its own visual contract. If the answer is "it's just like UXS-NNN," consider extending that one instead.]

## Principles

[The design convictions for this surface. 3–5 bullets. These explain the *why* behind the token choices.]

- [Principle 1]
- [Principle 2]
- [Principle 3]

## Scope

**In scope** · [the panels, components, and views this UXS covers]

**Non-goals** · [explicitly what this UXS does *not* cover — usually deferred surfaces or surfaces with their own UXS]

**Boundary note** · Behaviour (animation timing, debounce, keyboard shortcuts, scroll behaviour, focus management transitions) belongs in [RFC-NNN], not here. If you find yourself writing "when the user clicks X, Y animates to Z" in this doc, that sentence belongs in the RFC.

## Theme

Dark only. (OceanCanvas is dark-only by design — see `OC_IA.md §shared-tokens`.)

## Tokens

### Inherited from IA

[Reference the shared tokens this UXS uses. Don't restate values — just reference.]

- **Surface** · `canvas`, `surface`, `overlay`, `border` (`OC_IA.md §shared-tokens/surface-tokens`)
- **Text** · `text`, `text-secondary`, `text-muted` (`OC_IA.md §shared-tokens/text-tokens`)
- **Intent** · `intent-alert`, `intent-info` (`OC_IA.md §shared-tokens/intent-tokens`)
- **Typography** · `type-hero`, `type-display`, `type-data`, `type-body`, `type-axis`, `type-label`
- **Spacing** · base unit 4px

### Defined here (surface-specific)

[Tokens that are unique to this surface or source. Per [ADR-017], domain tokens for sources go here in the per-source UXS.]

| Token | Value | Usage |
|---|---|---|
| `domain-{x}-base` | `#hex` | Primary identity for the source |
| `domain-{x}-accent` | `#hex` | Highlights, active states |
| `domain-{x}-fill` | gradient or stops | Heatmap / chart fills |

## Layout

### [View name]

[Layout description. Use ASCII diagrams or component lists. Identify the major regions and their behaviour. Reference IA shell-regions where they appear.]

```
┌─────────────────────────────────────────────────┐
│ [Topbar] (42px, IA shell)                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Main content region — describe]               │
│                                                 │
└─────────────────────────────────────────────────┘
```

| Region | Width / Height | Purpose |
|---|---|---|
| [region] | [size] | [description] |

## Component states

[Static visual states only. Hover, active, focus, disabled, loading, empty, error. Do NOT include timing or transitions — those are RFC territory.]

| Component | Default | Hover | Active | Focus | Disabled | Loading | Empty | Error |
|---|---|---|---|---|---|---|---|---|
| [component] | [token / description] | [...] | [...] | [...] | [...] | [...] | [...] | [...] |

## Accessibility

- **Contrast** · all foreground/background pairings meet WCAG AA at minimum (4.5:1 for body text, 3:1 for large text). Hero numbers at `type-hero` against `canvas` confirmed compliant.
- **Focus** · focus rings use `border-strong` token; visible on all interactive elements; never hidden via `outline: none` without an alternative.
- **Keyboard** · all interactive elements reachable in tab order. Tab-order rules are RFC territory; this UXS only confirms reachability.
- **Reduced motion** · per-RFC behaviour rules respect `prefers-reduced-motion`; this UXS specifies static appearance only.

## Acceptance criteria

- [ ] All colours use semantic tokens — no one-off hex values
- [ ] All foreground/background pairings use matching token pairs from this spec or IA's `§shared-tokens`
- [ ] Domain tokens used only for source identity — intent tokens are not used to indicate sources
- [ ] No chart borders, no boxed numbers, no light-mode backgrounds
- [ ] Numbers at correct typography token per the layout tables
- [ ] Section labels in spaced caps at `text-muted`
- [ ] Focus visible on all interactive elements
- [ ] Keyboard reachability confirmed for all interactive elements

---

## Notes on writing UXS in this format

**The boundary is sharp.** UXS = static visual contract. Tokens, layout, component appearance, accessibility targets. Behaviour (when X clicked, Y animates) belongs in an RFC. If a UXS section starts to read like a sequence of events, it's probably an RFC paragraph in disguise.

**Inherit from IA.** Shared tokens (canvas, surface, text, intent, typography, spacing) live in IA. Reference them by token name. Don't restate values — restating creates two sources of truth that drift.

**Define what's distinctive.** Domain tokens, source-specific layouts, component states unique to this surface live in the UXS. The test: would a second surface (or second source) want a different value? If yes, it's per-UXS.

**Voice.** UXS is the most functional document in the system. State the contract; don't argue for it. The argument lives in the related PRD (the surface's reason to exist) or the related ADR (the design decisions). UXS is the implementation contract.

**Length.** Two to four pages. Long enough to cover layout + tokens + states; short enough to be reviewable in one pass.
