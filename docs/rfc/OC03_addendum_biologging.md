# OC-03 Data Catalog — Addendum A
## Biologging Data Family: OBIS + Three Species

**Document:** OC-03 Data Catalog Addendum A  
**Status:** Draft — for review before catalog revision  
**Relates to:** GitHub issue `feat: OBIS biologging POC`  
**Data family:** `biologging` (new family, alongside `grid`, `profile`, `scalar`)

---

## Editorial context

The ocean is not only fluid. It is habitat. The three sources catalogued here extend OceanCanvas from pure physical oceanography into biology — specifically into the movements of large marine animals tracked by satellite. The render type is the same as Argo floats (scatter), the API access is simpler than ERDDAP, and the editorial register is entirely different: these are animals, endangered in most cases, and their journeys across temperature gradients tell a story about the living ocean that SST fields and salinity profiles cannot.

All three species below are accessed via the **OBIS REST API** — a single, unified, no-authentication endpoint that aggregates marine occurrence records from thousands of contributing institutions worldwide. GBIF serves as a secondary source for any gaps.

---

## Source entry: OBIS

| Field | Value |
|---|---|
| **Source ID** | `obis` |
| **Full name** | Ocean Biodiversity Information System |
| **Provider** | Intergovernmental Oceanographic Commission of UNESCO |
| **Primary endpoint** | `https://api.obis.org/v3/occurrence` |
| **Secondary endpoint** | `https://api.gbif.org/v1/occurrence/search` (GBIF) |
| **Authentication** | None — open public API |
| **License** | CC BY (per dataset; OBIS requires attribution) |
| **Update cadence** | Continuous — records published by contributing institutions on rolling basis |
| **Native format** | JSON (paginated, max 10,000 records per request) |
| **Spatial resolution** | Point occurrences (lat/lon per observation) |
| **Temporal range** | 1800s to present (quality varies by dataset; modern satellite-tagged data from 1990s–present) |

### Key query parameters

```
scientificname   Scientific name of species (URL-encoded)
taxonid          WoRMS AphiaID (preferred over name — avoids synonym ambiguity)
startdate        ISO date filter (e.g. 2010-01-01)
enddate          ISO date filter
geometry         WKT polygon for bounding box queries
size             Records per page (max 10,000)
fields           Comma-separated field list for response trimming
```

### Response fields used by OceanCanvas

| OBIS field | OceanCanvas mapped field | Notes |
|---|---|---|
| `decimalLatitude` | `lat` | |
| `decimalLongitude` | `lon` | |
| `eventDate` | `date` | ISO 8601 string; trim to date part |
| `depth` | `depth` | Metres; null for surface sightings |
| `scientificName` | `species` | Canonical name from WoRMS |
| `datasetName` | `source_dataset` | For citation |
| `occurrenceID` | `record_id` | For deduplication |

### Citation format

```
OBIS (2025) Occurrence records of [species] via Ocean Biodiversity Information
System. Intergovernmental Oceanographic Commission of UNESCO.
www.obis.org. Accessed: [date]
```

### Access notes

OBIS enforces a rate limit on bulk downloads. For large queries (>50,000 records), the GeoParquet snapshot on AWS S3 is preferred over the REST API. For OceanCanvas POC purposes (3 species, ~20,000 total records), the API is adequate. GBIF supplements OBIS where OBIS records are sparse; GBIF requires a DOI citation for downloaded datasets.

---

## Species entry 1: Whale Shark

| Field | Value |
|---|---|
| **Common name** | Whale Shark |
| **Scientific name** | *Rhincodon typus* (Smith, 1828) |
| **WoRMS AphiaID** | 105847 |
| **IUCN status** | Endangered (EN) |
| **OBIS records (approx.)** | ~2,500 georeferenced occurrences (2004–2024) |
| **GBIF records (approx.)** | ~410 |
| **Date range** | 1990s–2024 |
| **Spatial coverage** | Global tropical and warm-temperate oceans (±30° latitude band) |
| **Depth data** | Yes — satellite-tagged individuals have dive profiles to >1,900 m |
| **Primary dataset** | ECOCEAN Whale Shark Photo-identification Library (OBIS Australia; CC BY-NC 4.0) |
| **Render type** | `scatter` |

### Data character

