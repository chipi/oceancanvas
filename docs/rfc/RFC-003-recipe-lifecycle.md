# RFC-003 — Recipe lifecycle on source unavailability

> **Status** · Decided · closed 2026-05-03 → [ADR-025](../adr/ADR-025-recipe-lifecycle.md)
> **TA anchor** · §components/pipeline · §constraints (determinism, attribution)
> **Related** · PRD-001 Recipe · OC-03 Data Catalog
> **Closes into** · [ADR-025](../adr/ADR-025-recipe-lifecycle.md)
> **Why this is an RFC** · Recipes are durable — they run forever once authored (PA §principles/recipes-are-durable). But sources are not durable. ERDDAP endpoints go down, ESA reorganises portals, NOAA changes URL conventions. When a recipe's source becomes unavailable mid-recipe-life, the system has to do *something*. Multiple plausible behaviours exist with real trade-offs around archive integrity and user experience.

---

## The question

A recipe has been running daily for eighteen months. One morning the upstream source returns a 503 for the requested date. What does the pipeline do?

The choices look simple in isolation but each one has consequences that ripple through the rest of the system:

- *Pause* the recipe. Skip the render. Resume next day if the source recovers.
- *Fail loudly*. Mark the recipe broken; stop attempting renders until a human intervenes.
- *Render NaN*. Produce a render with empty data — a visible gap in the archive.
- *Fall back to last known data*. Use yesterday's data; mark it clearly.
- *Substitute* with a related source. Use SST-CCI when OISST is down.

Each of these has implications for the *accumulation* promise (PA §promises/accumulation), the *attribution-baked-in* principle, and the artist's relationship to their work. The deliberation is real because there is no obvious right answer — pause is conservative but creates archive gaps; fall-back is convenient but breaks attribution; substitute is clever but breaks determinism.

## Use cases

1. **Transient outage.** ERDDAP is down for an afternoon, comes back the next morning. The pipeline should not panic.
2. **Format change.** NOAA reorganises an endpoint. The fetcher returns 200 but with unexpected structure. The pipeline must not silently accept it.
3. **Source deprecation.** A source is permanently retired (e.g., a satellite mission ends). The recipe needs a graceful path forward.
4. **Partial unavailability.** The source is up but missing today's date. Common with ICDR products that publish on a 2-week lag.

The four cases want different behaviours. A unified approach that covers all four cleanly is the goal.

## Goals

- An archive gap is visible as a gap, not as misleading data.
- A recipe that hits a transient outage continues working when the source recovers.
- A recipe that hits a permanent failure surfaces clearly to the artist, not silently.
- The attribution promise is never violated — every render shows what data it was made from.
- Determinism is preserved: re-running the pipeline for a past date with cached data must produce the same render as the original run.

## Constraints

- *Determinism* — same recipe + same data = same render (TA §constraints). A "fall back to yesterday" approach must record exactly what data was used.
- *Attribution baked in* — every render shows its source (TA §constraints). Substitution silently breaks this.
- *Daily clock is sacred* — the pipeline runs once per day; we cannot rely on retries (TA §constraints).
- *File-based storage in v1* — recipe state (active, paused, broken) is a flag in a file, not a database row.

## Proposed approach

**Pause-with-clear-logging as the default. Fail-loudly when the failure is structural.**

A recipe has three lifecycle states: `active`, `paused`, `broken`.

- `active` is the normal state. The pipeline runs the recipe daily.
- `paused` is set automatically when a single fetch fails. The pipeline logs the date and reason, skips the render for that date, and tries again the next day. After three consecutive paused days, the recipe is escalated to `broken`.
- `broken` is set automatically (after escalation) or manually. The pipeline does not attempt the recipe. The artist is notified through a status field in `manifest.json` that the gallery can surface.

No fall-back to last known data. No silent substitution. No NaN frames. A skipped render is *absent*; the gallery's 14-day strip shows a clear empty slot. Attribution stays intact because no render with wrong-attribution is ever produced.

The recipe state lives in a `state.json` file alongside the recipe YAML, not in the YAML itself (the YAML is the authored work; the state is operational metadata):

```json
{
  "recipe_id": "north-atlantic-drift",
  "state": "paused",
  "last_attempted": "2026-04-25",
  "last_successful": "2026-04-22",
  "consecutive_failures": 2,
  "failure_reason": "OISST endpoint returned 503"
}
```

For the partial-unavailability case (Use case 4 — ICDR lag), the discover task (Task 01) already detects this before the fetch attempts, and skips the recipe with reason "no new data" rather than escalating it. A recipe in this state is `active`, not `paused` — it's behaving correctly.

## Alternatives considered

### Alternative: fall back to last known data

When today's fetch fails, use yesterday's processed data. Mark the render with a "stale-data" overlay.

Rejected because it breaks the attribution promise. A render dated 2026-04-25 that uses 2026-04-24 data is misattributed even with an overlay — the file timestamp says one thing, the data was another. The temptation to do this came from "the gallery should never have gaps", but archive gaps are honest in a way that stale-data renders are not.

### Alternative: render NaN frames

Produce a render with empty data on the failure date — a visible blank or grey frame in the archive.

Rejected because NaN frames pollute the time series. The video editor would have to skip them; the gallery's 14-day strip would show grey blocks; the visual archive would have visible gaps but in a more confusing way than a missing frame. A skipped frame is cleaner than a present-but-empty one.

### Alternative: source substitution (SST-CCI for OISST)

Define source equivalences. When the primary source is down, fall back to the equivalent.

Rejected because the sources are not actually equivalent. OISST and SST-CCI differ in resolution, gap-filling strategy, and version history. A recipe built for OISST that suddenly renders SST-CCI data would change visual character — the artist's work would silently shift. If substitution is wanted, it should be an explicit recipe property (`fallback_source: sst-cci`) authored by the artist, not an automatic system behaviour. Defer that as a future option.

### Alternative: human-required intervention on every failure

Stop and require a human to acknowledge each failure before continuing. Most conservative; least automated.

Rejected for transient outages — most pause-and-recover scenarios should not require human intervention. The escalation-after-three-failures rule preserves human-in-the-loop for genuinely broken cases without forcing it on every blip.

## Trade-offs

- **Archive gaps are visible.** Some artists may dislike this. The trade is honesty over completeness.
- **Three-day escalation threshold is a magic number.** Tuneable; documenting the choice but accepting we may revise.
- **State lives in a sidecar file.** Adds a file per recipe to the directory. Keeps the recipe YAML clean (the YAML is the work; the state is not).
- **No automatic recovery from `broken`.** Once escalated, only manual reset. Conservative; appropriate for "broken" semantics.

## Open questions

1. Should the gallery show paused recipes or hide them? A paused recipe is still active and may recover; hiding feels wrong. Show with a subtle indicator?
2. Should `consecutive_failures` reset on success, or accumulate over the recipe's lifetime? Reset is simpler; accumulation gives historical signal.
3. The notification mechanism for `broken` recipes — gallery surface only, or also a log file the artist actively monitors? V1 is gallery-only; assess after first real broken-recipe scenario.

## How this closes

- **ADR-NNN — Recipe lifecycle states and unavailability behaviour.** Locks pause-with-logging, the three-state model, the escalation rule.

## Links

- **TA** — §components/pipeline · §constraints (determinism, attribution)
- **Related PRDs** — PRD-001 Recipe (this RFC was flagged in its open threads)
- **Related sources** — OC-03 Data Catalog (source SLAs, where they exist)
