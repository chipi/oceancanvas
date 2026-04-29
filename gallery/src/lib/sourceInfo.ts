/**
 * Source metadata — editorial context for each data source.
 *
 * Used in the Gallery detail view context panel to provide
 * attribution, explanation, and educational value per the
 * editorial-dignity and citation-travels promises (PA §promises).
 */

export interface SourceInfo {
  name: string;
  agency: string;
  description: string;
  resolution: string;
  coverage: string;
  url: string;
  license: string;
}

export const SOURCES: Record<string, SourceInfo> = {
  oisst: {
    name: 'Optimum Interpolation SST (OISST)',
    agency: 'NOAA / NCEI',
    description:
      'Global sea surface temperature at 0.25° resolution. Daily since September 1981. ' +
      'Combines satellite infrared observations with in-situ measurements from ships and buoys. ' +
      'The data captures the ocean\'s thermal structure — from the cold Labrador Sea to the warm Gulf Stream.',
    resolution: '0.25° (~28 km)',
    coverage: '1981–present, daily',
    url: 'https://www.ncei.noaa.gov/products/optimum-interpolation-sst',
    license: 'Public domain (US Government)',
  },
  argo: {
    name: 'Argo Float Program',
    agency: 'International Argo Programme',
    description:
      'A global array of ~4,000 autonomous profiling floats measuring temperature and salinity ' +
      'from the surface to 2,000m depth. Each float drifts at depth, rises to the surface every 10 days, ' +
      'and transmits its profile via satellite. The observing network itself is visually compelling.',
    resolution: 'Float positions (~4,000 active)',
    coverage: '2000–present, ~10-day cycles',
    url: 'https://argo.ucsd.edu',
    license: 'Open data',
  },
  gebco: {
    name: 'GEBCO Bathymetric Grid',
    agency: 'IHO / IOC / BODC',
    description:
      'Global ocean floor depth at 450m resolution. A static dataset combining ship-based soundings ' +
      'with satellite altimetry-derived gravity data. Used as context — the bathymetry underneath the surface data.',
    resolution: '15 arc-second (~450 m)',
    coverage: 'Static (2023 release)',
    url: 'https://www.gebco.net',
    license: 'Public domain',
  },
};

export function getSourceInfo(sourceId: string): SourceInfo | null {
  return SOURCES[sourceId] || null;
}