Occurrence records combine satellite telemetry tracks, systematic survey transects, opportunistic sightings (diver reports, fisheries observer data), and photo-ID library matches. The ECOCEAN dataset is the most curated: individual sharks are identified by spot patterns using an astronomical pattern-matching algorithm, giving each record a named individual where possible.

The SST linkage is the defining editorial angle. Whale sharks are obligate followers of warm surface water (preferred range 21–30°C) and aggregate at productive fronts driven by upwelling or current convergence. An OceanCanvas scatter render overlaid against OISST will show this directly: the shark distribution traces the warm-water envelope.

### Recipe affinity

| Overlay | Narrative | Priority |
|---|---|---|
| OISST SST | Animals tracking thermal fronts in real time | Primary |
| OISST + Chl-a anomaly | Sharks following prey blooms | Secondary |
| GEBCO bathymetry | Coastal aggregation sites vs open-ocean transit routes | Tertiary |

### Access query

```
GET https://api.obis.org/v3/occurrence
  ?taxonid=105847
  &startdate=2000-01-01
  &size=5000
  &fields=decimalLatitude,decimalLongitude,eventDate,depth,datasetName,occurrenceID
```

### Citation

```
Norman B and Holmberg J (2008) ECOCEAN Whale Shark Photo-identification Library.
Marine.csiro.au/ipt. Via OBIS (2025). Accessed: [date]
```

---

## Species entry 2: Leatherback Turtle

| Field | Value |
|---|---|
| **Common name** | Leatherback Sea Turtle |
| **Scientific name** | *Dermochelys coriacea* (Vandelli, 1761) |
| **WoRMS AphiaID** | 137209 |
| **IUCN status** | Vulnerable (VU) globally; Critically Endangered in some subpopulations |
| **OBIS records (approx.)** | ~5,000+ georeferenced occurrences |
| **GBIF records (approx.)** | ~3,000+ |
| **Date range** | 1980s–2024 |
| **Spatial coverage** | All ocean basins; nesting beaches in tropics, foraging grounds to sub-polar latitudes |
| **Depth data** | Partial — satellite tags record surfacing events; dive data from archival tags where available |
| **Primary dataset** | OBIS-SEAMAP Sea Turtle node (Duke University Marine Geospatial Ecology Lab; CC BY-NC) |
| **Render type** | `scatter` |

### Data character

Leatherbacks are the most widely distributed reptile on Earth and the deepest-diving sea turtle (recorded to >1,200 m). Their migrations are the longest of any sea turtle: individuals tagged in the eastern Pacific have been recorded travelling over 10,000 km to foraging grounds off the US Pacific coast and beyond. OBIS-SEAMAP has a dedicated turtle portal with curated satellite telemetry datasets; these are the highest-quality records for OceanCanvas purposes.

The render strategy differs from whale sharks: leatherbacks do not aggregate, they transit. A time-animated scatter render over a full year shows individual tracks crossing entire ocean basins — a compelling render type that is distinct from the thermal-clustering pattern of whale sharks. The editorial angle is migration and scale.

### Recipe affinity

| Overlay | Narrative | Priority |
|---|---|---|
| OISST SST | Cold current crossings — turtles entering frigid water following jellyfish | Primary |
| GEBCO bathymetry | Showing transoceanic routes over abyssal plains | Secondary |
| Seasonal animation | Nesting beach departure → foraging → return cycle | Primary |

### Access query

```
GET https://api.obis.org/v3/occurrence
  ?taxonid=137209
  &startdate=2000-01-01
  &size=5000
  &fields=decimalLatitude,decimalLongitude,eventDate,depth,datasetName,occurrenceID
```

### Citation

```
OBIS-SEAMAP (2025) Sea Turtle occurrence records for Dermochelys coriacea.
Duke University Marine Geospatial Ecology Lab. seamap.env.duke.edu.
Via OBIS (2025). Accessed: [date]
```

---

## Species entry 3: Southern Elephant Seal

| Field | Value |
|---|---|
| **Common name** | Southern Elephant Seal |
| **Scientific name** | *Mirounga leonina* (Linnaeus, 1758) |
| **WoRMS AphiaID** | 231414 |
| **IUCN status** | Least Concern (LC) — population ~650,000 |
| **OBIS records (approx.)** | ~15,000+ georeferenced occurrences |
| **GBIF records (approx.)** | ~12,000+ |
| **Date range** | 1990s–2023 |
| **Spatial coverage** | Southern Ocean and sub-Antarctic; breeding colonies on South Georgia, Kerguelen, Macquarie Island |
| **Depth data** | Yes — MEOP-tagged individuals carry CTD sensors; temperature and salinity profiles at depth |
| **Primary dataset** | MEOP (Marine Mammals Exploring the Oceans Pole to Pole); OBIS-SEAMAP marine mammal node |
| **Render type** | `scatter` (primary); `profile` (future — MEOP CTD data) |

