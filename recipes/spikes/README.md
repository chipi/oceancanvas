# Spike recipes

Exploratory recipes that capture creative ideas before — or alongside — the
pipeline features needed to render them. A spike is a complete recipe YAML
with a clear creative intent at the top, so the editorial choice is locked in
even when the technical path is still open.

Spikes are **not** picked up by the daily pipeline — `flow.py` globs
`recipes/*.yaml` non-recursively, so anything under `recipes/spikes/` is
inert until promoted to the parent folder.

## Status legend

- **READY** — renders today; just promote out of `spikes/` to run daily.
- **NEEDS X** — points to a tracked GitHub issue for the missing feature.
  When that ships, the recipe can be promoted as-is.

## Index

| File | Idea | Status |
|---|---|---|
| `whale-shark-realm.yaml` | 50-year density field — portrait of the species' realm | NEEDS [#95](https://github.com/chipi/oceancanvas/issues/95) |
| `whale-shark-seasonal.yaml` | Sightings coloured by month — the annual rhythm | NEEDS [#96](https://github.com/chipi/oceancanvas/issues/96) |
| `leatherback-decades.yaml` | One frame per decade — 66 years of migration evolution | NEEDS [#97](https://github.com/chipi/oceancanvas/issues/97) |
| `elephant-seal-bathymetry.yaml` | Tracks against seafloor depth — shelf-break foraging | READY |
| `whale-shark-currents.yaml` | Tracks as particle flow — animals as ocean sensors | NEEDS [#98](https://github.com/chipi/oceancanvas/issues/98) |
| `whale-shark-on-sst.yaml` | Tracks over SST field — "this animal followed 28°C" | NEEDS [#99](https://github.com/chipi/oceancanvas/issues/99) |
| `three-species.yaml` | Whale shark + leatherback + elephant seal in one frame | NEEDS [#99](https://github.com/chipi/oceancanvas/issues/99) |

## Related (not a recipe)

[#100](https://github.com/chipi/oceancanvas/issues/100) — inflection-point
detection on biologging tracks. When a whale-shark track turns sharply, that's
a biological "moment" (feeding, encounter, decision). Wire it into the same
accent layer the SST peak detector already drives. Improves *every*
biologging recipe's audio without authoring anything new.

## Promoting a spike

When the dependent feature ships:

```bash
git mv recipes/spikes/<name>.yaml recipes/<name>.yaml
# Pipeline picks it up next run.
```
