import { type SyntheticEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useManifest } from '../hooks/useManifest';
import styles from './Gallery.module.css';

function handleImgError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none';
}

function renderUrl(recipe: string, date: string): string {
  return `/renders/${recipe}/${date}.png`;
}

/** Assign size tier — creates visual variety in the grid.
 *  First recipe (most renders) is large. Every 3rd is medium. Rest standard.
 *  This ensures variety even when all recipes have the same render count. */
function getTier(index: number, total: number): 'large' | 'medium' | 'standard' {
  if (index === 0) return 'large';
  if (total > 3 && (index === 2 || index === 5)) return 'medium';
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
  const sorted = [...recipes].sort((a, b) => b.count - a.count);
  const filtered = filter ? sorted.filter((r) => r.source === filter) : sorted;
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
        <nav className={styles.nav}>
          <a href="/dashboard" className={styles.navLink}>dashboard</a>
          <a href="/dashboard/oisst/explorer" className={styles.navLink}>data explorer</a>
          <a href="/recipes/new" className={styles.navLink}>new recipe</a>
        </nav>
      </header>

      {/* Masonry grid */}
      <div className={styles.masonry}>
        {filtered.map((recipe, index) => {
          const tier = getTier(index, filtered.length);
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
