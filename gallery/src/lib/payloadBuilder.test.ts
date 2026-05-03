import { describe, it, expect } from 'vitest';
import { buildPreviewPayload, type ProcessedData } from './payloadBuilder';

const SAMPLE_DATA: ProcessedData = {
  data: Array.from({ length: 100 }, (_, i) => 10 + (i / 100) * 15),
  shape: [10, 10],
  min: 10,
  max: 25,
  lat_range: [25, 65],
  lon_range: [-80, 0],
  source_id: 'oisst',
  date: '2026-04-13',
};

const RECIPE = {
  id: 'test',
  name: 'test',
  render: { type: 'field' as const, seed: 42, colormap: 'thermal', opacity: 0.8 },
  render_date: '2026-04-13',
};

const REGION = { lat: [25, 65] as [number, number], lon: [-80, 0] as [number, number] };

describe('buildPreviewPayload', () => {
  it('produces valid payload structure with v2', () => {
    const p = buildPreviewPayload(SAMPLE_DATA, RECIPE, REGION);
    expect(p.version).toBe(2);
    expect(p.recipe.id).toBe('test');
    expect(p.region.lat_min).toBe(25);
    expect(p.region.lon_max).toBe(0);
    expect(p.output.width).toBe(960);
    expect(p.output.height).toBe(540);
    expect(p.data.primary).toBeDefined();
  });

  it('round-trips a tension_arc spec', () => {
    const recipeWithArc = {
      ...RECIPE,
      tension_arc: {
        preset: 'classic',
        peak_position: 0.65,
        peak_height: 1.0,
        release_steepness: 0.7,
        pin_key_moment: true,
      },
    };
    const p = buildPreviewPayload(SAMPLE_DATA, recipeWithArc, REGION);
    expect(p.recipe.tension_arc).toEqual(recipeWithArc.tension_arc);
  });

  it('omits tension_arc when not provided (backwards-compat)', () => {
    const p = buildPreviewPayload(SAMPLE_DATA, RECIPE, REGION);
    expect(p.recipe.tension_arc).toBeUndefined();
  });

  it('full mode uses pipeline resolution', () => {
    const p = buildPreviewPayload(SAMPLE_DATA, RECIPE, REGION, { full: true });
    expect(p.output.width).toBe(1920);
    expect(p.output.height).toBe(1080);
  });

  it('is deterministic', () => {
    const a = buildPreviewPayload(SAMPLE_DATA, RECIPE, REGION);
    const b = buildPreviewPayload(SAMPLE_DATA, RECIPE, REGION);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('includes context data when provided', () => {
    const context: ProcessedData = { ...SAMPLE_DATA, source_id: 'gebco' };
    const p = buildPreviewPayload(SAMPLE_DATA, RECIPE, REGION, {}, context);
    expect(p.data.context).toBeDefined();
    expect(p.data.context!.source_id).toBe('gebco');
  });

  it('crops when region is smaller than data', () => {
    const smallRegion = { lat: [30, 50] as [number, number], lon: [-60, -20] as [number, number] };
    const p = buildPreviewPayload(SAMPLE_DATA, RECIPE, smallRegion);
    expect(p.data.primary.lat_range).toEqual([30, 50]);
    expect(p.data.primary.lon_range).toEqual([-60, -20]);
  });

  it('does not downsample small grids', () => {
    const p = buildPreviewPayload(SAMPLE_DATA, RECIPE, REGION);
    // 10x10 is below the 20-row threshold — no downsampling
    expect(p.data.primary.shape).toEqual([10, 10]);
  });
});
