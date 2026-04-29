import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useManifest } from './useManifest';

const MOCK_MANIFEST = {
  generated_at: '2026-04-29T07:00:00Z',
  recipe_count: 2,
  recipes: {
    'north-atlantic-sst': {
      name: 'north-atlantic-sst',
      render_type: 'field',
      source: 'oisst',
      dates: ['2026-04-13'],
      latest: '2026-04-13',
      count: 1,
    },
    'argo-scatter': {
      name: 'argo-scatter',
      render_type: 'scatter',
      source: 'argo',
      dates: ['2026-04-29'],
      latest: '2026-04-29',
      count: 1,
    },
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useManifest', () => {
  it('returns loading initially', () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useManifest());
    expect(result.current.loading).toBe(true);
    expect(result.current.manifest).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns manifest on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_MANIFEST),
    } as Response);

    const { result } = renderHook(() => useManifest());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.manifest).not.toBeNull();
    expect(result.current.manifest!.recipe_count).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('returns error on fetch failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    const { result } = renderHook(() => useManifest());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.manifest).toBeNull();
    expect(result.current.error).toContain('404');
  });

  it('returns error on network failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useManifest());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.manifest).toBeNull();
    expect(result.current.error).toContain('Network error');
  });
});