### Data character

This is the wildcard entry and the one with the most unusual data character. The MEOP program instruments southern elephant seals as oceanographic platforms: each tagged animal carries a conductivity-temperature-depth (CTD) sensor that records ocean profiles every time the animal dives and surfaces. Because seals forage under sea ice and in areas rarely visited by research vessels, MEOP data fills critical gaps in Southern Ocean physical oceanography.

For OceanCanvas, this means two things. First, the scatter render shows foraging ranges from breeding colonies — visually striking because the tracks radiate outward from a few fixed points and then return, producing a distinctive star-burst pattern over the Southern Ocean. Second, the MEOP CTD profiles are a future render pathway: these are genuine ocean profiles in the exact same format as Argo floats, but collected by an animal. The editorial angle writes itself: *the seal is the instrument*.

The scatter/profile duality makes this the most data-rich of the three POC species, and the one most likely to justify a dedicated recipe.

### Recipe affinity

| Overlay | Narrative | Priority |
|---|---|---|
| OISST SST | Seals foraging at polar front transitions | Primary |
| WOA salinity | MEOP profiles vs gridded climatology — animal data filling gaps | Secondary (future) |
| GEBCO bathymetry | Dive depth vs seafloor — showing how seals follow continental shelf edges | Secondary |
| Seasonal animation | Colony departure → Southern Ocean → return; shows breeding/foraging rhythm | Primary |

### Access query

```
GET https://api.obis.org/v3/occurrence
  ?taxonid=231414
  &startdate=2000-01-01
  &size=5000
  &fields=decimalLatitude,decimalLongitude,eventDate,depth,datasetName,occurrenceID
```

For MEOP CTD profiles specifically, the MEOP data portal at `meop.net` provides NetCDF files by deployment campaign. This is a separate fetch pathway from OBIS and is out of scope for the POC scatter render.

### Citation

```
Roquet F et al. (2013) Estimates of the Southern Ocean general circulation
improved by animal-borne instruments. Geophysical Research Letters.
MEOP Consortium. meop.net. Via OBIS (2025). Accessed: [date]
```

---

## Data model extension

Adding these three species requires one new source type in the OceanCanvas data model:

```yaml
source_type: biologging
fields:
  - lat           # float
  - lon           # float
  - date          # ISO 8601 date string
  - depth         # float or null (metres)
  - species       # string (scientific name)
  - source_dataset # string (for citation)
  - record_id     # string (for deduplication)
fetch:
  protocol: http_json
  auth: none
  pagination: cursor  # OBIS uses offset pagination
```

This is intentionally minimal — the same schema works for all three species and for any future OBIS-sourced species without modification.

---

## Access and licensing summary

| Source | License | Registration | Cost | Pipeline-friendly |
|---|---|---|---|---|
| OBIS API | CC BY (per dataset) | None | Free | Yes |
| GBIF API | CC BY / CC0 (per dataset) | None for reads | Free | Yes |
| MEOP CTD | CC BY | None | Free | Yes (NetCDF) |
| OCEARCH | IP of OCEARCH | Formal agreement required | Free | **No** |
| Movebank | Varies per study | Free account + per-study approval | Free | **No** |

OBIS is the correct access layer for OceanCanvas. It aggregates the publicly released data from Movebank, OTN, and OBIS-SEAMAP without requiring per-study approval, and returns a consistent JSON schema regardless of the underlying contributor.

---

## Open questions for catalog review

1. **Data family naming.** `biologging` is technically accurate but not necessarily the editorial term. Consider whether the gallery-facing name should be something like `animal tracking` or `ocean wildlife` — the catalog can use `biologging` internally while the UI uses a different label.

2. **MEOP profile pathway.** Southern elephant seal CTD profiles are genuinely compelling and would fit the existing `profile` render type. Noting this here so it isn't lost — it would require a separate MEOP fetch config and is explicitly out of scope for the POC.

3. **Version drift.** OBIS record counts change as contributing institutions publish new data. The figures in this addendum reflect May 2025; they should be reverified at implementation time.
