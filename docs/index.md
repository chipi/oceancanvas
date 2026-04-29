<div class="oc-hero" markdown>

# Ocean · Canvas

**Generative ocean art that the data performs daily.**

*The scientific infrastructure governments have built over decades — given to an artist.*

[Get Started](get-started.md){ .md-button .md-button--primary }
[GitHub](https://github.com/chipi/oceancanvas){ .md-button }

</div>

<div class="oc-wave"></div>

---

## The premise

OceanCanvas is what happens when you take NASA and NOAA's ocean data infrastructure — decades of satellite measurements, buoy networks, and climate records, all freely available — and give it to an artist instead of a scientist.

The result is not a data tool. It is a living gallery of the ocean, driven by the same numbers that oceanographers study, but expressed as generative art, animation, and sound.

---

## What it looks like

You name a piece *North Atlantic Drift*. You set the region — 30°N to 60°N, west of Ireland to Newfoundland. You choose how the SST data should look: thermal field, slightly turbulent, lingering. You save the recipe.

Tomorrow morning, while you are still asleep, the ocean will sit for it.

The pipeline runs at 06:00 UTC. It fetches today's sea surface temperature from NOAA, processes it, runs your recipe through a p5.js sketch, and saves a PNG. Every day, one frame. A recipe running for a year is a year of art — the same authored character, the ocean changing underneath it.

The gallery walks itself forward. No one curates it. No one publishes it. The renders accumulate.

---

## How it works

Six tasks, daily, automated.

**Discover** the latest available date from NOAA ERDDAP. **Fetch** the raw data — NetCDF for sea surface temperature, JSON for Argo float positions. **Process** it into browser-friendly formats — colourised PNG tiles, flat JSON arrays, statistics. **Build a render payload** per recipe — the data cropped to the recipe's region, the creative parameters assembled. **Render** via Puppeteer + p5.js — the sketch runs in headless Chromium, screenshots the canvas. **Index** — rebuild the manifest, clean up.

Three render types. **Field** — thermal heatmaps. The Gulf Stream as a painting. **Particles** — flow trails tracing the SST gradient. The current made visible. **Scatter** — point clouds of Argo float positions. The observing network as constellation.

Three data sources. **NOAA OISST** — sea surface temperature, daily, global, since 1981. **Argo** — 4,000 autonomous floats measuring the ocean's interior. **GEBCO** — the ocean floor. All free. All open. No API keys.

---

## The four surfaces

**The Gallery.** A masonry grid of the day's renders. Click into any piece for full-screen view with data context — what dataset produced it, what agency operates it, where to learn more. The gallery is itself a composition. No curation. No engagement metrics.

**The Dashboard.** Read the ocean as data. Full-bleed SST heatmap with editorial stat cards. A timeline scrubber back to 1981. Region selection that feeds directly into the recipe editor.

**The Recipe Editor.** Author a piece at the level of artistic intent. Mood presets, energy × presence, colour character, temporal weight. The preview runs the same p5.js sketch the pipeline uses. What you see is what the pipeline renders.

**The Video Editor.** *(Coming in v0.3)* Assemble accumulated renders into timelapse film with generative audio and data overlays.

---

## Why this earns existence

**The data is extraordinary and invisible.** The ocean holds 97% of Earth's water, absorbs 90% of excess heat from climate change, and regulates weather across the planet. The scientific community has built extraordinary tools to monitor it. Almost none of that monitoring is visible to anyone who is not a scientist.

**When SST anomaly data becomes a 365-frame animation, the ocean's warming is not a statistic. It is something you watch happen.**

**The creative stack is grounded.** Colour is always data-mapped. Motion follows real gradients. Every render carries its source attribution. Nothing decorative. The art is factually correct.

**It runs itself.** Once a recipe is authored, it runs forever. The pipeline is the heartbeat. The gallery is the accumulation.

---

## What it is not

- **Not a scientific analysis tool.** It does not replace Jupyter notebooks or any research workflow.
- **Not a real-time monitoring system.** It does not send alerts or compete with operational products.
- **Not a random image generator.** Every render is deterministic. Same recipe, same data, same date — same image.
- **Not a social media bot.** No view counts, no likes, no share counts, no streaks.
- **Not a data portal.** It consumes open data and creates art from it.

---

<div class="oc-closing" markdown>

*The data performs daily. The art accumulates. The gallery walks forward.*

</div>
