import { type SyntheticEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useManifest, type RecipeEntry } from '../hooks/useManifest';
import styles from './Gallery.module.css';

function handleImgError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none';
}

function renderUrl(recipe: string, date: string): string {
  return `/renders/${recipe}/${date}.png`;
}

/** Assign size tier based on render count relative to the max. */
function getTier(entry: RecipeEntry, maxCount: number): 'large' | 'medium' | 'standard' {
  if (entry.count === maxCount && maxCount > 0) return 'large';
  if (entry.count >= 3) return 'medium';
  return 'standard';
}

export function Gallery() {
  const { manifest, error, loading } = useManifest();
  const [filter, setFilter] = useState<string | null>(null);
  const navigate = useNavigate();

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>Could not load manifest: {error}</div>;
  if (!manifest || manifest.recipe_count === 0) {
    return <div className={styles.empty}>No renders yet. Run the pipeline to get started.</div>;
  }

  const recipes = Object.values(manifest.recipes);
  const filtered = filter ? recipes.filter((r) => r.source === filter) : recipes;
  const maxCount = Math.max(...recipes.map((r) => r.count));
  const sources = [...new Set(recipes.map((r) => r.source).filter(Boolean))];

  return (
    <div className={styles.page}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <a href="/" className={styles.wordmark}>OCEANCANVAS</a>
        <div className={styles.filters}>
          <button
            className={`${styles.filter} ${!filter ? styles.filterActive : ''}`}
            onClick={() => setFilter(null)}
          >
            all
          </button>
          {sources.map((s) => (
            <button
              key={s}
              className={`${styles.filter} ${filter === s ? styles.filterActive : ''}`}
              onClick={() => setFilter(s!)}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {/* Masonry grid */}
      <div className={styles.masonry}>
        {filtered.map((recipe) => {
          const tier = getTier(recipe, maxCount);
          return (
            <div
              key={recipe.name}
              className={`${styles.tile} ${styles[`tile_${tier}`]}`}
              onClick={() => navigate(`/gallery/${recipe.name}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/gallery/${recipe.name}`); }}
              aria-label={`${recipe.name} — ${recipe.render_type} — ${recipe.latest}`}
            >
              <img
                className={styles.tileImage}
                src={renderUrl(recipe.name, recipe.latest)}
                alt={recipe.name}
                loading="lazy"
                onError={handleImgError}
              />
              <div className={styles.tileOverlay}>
                <div className={styles.tileName}>{recipe.name}</div>
                <div className={styles.tileMeta}>
                  {recipe.render_type} · {recipe.source} · {recipe.latest}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
