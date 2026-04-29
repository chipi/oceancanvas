import { useCallback } from 'react';
import type { CreativeState } from '../lib/creativeMapping';
import { MOOD_PRESETS } from '../lib/creativeMapping';
import styles from './CreativeControls.module.css';

interface CreativeControlsProps {
  state: CreativeState;
  onChange: (state: CreativeState) => void;
  originalState?: CreativeState | null;
  onReset?: () => void;
}

/**
 * Creative mode control surface — mood presets, energy×presence quadrant,
 * colour character spectrum, temporal weight slider.
 *
 * Per UXS-003: the interface operates at the level of artistic intent.
 */
export function CreativeControls({ state, onChange, originalState, onReset }: CreativeControlsProps) {
  const update = useCallback(
    (partial: Partial<CreativeState>) => onChange({ ...state, ...partial }),
    [state, onChange],
  );

  return (
    <div className={styles.container}>
      {/* Mood presets */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>MOOD</div>
        <div className={styles.moodRow}>
          {originalState && onReset && (
            <button
              className={`${styles.moodPill} ${styles.moodSaved} ${state.mood === 'saved' ? styles.moodActive : ''}`}
              onClick={onReset}
            >
              Saved
            </button>
          )}
          {Object.keys(MOOD_PRESETS).map((name) => (
            <button
              key={name}
              className={`${styles.moodPill} ${state.mood === name ? styles.moodActive : ''}`}
              onClick={() => onChange({ ...MOOD_PRESETS[name] })}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Controls row: quadrant left, sliders right */}
      <div className={styles.controlsRow}>

      {/* Energy × Presence quadrant */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>ENERGY × PRESENCE</div>
        <div
          className={styles.quadrant}
          onMouseDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const handleMove = (ev: MouseEvent) => {
              const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
              const y = Math.max(0, Math.min(1, 1 - (ev.clientY - rect.top) / rect.height));
              update({ energy_x: Math.round(x * 100) / 100, energy_y: Math.round(y * 100) / 100 });
            };
            const handleUp = () => {
              window.removeEventListener('mousemove', handleMove);
              window.removeEventListener('mouseup', handleUp);
            };
            handleMove(e.nativeEvent);
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
          }}
          role="slider"
          aria-label="Energy and presence"
          aria-valuetext={`Energy ${Math.round(state.energy_x * 100)}%, Presence ${Math.round(state.energy_y * 100)}%`}
          tabIndex={0}
          onKeyDown={(e) => {
            const step = 0.05;
            if (e.key === 'ArrowRight') update({ energy_x: Math.min(1, state.energy_x + step) });
            if (e.key === 'ArrowLeft') update({ energy_x: Math.max(0, state.energy_x - step) });
            if (e.key === 'ArrowUp') update({ energy_y: Math.min(1, state.energy_y + step) });
            if (e.key === 'ArrowDown') update({ energy_y: Math.max(0, state.energy_y - step) });
          }}
        >
          <div className={styles.quadrantGrid} />
          <div className={styles.quadrantLabels}>
            <span className={styles.qLabel} style={{ top: 4, left: 4 }}>Ghost</span>
            <span className={styles.qLabel} style={{ top: 4, right: 4 }}>Storm</span>
            <span className={styles.qLabel} style={{ bottom: 4, left: 4 }}>Dormant</span>
            <span className={styles.qLabel} style={{ bottom: 4, right: 4 }}>Becalmed</span>
          </div>
          <div
            className={styles.quadrantDot}
            style={{
              left: `${state.energy_x * 100}%`,
              bottom: `${state.energy_y * 100}%`,
            }}
          />
          {/* Axis labels */}
          <div className={styles.axisLabel} style={{ bottom: -18, left: '50%', transform: 'translateX(-50%)' }}>
            calm → turbulent
          </div>
          <div className={styles.axisLabel} style={{ left: -14, top: '50%', transform: 'translateY(-50%) rotate(-90deg)' }}>
            ghost → solid
          </div>
        </div>
      </div>

      {/* Right column: sliders */}
      <div className={styles.slidersCol}>

      {/* Colour character */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>COLOUR CHARACTER</div>
        <div className={styles.spectrumWrap}>
          <div className={styles.spectrum}>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(state.colour_character * 100)}
              onChange={(e) => update({ colour_character: Number(e.target.value) / 100 })}
              className={styles.spectrumInput}
              aria-label="Colour character"
            />
          </div>
          <div className={styles.spectrumLabels}>
            <span>Arctic cold</span>
            <span>Thermal</span>
            <span>Otherworldly</span>
          </div>
        </div>
      </div>

      {/* Temporal weight */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>TEMPORAL WEIGHT</div>
        <div className={styles.sliderWrap}>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(state.temporal_weight * 100)}
            onChange={(e) => update({ temporal_weight: Number(e.target.value) / 100 })}
            className={styles.slider}
            aria-label="Temporal weight"
          />
          <div className={styles.sliderLabels}>
            <span>moment</span>
            <span>ephemeral</span>
            <span>present</span>
            <span>lingering</span>
            <span>epoch</span>
          </div>
        </div>
      </div>
      </div>{/* end slidersCol */}
      </div>{/* end controlsRow */}
    </div>
  );
}
