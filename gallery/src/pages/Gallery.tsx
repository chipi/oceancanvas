import { type SyntheticEvent, useState } from 'react';
import { useManifest } from '../hooks/useManifest';
import styles from './Gallery.module.css';

function handleImgError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none';
}

function renderUrl(recipe: string, date: string): string {
  return `/renders/${recipe}/${date}.png`;
}

export function Gallery() {
  const { manifest, error, loading } = useManifest();
  const [filter, setFilter] = useState<string | null>(null);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>Could not load manifest: {error}</div>;
  if (!manifest || manifest.recipe_count === 0) {
    return <div className={styles.empty}>No renders yet. Run the pipeline to get started.</div>;
  }

  const recipes = Object.values(manifest.recipes);
  const filtered = filter
    ? recipes.filter((r) => r.source === filter)
    : recipes;

  // Hero: first recipe with the most renders
  const hero = [...recipes].sort((a, b) => b.count - a.count)[0];
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

      {/* Hero */}
      {hero && (
        <div className={styles.hero}>
          <img
            className={styles.heroImage}
            src={renderUrl(hero.name, hero.latest)}
            alt={`${hero.name} — ${hero.latest}`}
            onError={handleImgError}
          />
          <div className={styles.heroOverlay}>
            <div className={styles.heroName}>{hero.name}</div>
            <div className={styles.heroMeta}>
              {hero.render_type} · {hero.source} · {hero.latest} · {hero.count} renders
            </div>
          </div>
        </div>
      )}

      {/* 14-day strip */}
      {hero && hero.dates.length > 1 && (
        <>
          <div className={styles.stripLabel}>
            Last {Math.min(14, hero.dates.length)} days · {hero.name}
          </div>
          <div className={styles.strip}>
            {hero.dates.slice(-14).map((date) => (
              <img
                key={date}
                className={styles.stripThumb}
                src={renderUrl(hero.name, date)}
                alt={date}
                title={date}
                loading="lazy"
                onError={handleImgError}
              />
            ))}
          </div>
        </>
      )}

      {/* Grid */}
      <div className={styles.gridLabel}>
        {filtered.length} recipe{filtered.length !== 1 ? 's' : ''} · today
      </div>
      <div className={styles.grid}>
        {filtered.map((recipe) => (
          <div key={recipe.name} className={styles.card}>
            <img
              className={styles.cardImage}
              src={renderUrl(recipe.name, recipe.latest)}
              alt={recipe.name}
              loading="lazy"
              onError={handleImgError}
            />
            <div className={styles.cardOverlay}>
              <div className={styles.cardName}>{recipe.name}</div>
              <div className={styles.cardDate}>
                {recipe.render_type} · {recipe.latest}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
