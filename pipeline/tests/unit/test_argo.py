"""Tests for Argo discover, fetch, and process."""

import json
import shutil
from pathlib import Path

from oceancanvas.tasks.argo import discover_argo, process_argo
from oceancanvas.tasks.process import process

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


class TestDiscoverArgo:
    def test_returns_todays_date(self):
        date = discover_argo()
        assert len(date) == 10
        assert date.startswith("20")


class TestProcessArgo:
    def test_produces_processed_files(self, tmp_path: Path):
        fixture = FIXTURES_DIR / "argo" / "2026-01-15.json"
        if not fixture.exists():
            import pytest

            pytest.skip("Argo fixture not generated")

        output = tmp_path / "argo"
        process_argo(fixture, output, "2026-01-15")

        assert (output / "2026-01-15.json").exists()
        assert (output / "2026-01-15.meta.json").exists()

    def test_processed_has_point_format(self, tmp_path: Path):
        fixture = FIXTURES_DIR / "argo" / "2026-01-15.json"
        if not fixture.exists():
            import pytest

            pytest.skip("Argo fixture not generated")

        output = tmp_path / "argo"
        process_argo(fixture, output, "2026-01-15")

        data = json.loads((output / "2026-01-15.json").read_text())
        assert data["source_id"] == "argo"
        assert len(data["data"]) == 5
        assert "lat" in data["data"][0]
        assert "lon" in data["data"][0]

    def test_meta_has_profile_count(self, tmp_path: Path):
        fixture = FIXTURES_DIR / "argo" / "2026-01-15.json"
        if not fixture.exists():
            import pytest

            pytest.skip("Argo fixture not generated")

        output = tmp_path / "argo"
        process_argo(fixture, output, "2026-01-15")

        meta = json.loads((output / "2026-01-15.meta.json").read_text())
        assert meta["profile_count"] == 5

    def test_empty_profiles(self, tmp_path: Path):
        """Empty profile list should not crash."""
        source = tmp_path / "empty.json"
        source.write_text("[]")
        output = tmp_path / "argo"
        process_argo(source, output, "2026-01-15")
        # No output when empty
        assert not (output / "2026-01-15.json").exists()


class TestProcessIntegratesArgo:
    def test_processes_argo_source(self, tmp_data_dir: Path):
        fixture = FIXTURES_DIR / "argo" / "2026-01-15.json"
        if not fixture.exists():
            import pytest

            pytest.skip("Argo fixture not generated")

        src_dir = tmp_data_dir / "data" / "sources" / "argo"
        src_dir.mkdir(parents=True)
        shutil.copy(fixture, src_dir / "2026-01-15.json")

        process.fn(tmp_data_dir / "data", tmp_data_dir / "recipes", tmp_data_dir / "renders")

        processed = tmp_data_dir / "data" / "processed" / "argo"
        assert (processed / "2026-01-15.json").exists()
