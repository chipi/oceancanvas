# RFC-006: Key Moment Detection Algorithm

- **Status**: Draft
- **Related PRDs**: `docs/prd/PRD-009-audio-enrichment.md`, `docs/prd/PRD-010-overlay-enrichment.md`
- **Related ADRs**: `docs/adr/ADR-011-ffmpeg-video-assembly.md`

## Abstract

This RFC defines the key moment detection algorithm shared by the audio enrichment (PRD-009) and overlay enrichment (PRD-010) systems. The algorithm finds statistically significant frames in a data scalar time series: statistical peaks, record highs, threshold crossings, and inflection points. Both audio and overlays respond to the same detected moments, ensuring they are perfectly synced in the exported film.

## Design & Implementation

### 1. Four detection types

```python
def detect_key_moments(
    values: np.ndarray,
    dates: list[str],
    threshold: float | None = None,
    sensitivity: float = 2.0,
) -> list[KeyMoment]:
    moments = []
    mean = np.mean(values)
    std = np.std(values)
    running_max = -np.inf

    for i, (value, date) in enumerate(zip(values, dates)):

        # 1. Statistical peaks — value exceeds mean by more than sensitivity × std
        if abs(value - mean) > sensitivity * std:
            moments.append(KeyMoment(
                frame=i, date=date, type="statistical_peak",
                value=value, magnitude=(value - mean) / std
            ))

        # 2. Record highs — value exceeds all previous values
        if value > running_max:
            running_max = value
            if i > 0:  # skip first frame — it's always a "record"
                moments.append(KeyMoment(
                    frame=i, date=date, type="record_high",
                    value=value, magnitude=1.0
                ))

        # 3. Threshold crossings — user-defined significant value
        if threshold is not None and i > 0:
            prev = values[i-1]
            if (prev < threshold <= value) or (prev > threshold >= value):
                moments.append(KeyMoment(
                    frame=i, date=date, type="threshold_crossing",
                    value=value, magnitude=abs(value - threshold)
                ))

    # 4. Inflection points — where rate of change changes significantly
    if len(values) > 2:
        diffs = np.diff(values)
        diff_changes = np.diff(diffs)
        diff_std = np.std(diff_changes)
        for i, change in enumerate(diff_changes):
            if abs(change) > sensitivity * diff_std:
                moments.append(KeyMoment(
                    frame=i+1, date=dates[i+1], type="inflection_point",
                    value=values[i+1], magnitude=abs(change) / diff_std
                ))

    # Deduplicate — if multiple types fire on the same frame, keep highest magnitude
    return deduplicate_by_frame(moments)
```

### 2. KeyMoment dataclass

```python
@dataclass
class KeyMoment:
    frame: int          # frame index in the timelapse
    date: str           # ISO date string
    type: str           # statistical_peak | record_high | threshold_crossing | inflection_point
    value: float        # data value at this frame
    magnitude: float    # 0.0–∞ — relative significance of this moment
```

### 3. How audio uses key moments

The audio system uses `moment.magnitude` to size the musical response — higher magnitude triggers a larger swell. The `sensitivity` parameter in the audio UI maps to the `sensitivity` argument of `detect_key_moments`.

### 4. How overlays use key moments

Overlays use `moment.type` to choose what to display:
- `record_high` → record flash
- `statistical_peak` → anomaly indicator intensifies
- `threshold_crossing` → threshold crossing label appears
- `inflection_point` → acceleration marker appears

### 5. Timeline display

The video editor timeline shows all detected moments as coloured dots below the frame strip. Dot colour encodes type: amber for records, coral for peaks, blue for thresholds, teal for inflections. These are the same frame numbers used by both audio and overlays.

## Key Decisions

1. **One shared algorithm for audio and overlays**
   - **Decision**: Single implementation in `pipeline/moments.py`, called by both audio.py and overlay.py
   - **Rationale**: Audio swells and overlay annotations must be perfectly synced. A shared algorithm guarantees this.

2. **Deduplication by frame**
   - **Decision**: If multiple detection types fire on the same frame, keep the highest-magnitude moment
   - **Rationale**: Prevents multiple annotations and audio swells at the same frame, which would be visually and sonically overwhelming.

## Open Questions

1. Should inflection point detection use a smoothed derivative to reduce noise in noisy time series?
2. Should the user be able to manually add or remove moments in the video editor timeline?

## References

- PRD-009: Audio enrichment
- PRD-010: Overlay enrichment
