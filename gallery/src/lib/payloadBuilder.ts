/**
 * Client-side payload builder for the Recipe Editor preview.
 *
 * Takes processed data (fetched from /data/processed/), crops to the
 * recipe's region, and produces a payload in the same window.OCEAN_PAYLOAD
 * format the pipeline uses (per ADR-008).
 *
 * Downsamples by 2x for interactive editing; full mode for "Preview full".
 */

export interface ProcessedData {
  data: number[];
  shape: number[];
  min: number;
  max: number;
  lat_range: [number, number];
  lon_range: [number, number];
  source_id: string;
  date: string;
}

export interface RecipeRegion {
  lat: [number, number];
  lon: [number, number];
}

export interface RenderParams {
  type: string;
  [key: string]: unknown;
}

export interface AudioParamsBlock {
  drone_waveform?: string;
  drone_glide?: number;
  pulse_sensitivity?: number;
  presence?: number;
  accent_style?: string;
  texture_density?: number;
}

/** Tension arc spec — RFC-011. Consumers expand to a per-frame array via tensionArc.ts / arc.py. */
export interface TensionArcBlock {
  preset?: string;
  peak_position?: number;
  peak_height?: number;
  release_steepness?: number;
  pin_key_moment?: boolean;
}

export interface OceanPayload {
  version: number;
  recipe: {
    id: string;
    name: string;
    render: RenderParams;
    audio?: AudioParamsBlock;
    tension_arc?: TensionArcBlock;
    render_date: string;
  };
  region: {
    lat_min: number;
    lat_max: number;
    lon_min: number;
    lon_max: number;
  };
  output: {
    width: number;
    height: number;
  };
  data: {
    primary: ProcessedData;
    context?: ProcessedData;
  };
}

const NAN_VALUE = -999.0;
const DEFAULT_WIDTH = 960;  // preview is half pipeline resolution
const DEFAULT_HEIGHT = 540;
const DOWNSAMPLE_FACTOR = 2;

/**
 * Bilinear downsample a 2D array by the given factor.
 * Deterministic — no random sampling.
 */
function downsample(
  data: number[],
  rows: number,
  cols: number,
  factor: number,
): { data: number[]; rows: number; cols: number } {
  const newRows = Math.ceil(rows / factor);
  const newCols = Math.ceil(cols / factor);
  const result: number[] = [];

  for (let r = 0; r < newRows; r++) {
    for (let c = 0; c < newCols; c++) {
      const srcR = Math.min(r * factor, rows - 1);
      const srcC = Math.min(c * factor, cols - 1);
      result.push(data[srcR * cols + srcC]);
    }
  }

  return { data: result, rows: newRows, cols: newCols };
}

/**
 * Crop processed data to a recipe's lat/lon region.
 */
function cropToRegion(
  processed: ProcessedData,
  region: RecipeRegion,
): ProcessedData {
  const [dataLatMin, dataLatMax] = processed.lat_range;
  const [dataLonMin, dataLonMax] = processed.lon_range;
  const [rows, cols] = processed.shape;

  // If recipe covers the full data region, return as-is
  if (
    region.lat[0] <= dataLatMin &&
    region.lat[1] >= dataLatMax &&
    region.lon[0] <= dataLonMin &&
    region.lon[1] >= dataLonMax
  ) {
    return processed;
  }

  const idx = (val: number, min: number, max: number, n: number): number =>
    Math.max(0, Math.min(n - 1, Math.round(((val - min) / (max - min)) * (n - 1))));

  const r0 = idx(region.lat[0], dataLatMin, dataLatMax, rows);
  const r1 = idx(region.lat[1], dataLatMin, dataLatMax, rows) + 1;
  const c0 = idx(region.lon[0], dataLonMin, dataLonMax, cols);
  const c1 = idx(region.lon[1], dataLonMin, dataLonMax, cols) + 1;

  const cropped: number[] = [];
  for (let r = r0; r < Math.min(r1, rows); r++) {
    for (let c = c0; c < Math.min(c1, cols); c++) {
      cropped.push(processed.data[r * cols + c]);
    }
  }

  const newRows = Math.min(r1, rows) - r0;
  const newCols = Math.min(c1, cols) - c0;
  const valid = cropped.filter((v) => v !== NAN_VALUE);

  return {
    data: cropped,
    shape: [newRows, newCols],
    min: valid.length > 0 ? Math.min(...valid) : 0,
    max: valid.length > 0 ? Math.max(...valid) : 0,
    lat_range: [region.lat[0], region.lat[1]],
    lon_range: [region.lon[0], region.lon[1]],
    source_id: processed.source_id,
    date: processed.date,
  };
}

export interface BuildOptions {
  full?: boolean;  // skip downsampling
  width?: number;
  height?: number;
}

/**
 * Build a preview payload from processed data + recipe config.
 *
 * Same structure as pipeline's build_payload task produces (RFC-002 v0.2).
 * Deterministic — same inputs always produce same payload.
 */
export function buildPreviewPayload(
  primary: ProcessedData,
  recipe: {
    id: string;
    name: string;
    render: RenderParams;
    audio?: AudioParamsBlock;
    tension_arc?: TensionArcBlock;
    render_date: string;
  },
  region: RecipeRegion,
  options: BuildOptions = {},
  context?: ProcessedData,
): OceanPayload {
  let croppedPrimary = cropToRegion(primary, region);

  // Downsample for interactive preview unless full mode requested
  if (!options.full && croppedPrimary.shape.length === 2) {
    const [rows, cols] = croppedPrimary.shape;
    if (rows > 20 || cols > 20) {
      const ds = downsample(croppedPrimary.data, rows, cols, DOWNSAMPLE_FACTOR);
      const valid = ds.data.filter((v) => v !== NAN_VALUE);
      croppedPrimary = {
        ...croppedPrimary,
        data: ds.data,
        shape: [ds.rows, ds.cols],
        min: valid.length > 0 ? Math.min(...valid) : croppedPrimary.min,
        max: valid.length > 0 ? Math.max(...valid) : croppedPrimary.max,
      };
    }
  }

  const payload: OceanPayload = {
    version: 2,
    recipe: {
      id: recipe.id,
      name: recipe.name,
      render: recipe.render,
      audio: recipe.audio,
      tension_arc: recipe.tension_arc,
      render_date: recipe.render_date,
    },
    region: {
      lat_min: region.lat[0],
      lat_max: region.lat[1],
      lon_min: region.lon[0],
      lon_max: region.lon[1],
    },
    output: {
      width: options.width ?? (options.full ? 1920 : DEFAULT_WIDTH),
      height: options.height ?? (options.full ? 1080 : DEFAULT_HEIGHT),
    },
    data: {
      primary: croppedPrimary,
    },
  };

  if (context) {
    payload.data.context = cropToRegion(context, region);
  }

  return payload;
}
