import { describe, it, expect } from 'vitest';
import { getSourceInfo, SOURCES } from './sourceInfo';

describe('getSourceInfo', () => {
  it('returns OISST info', () => {
    const info = getSourceInfo('oisst');
    expect(info).not.toBeNull();
    expect(info!.name).toContain('OISST');
    expect(info!.agency).toContain('NOAA');
    expect(info!.url).toContain('noaa.gov');
  });

  it('returns Argo info', () => {
    const info = getSourceInfo('argo');
    expect(info).not.toBeNull();
    expect(info!.name).toContain('Argo');
    expect(info!.url).toContain('argo');
  });

  it('returns GEBCO info', () => {
    const info = getSourceInfo('gebco');
    expect(info).not.toBeNull();
    expect(info!.name).toContain('GEBCO');
  });

  it('returns null for unknown source', () => {
    expect(getSourceInfo('nonexistent')).toBeNull();
  });

  it('all sources have required fields', () => {
    for (const [id, info] of Object.entries(SOURCES)) {
      expect(info.name).toBeTruthy();
      expect(info.agency).toBeTruthy();
      expect(info.description.length).toBeGreaterThan(50);
      expect(info.url).toMatch(/^https?:\/\//);
      expect(info.license).toBeTruthy();
    }
  });
});
