# RFC-006 — Audio system design

> **Status** · Draft v0.1 · April 2026
> **TA anchor** · §components/render-system · §contracts (audio scalars in payload)
> **Related** · PRD-005 Video Editor · RFC-002 Render payload format · RFC-007 Key moment detection
> **Closes into** · Multiple ADRs (pending)
> **Why this is an RFC** · The audio system is the most ambitious piece of OceanCanvas's enrichment surface, and the one where "decoration vs. data" is hardest to get right (PRD-005 sharpest threat). Multiple plausible architectures exist with real trade-offs around fidelity, dependency cost, and authorship. This is the meatiest RFC in the system.

---

## The question

A timelapse video assembles a recipe's accumulated PNG renders into film. Music plays over the film. The music must:

1. Sound like it belongs to the data, not to a stock library.
2. React to the data's behaviour — calmer in stable periods, intensifying as anomalies build, peaking when records break.
3. Honour the determinism principle — the same recipe + same date range + same audio settings should produce the same audio track.
4. Be exportable in standard MP4 containers without exotic tooling.

How do we generate this music, and how do we drive it from the data scalar time series?

Three plausible architectures:

1. **Commercial generative music API** (Mubert, Beatoven, etc.) with stem-based crossfading driven by data.
2. **Custom synthesis** using a web-audio library (Tone.js, Web Audio API) with explicit synthesis driven by data.
3. **Pre-recorded stem library** authored by the project, with crossfading between intensity levels driven by data.

Each trades off authorship, dependency cost, fidelity, and licensing differently. The choice is consequential — it affects the project's character, its cost structure, and its long-term sustainability.

## Use cases

1. **Default theme on a year-long timelapse.** Artist exports a 30-second film of a year of SST data. Picks the "ambient" theme. Music should swell at anomalies, calm at stable periods, peak at the record day, end gracefully.
2. **Dramatic theme on a sea-level rise timelapse.** Artist picks "dramatic" for a 30-year sea-level film. Music should build cumulatively across the rise, with marked moments at El Niño / La Niña events.
3. **Silent export.** Artist disables audio entirely. Film exports without an audio track.
4. **Remix / re-export.** Artist exports the same film with a different theme, comparing how the data feels under different musical interpretations.

## Goals

- Music is *driven by* the data, audibly. A listener can hear the connection between visual events and audio events.
- The same scalar time series produces the same music every time (determinism).
- Themes are distinct — ambient, dramatic, ethereal sound recognisably different.
- The system is self-hostable end-to-end (no required cloud dependency that breaks on offline use). A graceful "no audio" fallback works.
- Audio export uses standard MP4-compatible codecs.

## Constraints

- *Determinism* — same inputs → same audio bytes (TA §constraints). Generative APIs that introduce per-call randomness must be seedable or cached.
- *Self-hostable* — the system must work without commercial APIs as a fallback (TA §constraints).
- *Daily clock* — audio is generated at *export* time, not pipeline time. The pipeline produces frames; the video editor produces film + audio (TA §constraints).
- *Attribution baked in* — music attribution travels with the export. Both the data sources and the audio source/license must be in the bundled metadata.

## Proposed approach

**A two-tier system: stem-based crossfading as the primary architecture, with a pluggable stem source.**

Each theme is a set of pre-rendered stems at four to five intensity levels. The video editor reads the per-frame data scalar (RFC-007 produces this), maps it to an intensity value 0.0–1.0, and crossfades between the stems for the playback duration.

```
Theme: "ambient"
  ├── stem_0_calm.wav        (lowest intensity, sparse)
  ├── stem_1_breathing.wav   (low-mid, gentle build)
  ├── stem_2_present.wav     (mid, full texture)
  ├── stem_3_swelling.wav    (high, peak texture)
  └── stem_4_apex.wav        (highest, record-moment)
```

At export, ffmpeg crossfades between the appropriate stems at each frame. The crossfade ratio is determined by the per-frame intensity from RFC-007. A statistical peak in the data lifts the intensity → the next stem is crossed in. A record value pushes intensity to maximum → stem_4 dominates.

Where do the stems come from? The pluggable stem source has two implementations:

**Implementation A: locally-rendered stems.** Five canonical themes ship with the project as `.wav` files in `audio/themes/{theme_name}/`. Free and open (Creative Commons or similar). Self-contained — the system works fully offline.

