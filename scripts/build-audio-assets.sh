#!/usr/bin/env bash
# Build generative audio sample assets — RFC-010 Layer 2 (pulse) + Layer 3 (accent) + Layer 4 (texture).
# Drone (Layer 1) is fully synthesised at runtime via Web Audio OscillatorNode / ffmpeg sine, no asset needed.
#
# Outputs land in audio/generative/ — checked into the repo (~500KB total).
# Re-run any time the sample design changes; outputs are deterministic from ffmpeg version.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/audio/generative"
mkdir -p "$OUT"

echo "Building audio assets → $OUT"

# ── Layer 2: Pulse ticks (0.1s each) ──────────────────────────────────────
# Three filtered click variants. Pitch differentiates direction of data change.

# Neutral — broadband click around 1kHz
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anoisesrc=color=white:duration=0.1:amplitude=0.7" \
  -af "highpass=f=900,lowpass=f=1600,afade=t=out:st=0.06:d=0.04" \
  -ac 2 -ar 44100 -b:a 96k "$OUT/pulse_tick_neutral.mp3"

# Up — high click (rising data)
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anoisesrc=color=white:duration=0.1:amplitude=0.7" \
  -af "highpass=f=1500,lowpass=f=2400,afade=t=out:st=0.05:d=0.05" \
  -ac 2 -ar 44100 -b:a 96k "$OUT/pulse_tick_up.mp3"

# Down — low click (falling data)
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anoisesrc=color=white:duration=0.1:amplitude=0.7" \
  -af "highpass=f=400,lowpass=f=900,afade=t=out:st=0.05:d=0.05" \
  -ac 2 -ar 44100 -b:a 96k "$OUT/pulse_tick_down.mp3"

# ── Layer 3: Accent samples (1.5s each) ───────────────────────────────────

# Record high — ascending C5 → E5 → G5 chime
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=523.25:duration=0.5" \
  -f lavfi -i "sine=frequency=659.25:duration=0.5" \
  -f lavfi -i "sine=frequency=783.99:duration=0.6" \
  -filter_complex "[0:a]afade=t=out:st=0.35:d=0.15,adelay=0|0[a0];[1:a]afade=t=out:st=0.35:d=0.15,adelay=350|350[a1];[2:a]afade=t=out:st=0.4:d=0.2,adelay=700|700[a2];[a0][a1][a2]amix=inputs=3:duration=longest:normalize=0,volume=0.6" \
  -ac 2 -ar 44100 -t 1.5 -b:a 128k "$OUT/accent_record_high.mp3"

# Record low — descending G4 → E4 → C4 tone
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=392.00:duration=0.5" \
  -f lavfi -i "sine=frequency=329.63:duration=0.5" \
  -f lavfi -i "sine=frequency=261.63:duration=0.6" \
  -filter_complex "[0:a]afade=t=out:st=0.35:d=0.15,adelay=0|0[a0];[1:a]afade=t=out:st=0.35:d=0.15,adelay=350|350[a1];[2:a]afade=t=out:st=0.4:d=0.2,adelay=700|700[a2];[a0][a1][a2]amix=inputs=3:duration=longest:normalize=0,volume=0.6" \
  -ac 2 -ar 44100 -t 1.5 -b:a 128k "$OUT/accent_record_low.mp3"

# Inflection — single A4 bell with long decay
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=440:duration=1.5" \
  -af "afade=t=in:st=0:d=0.01,afade=t=out:st=0.05:d=1.45,lowpass=f=2200,volume=0.5" \
  -ac 2 -ar 44100 -b:a 128k "$OUT/accent_inflection.mp3"

# ── Layer 4: Texture loop ─────────────────────────────────────────────────
# Brown noise, 10 seconds, lowpassed. Volume modulation lives on the runtime side.

ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "anoisesrc=color=brown:duration=10:amplitude=0.6" \
  -af "lowpass=f=600,volume=0.5" \
  -ac 2 -ar 44100 -b:a 96k "$OUT/texture_noise.mp3"

echo
echo "Built:"
du -h "$OUT"/*.mp3 | sort -k2
echo
echo "Total: $(du -ch "$OUT"/*.mp3 | tail -1 | cut -f1)"
