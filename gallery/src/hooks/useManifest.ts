import { useEffect, useState } from 'react';

export interface RecipeEntry {
  name: string;
  title?: string;
  description?: string;
  render_type?: string;
  source?: string;
  dates: string[];
  latest: string;
  count: number;
}

export interface Manifest {
  generated_at: string;
  recipe_count: number;
  recipes: Record<string, RecipeEntry>;
}

export function useManifest() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/renders/manifest.json')
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        setManifest(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { manifest, error, loading };
}