**Implementation B: commercial API stem generation.** When a user wants a custom theme not in the local library, the editor calls Mubert (or equivalent) with the theme parameters. The API returns the five stems; they are cached locally per theme. Subsequent uses of that theme on the same machine use the cache (deterministic).

The stem-based approach decouples *music generation* (slow, sometimes external) from *music playback driven by data* (fast, always local). The data-driven part of the system is fully deterministic and self-hostable; the music itself can be sourced from anywhere.

For sub-frame transitions (smooth crossfades between intensity levels rather than discrete steps), ffmpeg's `acrossfade` filter or a per-frame mixing pass handles the interpolation.

## Alternatives considered

### Alternative: direct commercial API for full track

Each export calls Mubert or similar with the data scalar as a control input, receives a complete track for the export.

Rejected because (a) it makes the system depend on a commercial API for *any* music output — breaking the self-hostable constraint; (b) determinism is hard to guarantee through an external API; (c) cost scales linearly with exports. The stem approach uses the API only at theme-creation time, then caches.

### Alternative: custom synthesis (Tone.js / Web Audio API)

Generate music live in the browser using a web-audio synthesis stack with explicit data-driven envelopes.

Rejected because the authorship cost is enormous. Writing engaging music for five themes from synthesis primitives is a multi-month effort outside the scope of v1, and the result is unlikely to be musically strong without dedicated composer involvement. Stem-based crossfading uses pre-composed music and lets the data drive the *arrangement*, which is a more tractable design problem.

### Alternative: silent video only, audio added externally

Defer audio entirely. Films export silent; users can add audio in their own editing tools.

Rejected because the audio is a core part of the *enrichment* promise of PRD-005. A silent timelapse is a different product. Acceptable as a fallback (Use case 3 above) but not as the default.

### Alternative: a single track per theme, not stems

Each theme is one audio file, with envelope modulation controlled by data. Simpler than stems.

Rejected because envelope modulation alone cannot create the qualitative shifts between "calm" and "swelling" textures that the use cases require. A single track played louder is not the same as a swelling track. Five stems give the system five qualitatively distinct sonic states to interpolate between.

## Trade-offs

- **Stem authoring is up-front work.** The five canonical themes ship as audio files that someone has to create (compose, record, master). This is real labour and the quality bar matters. Mitigation: source from a commercial API to bootstrap, then iterate or replace.
- **Crossfade artefacts.** Crossfading between musical stems can produce phase or harmonic artefacts. Acceptable at low frequency (one crossfade per several seconds). Mitigation: design themes such that adjacent intensity stems are harmonically related.
- **Cache invalidation.** A user re-generating a theme via API may get a different result on two different machines. Determinism requires the cache to be authoritative; document that themes are per-user-machine until shared.
- **License attribution.** Every theme stem carries a license; the export must bundle this. Add to the citation file requirement.

## Open questions

1. Which commercial API for Implementation B? Mubert and Beatoven both have generative-music APIs with similar capabilities. Need a separate ADR to evaluate (pricing, terms, output quality, license terms).
2. How many intensity levels per theme — four, five, or six? More levels = smoother crossfades but more stems to author. Probably five for v1; revisit.
3. What's the data-scalar-to-intensity mapping function? Direct (anomaly = intensity) is simple; statistically normalised (z-score → intensity) is more robust across different data ranges. RFC-007 territory; decide jointly.
4. Does the artist control the energy arc explicitly (as PRD-005 suggests), or is it derived purely from data? Probably both — artist sets a "responsiveness" parameter, data drives within that envelope.

## How this closes

- **ADR-NNN — Audio system architecture.** Locks the stem-based crossfading approach.
- **ADR-NNN — Stem source policy.** Locks the local-first / API-fallback model.
- **ADR-NNN — Commercial API choice for theme generation.** Picks Mubert vs. Beatoven vs. another, with a fallback strategy if the chosen vendor changes terms.

## Links

- **TA** — §components/render-system · §contracts (audio scalars in payload) · §constraints (determinism, self-hostable)
- **Related PRDs** — PRD-005 Video Editor (this RFC was flagged in its open threads)
- **Related RFCs** — RFC-002 Render payload format · RFC-007 Key moment detection
