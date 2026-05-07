import { type SyntheticEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useManifest } from "../hooks/useManifest";
import styles from "./Gallery.module.css";

function handleImgError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

function renderUrl(recipe: string, date: string): string {
  return `/renders/${recipe}/${date}.png`;
}

/** Build the tier sequence for the grid.
 *
 *  The first 6 items are the fixed loved start: large at 0, mediums at 2
 *  and 5. Beyond that, the rhythm continues:
 *
 *    - One additional large per ~10-item block, position hash-jittered
 *      (offset 1..4 within the block) so feature anchors don't sit at
 *      periodic positions across blocks.
 *    - Mediums scattered by deterministic hash (~40% target density),
 *      with two guards: never two mediums adjacent, and force a medium
 *      after 3 standards in a row so the rhythm never flat-lines.
 *
 *  Hash is keyed on index/blockStart, so the same recipe at the same
 *  position always lands the same tier (no flicker on filter changes). */
function buildTiers(
  total: number,
): Array<"large" | "medium" | "standard"> {
  const largePos = new Set<number>([0]);
  for (let blockStart = 6; blockStart < total; blockStart += 10) {
    const blockEnd = Math.min(blockStart + 9, total - 1);
    const blockSize = blockEnd - blockStart + 1;
    if (blockSize < 4) break;
    const h = Math.sin(blockStart * 73.156) * 43758.5453;
    const noise = h - Math.floor(h);
    const offset = 1 + Math.floor(noise * Math.min(4, blockSize - 2));
    largePos.add(blockStart + offset);
  }

  const tiers: Array<"large" | "medium" | "standard"> = [];
  let stdRun = 0;
  for (let i = 0; i < total; i++) {
    if (largePos.has(i)) {
      tiers.push("large");
      stdRun = 0;
    } else if (i < 6) {
      if (i === 2 || i === 5) {
        tiers.push("medium");
        stdRun = 0;
      } else {
        tiers.push("standard");
        stdRun++;
      }
    } else {
      const h = Math.sin(i * 12.9898) * 43758.5453;
      const noise = h - Math.floor(h);
      const wantMedium = noise < 0.4;
      const forceMedium = stdRun >= 3;
      const prevMedium = tiers[i - 1] === "medium";
      if ((wantMedium || forceMedium) && !prevMedium) {
        tiers.push("medium");
        stdRun = 0;
      } else {
        tiers.push("standard");
        stdRun++;
      }
    }
  }
  return tiers;
}

export function Gallery() {
  const { manifest, error, loading } = useManifest();
  const [filter, setFilter] = useState<string | null>(null);
  const navigate = useNavigate();

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error)
    return <div className={styles.error}>Could not load manifest: {error}</div>;
  if (!manifest || manifest.recipe_count === 0) {
    return (
      <div className={styles.empty}>
        No renders yet. Run the pipeline to get started.
      </div>
    );
  }

  const recipes = Object.values(manifest.recipes);
  const sorted = [...recipes].sort((a, b) => b.count - a.count);
  const filtered = filter ? sorted.filter((r) => r.source === filter) : sorted;
  const sources = [...new Set(recipes.map((r) => r.source).filter(Boolean))];

  return (
    <div className={styles.page}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <a href="/" className={styles.wordmark}>
          OCEANCANVAS
        </a>
        <div className={styles.filters}>
          <button
            className={`${styles.filter} ${!filter ? styles.filterActive : ""}`}
            onClick={() => setFilter(null)}
          >
            all sources
          </button>
          {sources.map((s) => (
            <button
              key={s}
              className={`${styles.filter} ${filter === s ? styles.filterActive : ""}`}
              onClick={() => setFilter(s!)}
            >
              {s}
            </button>
          ))}
        </div>
        <nav className={styles.nav}>
          <a href="/dashboard" className={styles.navLink}>
            dashboard
          </a>
          <a href="/dashboard/oisst/explorer" className={styles.navLink}>
            data explorer
          </a>
          <a href="/recipes/new" className={styles.navLink}>
            new recipe
          </a>
        </nav>
      </header>

      {/* Masonry grid */}
      <div className={styles.masonry}>
        {(() => {
          const tiers = buildTiers(filtered.length);
          return filtered.map((recipe, index) => {
            const tier = tiers[index];
            return (
              <div
                key={recipe.name}
                className={`${styles.tile} ${styles[`tile_${tier}`]}`}
                onClick={() => navigate(`/gallery/${recipe.name}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`/gallery/${recipe.name}`);
                }}
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
                  <div className={styles.tileName}>
                    {recipe.title || recipe.name}
                  </div>
                  {recipe.description && (
                    <div className={styles.tileDescription}>
                      {recipe.description}
                    </div>
                  )}
                  <div className={styles.tileMeta}>
                    {recipe.render_type} · {recipe.source} · {recipe.latest}
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
