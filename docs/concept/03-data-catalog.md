---
title: Data Sources
---

# Data Sources

**OceanCanvas — Data Sources Technical Analysis**

*April 2026 · v0.2*

This document covers all confirmed public, no-registration data sources for OceanCanvas. Every source here is freely accessible — no account, no API key, no institutional agreement.

---

## All sources — overview

Fifteen confirmed public sources across four operators. All free, all no-registration. Three data type families: regular grid, point/profile, scalar time series.

| Source | Operator | Type | Resolution | Freshness | Key variables |
|---|---|---|---|---|---|
| **NOAA ERDDAP (OISST/OSCAR/WW3)** | NOAA | Grid | 0.25°–0.5° | 1–5 day | SST, currents, waves |
| **NOAA NDBC Buoys** | NOAA | Points | ~1800 stations | Hourly | Waves, wind, SST, pressure |
| **NOAA Coral Reef Watch** | NOAA | Grid | 5km (0.05°) | Daily | SST, SST anomaly, bleaching DHW |
| **NOAA WOA23** | NOAA | Grid | 0.25° | Annual | Temp, salinity, O₂, nutrients (climatology) |
| **NOAA WOD23** | NOAA | Points | Float/ship pos. | Quarterly | 18.6M profiles 1772→ |
| **NOAA/NSIDC Sea Ice Index** | NOAA/NSIDC | Grid+TS | 25km | Daily | Arctic/Antarctic ice extent, concentration |
| **GEBCO Bathymetry** | IHO/IOC/BODC | Grid (static) | 450m | Annual | Ocean floor depth |
| **Argo Float Program** | International | Points | Float position | ~10 days | Temp & salinity 0–2000m |
| **SOCAT** | International | Points | Ship tracks | Annual | Ocean pCO₂ 1957→ |
| **HadSST4** | UK Met Office | Grid | 5° | Annual | SST anomaly 1850→ |
| **ESA Ocean Colour CCI** | ESA | Grid | 4km | Monthly + daily | Chlorophyll-a 1997→ |
| **ESA SST-CCI** | ESA | Grid | 0.05° | ~2 weeks | SST gap-free 1981→ |
| **ESA SSS-CCI** | ESA | Grid | 50km | Weekly | Sea surface salinity 2010→ |
| **ESA Sea Level CCI** | ESA | Grid | 0.25° | Monthly | Sea level anomaly 1993→ |
| **Open-Meteo Marine API** | Open-Meteo | Scalar | Point query | Hourly/daily | Waves, wind, swell 1940→ |

---

## ESA Climate Change Initiative — the CCI portfolio

The ESA Climate Change Initiative (CCI) produces long-term, consistent, satellite-derived climate records for Essential Climate Variables. It stitches multi-mission records together into single consistent time series that span decades — removing the sensor-transition artefacts that make multi-decade animations look jumpy.

The CCI Open Data Portal (`climate.esa.int/en/data`) provides free, open access to all CCI datasets via HTTPS, FTP, OPeNDAP and WMS. No registration required.

---

## ESA SST-CCI

The SST-CCI provides a multi-decade, gap-free, daily sea surface temperature record produced by merging infrared and microwave sensors across multiple satellite missions.

| Characteristic | Detail |
|---|---|
| **Spatial resolution** | 0.05° (~5km) |
| **Temporal coverage** | 1981 to present |
| **Product type** | Level 4 — gap-free daily analysis. No missing data due to clouds. |
| **Sensors merged** | AVHRR series, ATSR series, SLSTR (Sentinel-3), AMSR microwave sensors |
| **License** | CC-BY 4.0 |
| **Access** | CCI Open Data Portal — HTTPS, FTP, OPeNDAP. No registration. |
| **File format** | NetCDF-4 with CF conventions |
| **Update latency** | CDR: static release. ICDR: approximately 2-week latency. |
| **Variables** | `analysed_sst` (°C), `analysis_error`, `mask` |

**When to use SST-CCI over NOAA OISST:**
- Recent art (last 1–2 years): either is fine. OISST has lower latency. Use OISST for real-time recipes.
- Historical art (multi-year): SST-CCI is better. Sensor transitions in OISST cause visible discontinuities in long animations. CCI cross-calibration resolves these.

---

## ESA SSS-CCI (Sea Surface Salinity)

The first genuinely new variable — sea surface salinity reveals ocean circulation that temperature alone cannot show.

| Characteristic | Detail |
|---|---|
| **Sensors merged** | ESA SMOS, NASA SMAP, NASA/CNES Aquarius |
| **Spatial resolution** | 50km — fundamental limitation of L-band microwave radiometry |
| **Temporal coverage** | 2010 to approximately 2025. Weekly temporal resolution. |
| **License** | CC-BY |
| **Variables** | `sss` (PSU), `sss_uncertainty`, `number_of_observations` |

