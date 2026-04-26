# OC-01 — Vision & Philosophy

**OceanCanvas — Product Vision & Positioning**

*April 2026 · v1.0*

> **The scientific infrastructure governments have built over decades — given to an artist.**

---

## The one-line vision

OceanCanvas is what happens when you take NASA and NOAA's ocean data infrastructure — decades of satellite measurements, buoy networks, and climate records, all freely available to anyone — and give it to an artist instead of a scientist.

The result is not a data tool. It is a living gallery of the ocean, driven by the same numbers that oceanographers study, but expressed as generative art, animation, and sound.

---

## The reference: NASA Earthdata

NASA Earthdata is one of the most remarkable open data systems ever built. It consolidates petabytes of Earth science data from hundreds of satellites, buoys, and models — all freely available to anyone in the world. Its catalog holds more than 50,000 datasets. It is comprehensive, rigorous, and built for researchers.

But it is built for researchers. The interface is scientific. The outputs are grids, NetCDF files, and time series plots. It is the world's most thorough reference library for the state of our planet — and it is almost entirely invisible to anyone who is not a scientist.

**OceanCanvas is the creative layer that NASA Earthdata was never designed to be.**

The data is the same. The sources are the same — NOAA ERDDAP, Argo, GEBCO, HadSST, SOCAT, Copernicus. OceanCanvas curates a focused subset of ocean data, understands it deeply, and presents it in a way that is beautiful, accessible, and emotionally resonant.

---

## What OceanCanvas is and is not

| | NASA Earthdata / scientific tools | OceanCanvas |
|---|---|---|
| **Audience** | Researchers, scientists, data engineers | Artists, designers, curious people, climate communicators |
| **Catalog size** | 50,000+ datasets, all Earth science | ~15 curated ocean datasets, deeply understood |
| **Primary output** | NetCDF files, data grids, CSV downloads | Generative art images, animated videos, soundscapes |
| **Visualization** | Scientific maps, time series plots | Generative art recipes that run daily and build archives |
| **Discovery** | Search by parameter, instrument, date | Browse a gallery — see what the data looks like first |
| **Time dimension** | Access historical data on demand | A living archive that grows every day, automatically |
| **Entry point** | Knowing what you're looking for | Curiosity about the ocean |
| **End state** | Download → analyze in Python/R | A recipe running daily, producing art forever |

---

## Three layers, one product

### Layer 1 — Understand: the data catalog and dashboard

The catalog is where it starts. A curated collection of the best public ocean datasets — not 50,000, but 15 or so, each one chosen because it is genuinely interesting and tells part of the ocean's story. Each dataset has a tile in the catalog showing what the data looks like, not just what it is.

The dashboard shows those datasets in traditional scientific visualisations — time series charts, spatial maps, anomaly plots. Not because traditional charts are the goal, but because understanding the data is what makes the generative art meaningful. The dashboard is the bridge between raw numbers and artistic expression.

### Layer 2 — Create: the recipe editor and generative pipeline

A recipe is an authored art piece. It defines which datasets drive the render, what visualization technique expresses them, what the aesthetic parameters are, and what the audio character sounds like. Once defined, the pipeline runs it on a schedule — daily, weekly, monthly — pulling fresh data and generating a new render each time.

This is the core creative act: not generating a random image, but authoring a piece that is alive. 'North Atlantic Drift' is a named work. It has a specific character. It will look different in January than in July because the SST and current data are different. The recipe is permanent; the renders accumulate.

### Layer 3 — Share: gallery, video, and animation

The gallery is the public face. A grid of recipe tiles, each showing the latest render. Artistically composed — 4:3 canvases in mixed sizes, art leading, data revealed only on hover.

From the archive, any time range can become a video. The frames already exist as stored renders — the video pipeline sequences them, generates a generative audio track driven by the same data, and produces an MP4. A year of daily SST renders becomes a 60-second film of the ocean breathing through seasons.

---

## Why this matters

The ocean holds approximately 97% of Earth's water, absorbs about 90% of the excess heat from climate change, and regulates weather patterns across the entire planet. The scientific community has built extraordinary tools to monitor it. Almost none of that monitoring is visible to the public.

**When SST anomaly data becomes a 175-frame animation, the ocean's warming is not a statistic. It is something you watch happen.**

OceanCanvas's generative art approach changes what the data can do. A flow field driven by Gulf Stream current vectors is not a scientific diagram — it is a painting that is factually correct. An ambient soundtrack derived from wave height and ocean temperature is not a sonification experiment — it is music that is grounded in the state of the planet.

---

## The creative stack

| Element | Approach |
|---|---|
| **Palette** | Colour is always data-mapped — SST drives warm/cool gradients, chlorophyll drives green intensity, depth drives blue register. No colour is decorative. |
| **Motion** | Flow fields trace real current vectors. Particles move at speeds derived from measured current speed. |
| **Sound** | The generative audio is another data channel — SST sets the drone pitch, wave height drives texture density, current speed sets pulse rhythm. |
| **Composition** | 4:3 ratio. Consistent. The ocean as landscape, not as abstract shape. |
| **Archive** | Every render is datestamped and permanently stored. The accumulation over time is part of the work. |
| **Citation** | Attribution is baked in — every render carries the dataset names, every export bundles a citation file. |

---

## Who is this for

| Persona | Why |
|---|---|
| **The artist** | Wants to make generative art that is about something real. Finds purely algorithmic art empty. Has no interest in learning NetCDF but is drawn to the idea that the Gulf Stream can be a painting. |
| **The climate communicator** | Needs ways to show climate change that are not bar charts. Wants something people will actually look at and share. Needs proper citation built in. |
| **The scientist adjacent** | Works in oceanography, marine biology, or climate science. Wants to see their field's data expressed beautifully. |
| **The curious person** | Saw a beautiful image somewhere and clicked through. Starts to understand the data through the art. |
| **The developer** | Wants to build something real using open data. Finds the generative art angle more interesting than building yet another dashboard. |

---

## What success looks like

- A recipe has been running daily for a year and the archive shows the seasonal cycle of SST in the North Atlantic — expressed as a series of paintings.
- Someone shares an OceanCanvas video on social media without explaining what it is, and people ask where it came from.
- A climate organisation uses an OceanCanvas animation in a presentation instead of a chart — because it lands differently.
- Someone builds a new recipe from a dataset that nobody thought would make beautiful art — and it does.

---

## What OceanCanvas is not

- **Not a scientific analysis tool.** It does not replace Jupyter notebooks or any research workflow.
- **Not a real-time monitoring system.** It does not send alerts or compete with operational products.
- **Not a data portal.** It does not host or redistribute raw data. It consumes open data and creates art from it.
- **Not a random image generator.** Every render is deterministic and datestamped — the same recipe run on the same date produces the same image.
- **Not a social media bot.** The gallery and sharing features are there, but OceanCanvas is optimised for depth, not viral reach.

---

## In one sentence

**OceanCanvas turns the world's open ocean data into a living gallery of generative art — one recipe, one dataset, one render at a time.**

---

*OceanCanvas · OC-01 Vision & Philosophy · v1.0 · April 2026*
