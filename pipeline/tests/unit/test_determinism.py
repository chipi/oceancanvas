"""Determinism tests — same input must produce identical output."""

from pathlib import Path

import pytest

from oceancanvas.tasks.process import _process_oisst

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


def test_process_produces_identical_output_on_rerun(tmp_path: Path):
    """Running _process_oisst twice on the same file produces byte-identical outputs."""
    nc_path = FIXTURES_DIR / "oisst" / "2026-01-15.nc"
    if not nc_path.exists():
        pytest.skip("fixture not generated")

    out1 = tmp_path / "run1"
    out2 = tmp_path / "run2"

    _process_oisst(nc_path, out1, "2026-01-15")
    _process_oisst(nc_path, out2, "2026-01-15")

    for ext in (".json", ".png", ".meta.json"):
        f1 = (out1 / f"2026-01-15{ext}").read_bytes()
        f2 = (out2 / f"2026-01-15{ext}").read_bytes()
        assert f1 == f2, f"Determinism violation: {ext} differs between runs"
