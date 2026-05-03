"""Video assembly — stitch PNG renders into MP4 via ffmpeg.

Takes a recipe's render directory (sorted PNGs), assembles into
an MP4 timelapse at configurable fps. Supports overlay compositing
via ffmpeg drawtext filters.

No audio in v0.4.0 — silent export. Audio stems added in v0.4.1.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from oceancanvas.log import get_logger

AUDIO_THEMES_DIR = Path(__file__).parent.parent.parent.parent / "audio" / "themes"


def assemble_video(
    recipe_name: str,
    renders_dir: Path,
    output_path: Path,
    fps: int = 12,
    dates: list[str] | None = None,
    overlay_date: bool = True,
    overlay_attribution: bool = True,
    audio_theme: str | None = "ocean",
    intensity_signal: list[float] | None = None,
) -> Path:
    """Assemble PNG renders into an MP4 video via ffmpeg.

    Args:
        recipe_name: Recipe slug (renders are in renders_dir/recipe_name/).
        renders_dir: Root renders directory.
        output_path: Where to write the MP4.
        fps: Frames per second.
        dates: Specific dates to include (default: all, sorted).
        overlay_date: Burn date stamp into each frame.
        overlay_attribution: Burn attribution footer.

    Returns:
        Path to the output MP4.
    """
    logger = get_logger()
    recipe_dir = renders_dir / recipe_name

    if not recipe_dir.exists():
        msg = f"No renders directory: {recipe_dir}"
        raise FileNotFoundError(msg)

    # Collect PNG files
    if dates:
        png_files = [recipe_dir / f"{d}.png" for d in dates]
        png_files = [p for p in png_files if p.exists()]
    else:
        png_files = sorted(recipe_dir.glob("*.png"))
        # Exclude "latest.png" from timeline
        png_files = [p for p in png_files if p.stem != "latest"]

    if not png_files:
        msg = f"No PNG files found in {recipe_dir}"
        raise FileNotFoundError(msg)

    logger.info(
        "Assembling %d frames into %s at %d fps",
        len(png_files), output_path, fps,
    )

    # Create a concat file listing all PNGs with duration
    concat_path = output_path.with_suffix(".concat.txt")
    frame_duration = f"{1/fps:.6f}"
    with concat_path.open("w") as f:
        for png in png_files:
            f.write(f"file '{png.resolve()}'\n")
            f.write(f"duration {frame_duration}\n")
        # Repeat last frame to avoid ffmpeg cutting it short
        f.write(f"file '{png_files[-1].resolve()}'\n")

    # Build audio track if theme is specified
    audio_path = None
    if audio_theme:
        audio_path = _build_audio_track(
            audio_theme, len(png_files), fps, intensity_signal, output_path,
        )

    # Build ffmpeg command
    vf = _build_filters(overlay_date, overlay_attribution, png_files)
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_path),
    ]
    if audio_path:
        cmd.extend(["-i", str(audio_path)])
    # Only add filter if we have drawtext support
    if vf != "null":
        cmd.extend(["-vf", vf])
    cmd.extend([
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "medium",
        "-crf", "23",
    ])
    if audio_path:
        cmd.extend(["-c:a", "aac", "-b:a", "192k", "-shortest"])
    cmd.extend([
        "-movflags", "+faststart",
        str(output_path),
    ])

    logger.info("Running ffmpeg: %s", " ".join(cmd[:6]) + " ...")

    result = subprocess.run(
        cmd,
        capture_output=True,
        timeout=600,
        check=False,
    )

    # Clean up temp files
    concat_path.unlink(missing_ok=True)
    if audio_path:
        audio_path.unlink(missing_ok=True)

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        msg = f"ffmpeg failed (exit {result.returncode}): {stderr[-500:]}"
        raise RuntimeError(msg)

    size = output_path.stat().st_size
    duration = len(png_files) / fps
    logger.info(
        "Video assembled: %s (%.1f MB, %.1fs at %d fps)",
        output_path, size / 1024 / 1024, duration, fps,
    )
    return output_path


def _build_audio_track(
    theme: str,
    frame_count: int,
    fps: int,
    intensity: list[float] | None,
    output_path: Path,
) -> Path | None:
    """Build an audio track by crossfading stems based on intensity signal.

    Maps intensity [0-1] to 5 stems. Concatenates stem segments with
    crossfading to produce a single WAV matching the video duration.
    """
    logger = get_logger()
    theme_dir = AUDIO_THEMES_DIR / theme
    if not theme_dir.exists():
        # Try Docker/project-relative paths
        for candidate in [
            Path("/audio/themes") / theme,
            Path(__file__).parent.parent.parent.parent.parent / "audio" / "themes" / theme,
        ]:
            if candidate.exists():
                theme_dir = candidate
                break
        else:
            logger.warning("Audio theme '%s' not found, skipping audio", theme)
            return None

    stems = sorted(theme_dir.glob("stem_*.wav"))
    if len(stems) < 2:
        logger.warning("Not enough stems in %s, skipping audio", theme_dir)
        return None

    video_duration = frame_count / fps
    stem_count = len(stems)

    # If no intensity signal, use a simple rising arc
    if not intensity or len(intensity) != frame_count:
        intensity = [i / max(1, frame_count - 1) for i in range(frame_count)]

    # Map intensity to stem segments (each segment = 1 second of audio)
    segment_duration = 1.0
    total_segments = int(video_duration / segment_duration) + 1

    # Build a concat list of stem segments
    audio_concat = output_path.with_suffix(".audio.txt")
    with audio_concat.open("w") as f:
        for seg in range(total_segments):
            # Find the intensity at this time point
            frame_idx = min(
                frame_count - 1, int(seg * segment_duration * fps)
            )
            level = intensity[frame_idx] if frame_idx < len(intensity) else 0.5
            stem_idx = min(stem_count - 1, int(level * stem_count))
            stem_path = stems[stem_idx]
            f.write(f"file '{stem_path.resolve()}'\n")
            f.write("inpoint 0\n")
            f.write(f"outpoint {segment_duration}\n")

    # Assemble audio from segments
    audio_out = output_path.with_suffix(".audio.wav")
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(audio_concat),
        "-t", str(video_duration),
        "-c:a", "pcm_s16le",
        str(audio_out),
    ]

    result = subprocess.run(cmd, capture_output=True, timeout=120, check=False)

    # Clean up concat file
    audio_concat.unlink(missing_ok=True)

    if result.returncode != 0:
        logger.warning("Audio assembly failed, exporting without audio")
        audio_out.unlink(missing_ok=True)
        return None

    logger.info("Audio track: %.1fs from %d segments", video_duration, total_segments)
    return audio_out


def _build_filters(
    overlay_date: bool,
    overlay_attribution: bool,
    png_files: list[Path],
) -> str:
    """Build ffmpeg filter string for overlays."""
    filters = []

    if overlay_date:
        # Extract dates from filenames for per-frame date stamp
        # Use ffmpeg's frame number to index into the date list
        # Simple approach: burn the recipe name (date is in the filename)
        filters.append(
            "drawtext=text='%{pts\\:gmtime\\:0\\:%Y}':"
            "fontsize=24:fontcolor=white@0.6:"
            "x=w-tw-20:y=20:font=monospace"
        )

    if overlay_attribution:
        filters.append(
            "drawtext=text='OceanCanvas':"
            "fontsize=16:fontcolor=white@0.4:"
            "x=20:y=h-30:font=monospace"
        )

    if not filters:
        return "null"
    return ",".join(filters)


def get_video_info(recipe_name: str, renders_dir: Path) -> dict:
    """Get info about available frames for a recipe."""
    recipe_dir = renders_dir / recipe_name
    if not recipe_dir.exists():
        return {"frames": 0, "dates": []}

    pngs = sorted(recipe_dir.glob("*.png"))
    pngs = [p for p in pngs if p.stem != "latest"]
    dates = [p.stem for p in pngs]

    return {
        "recipe": recipe_name,
        "frames": len(dates),
        "dates": dates,
        "first": dates[0] if dates else None,
        "last": dates[-1] if dates else None,
    }