**What salinity shows that temperature cannot:**
- **River plumes**: Amazon, Congo, Mississippi — freshwater discharging into the ocean creates enormous low-salinity plumes visible from space
- **Evaporation patterns**: subtropical gyres where evaporation exceeds precipitation create high-salinity cores
- **Polar ice dynamics**: ice formation concentrates brine; ice melting dilutes surrounding water
- **Deep water formation**: North Atlantic Deep Water formation leaves a salinity fingerprint at the surface

**Limitation**: 50km resolution. Small-scale coastal features are invisible. Mediterranean data is poor due to radio frequency interference.

---

## ESA Sea Level CCI

Sea level is the most consequential ocean signal of our era. The CCI brings together 30+ years of satellite altimetry missions into a single consistent record.

### Product types

| Product | Description |
|---|---|
| **Sea Level Anomaly (SLA) grids** | Monthly gridded maps of sea level anomaly at 0.25° resolution, 1993→ |
| **Global Mean Sea Level (GMSL)** | A scalar time series: the global ocean's average height, monthly, 1993→ |
| **Regional trends** | Static maps of sea level trend (mm/year) at 0.25° |

| Characteristic | Detail |
|---|---|
| **Sensors merged** | TOPEX/Poseidon, Jason-1/2/3, Sentinel-6, ERS-1/2, Envisat, SARAL/AltiKa |
| **Spatial resolution** | 0.25° grid for SLA maps |
| **Temporal resolution** | Monthly for gridded SLA |
| **License** | CC-BY |
| **Variables** | `sla` (metres), `mdt` (mean dynamic topography), `msla` |

**What sea level shows:**
- Monthly SLA maps: ocean eddies, Rossby waves, seasonal heating/cooling
- The long-term trend: ~3.7mm/year global average, accelerating. Since 1993: ~20cm total rise
- ENSO signature: El Niño clearly visible in the monthly SLA maps
- **Climate storytelling**: The global mean sea level time series is one of the clearest, most direct measures of climate change

---

## Data type summary

| Type | Sources | Storage pattern |
|---|---|---|
| **Regular grid (10 sources)** | NOAA ERDDAP, NOAA CRW, NSIDC, GEBCO, ESA OC-CCI, ESA SST-CCI, ESA SSS-CCI, ESA Sea Level CCI, WOA23, HadSST4 | Regional NetCDF, one file per day or per release period |
| **Point / profile (4 sources)** | Argo, NOAA NDBC buoys, SOCAT ship tracks, WOD23 historical profiles | Parquet per month |
| **Scalar time series (1 source)** | Open-Meteo point queries and GMSL from Sea Level CCI | JSON per day, or CSV for the full archive |

---

## Variable coverage

| Variable | Primary source | Backup / complement |
|---|---|---|
| **SST (real-time)** | NOAA ERDDAP OISST | NOAA CRW CoralTemp |
| **SST (climate record)** | ESA SST-CCI | HadSST4 (anomaly only) |
| **Salinity** | ESA SSS-CCI | — |
| **Chlorophyll** | ESA OC-CCI | — |
| **Sea level** | ESA Sea Level CCI | — |
| **Sea ice** | NSIDC Sea Ice Index | — |
| **Bathymetry** | GEBCO 2023 | — |
| **Currents** | NOAA ERDDAP OSCAR | — |
| **Waves / wind** | NOAA ERDDAP WW3 | Open-Meteo Marine |
| **CO₂** | SOCAT | — |
| **In-situ profiles** | Argo | NOAA WOD23 |
| **Buoy observations** | NOAA NDBC | — |

---

## Source → render type affinity

| Source | Field | Particles | Contour | Pulse | Scatter |
|---|---|---|---|---|---|
| **OISST / SST-CCI** | ★★★ | ★★ | ★★ | — | — |
| **ESA SSS-CCI** | ★★★ | ★★ | ★★ | — | — |
| **ESA Sea Level CCI** | ★★★ | — | ★★ | ★★★ | — |
| **NSIDC Sea Ice** | ★★★ | — | ★★ | ★★★ | — |
| **ESA OC-CCI** | ★★★ | — | ★ | — | — |
| **OSCAR Currents** | ★ | ★★★ | — | — | — |
| **Argo Floats** | — | — | — | — | ★★★ |
| **NDBC Buoys** | — | — | — | ★★ | ★★★ |
| **Open-Meteo** | — | — | — | ★★★ | — |
| **GEBCO** | ★★ | — | ★★★ | — | — |

★★★ = natural fit · ★★ = possible · ★ = works as context layer · — = wrong abstraction

---

*OceanCanvas · OC-03 Data Catalog · v0.2 · April 2026*
