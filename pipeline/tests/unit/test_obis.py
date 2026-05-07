"""Tests for OBIS biologging data tasks."""

import json
from pathlib import Path

from oceancanvas.tasks.obis import SPECIES, process_obis, process_obis_density


class TestSpecies:
    def test_known_species(self):
        assert "whale-shark" in SPECIES

    def test_scientific_names(self):
        assert SPECIES["whale-shark"] == "Rhincodon typus"


class TestProcessObis:
    def test_produces_point_format(self, tmp_path: Path):
        raw_path = tmp_path / "raw.json"
        raw_path.write_text(
            json.dumps(
                [
                    {"decimalLatitude": 10.5, "decimalLongitude": -20.3, "depth": 15},
                    {"decimalLatitude": 12.0, "decimalLongitude": -18.0, "eventDate": "2020-05-01"},
                ]
            )
        )

        processed_dir = tmp_path / "processed"
        result = process_obis(raw_path, processed_dir, "whale-shark")

        assert result.exists()
        data = json.loads(result.read_text())
        assert data["shape"] == [2]
        assert len(data["data"]) == 2
        assert data["data"][0]["lat"] == 10.5
        assert data["source_id"] == "obis-whale-shark"

    def test_skips_records_without_coords(self, tmp_path: Path):
        raw_path = tmp_path / "raw.json"
        raw_path.write_text(
            json.dumps(
                [
                    {"decimalLatitude": 10.5, "decimalLongitude": -20.3},
                    {"decimalLatitude": None, "decimalLongitude": -18.0},
                    {"depth": 100},
                ]
            )
        )

        processed_dir = tmp_path / "processed"
        result = process_obis(raw_path, processed_dir, "whale-shark")
        data = json.loads(result.read_text())
        assert data["shape"] == [1]

    def test_custom_date(self, tmp_path: Path):
        raw_path = tmp_path / "raw.json"
        raw_path.write_text(
            json.dumps(
                [
                    {"decimalLatitude": 10, "decimalLongitude": 20},
                ]
            )
        )

        processed_dir = tmp_path / "processed"
        result = process_obis(raw_path, processed_dir, "whale-shark", date="2020-01-01")
        assert "2020-01-01" in result.name

    def test_empty_records(self, tmp_path: Path):
        raw_path = tmp_path / "raw.json"
        raw_path.write_text(json.dumps([]))

        processed_dir = tmp_path / "processed"
        result = process_obis(raw_path, processed_dir, "whale-shark")
        data = json.loads(result.read_text())
        assert data["shape"] == [0]


class TestProcessObisDensity:
    def _setup_sources(self, tmp_path: Path, records_by_year: dict) -> Path:
        sources_dir = tmp_path / "sources" / "obis-whale-shark"
        sources_dir.mkdir(parents=True)
        for year, records in records_by_year.items():
            (sources_dir / f"{year}-01-01.json").write_text(json.dumps(records))
        return sources_dir

    def test_bins_observations_into_grid(self, tmp_path: Path):
        sources_dir = self._setup_sources(
            tmp_path,
            {
                "2020": [
                    {"decimalLatitude": 0.0, "decimalLongitude": 0.0},
                    {"decimalLatitude": 0.1, "decimalLongitude": 0.1},  # same cell at 0.5°
                    {"decimalLatitude": 10.0, "decimalLongitude": -20.0},
                ],
                "2021": [
                    {"decimalLatitude": 0.0, "decimalLongitude": 0.0},  # same cell again
                ],
            },
        )

        processed_dir = tmp_path / "processed"
        result = process_obis_density(sources_dir, processed_dir, "whale-shark", resolution=0.5)

        assert result.exists()
        data = json.loads(result.read_text())
        assert data["shape"] == [360, 720]
        assert data["aggregate"] == "density"
        assert data["resolution"] == 0.5
        assert data["source_id"] == "obis-whale-shark"
        assert data["max"] == 3.0  # three observations land in the (0,0) cell

    def test_skips_records_without_coords(self, tmp_path: Path):
        sources_dir = self._setup_sources(
            tmp_path,
            {
                "2020": [
                    {"decimalLatitude": 0.0, "decimalLongitude": 0.0},
                    {"decimalLatitude": None, "decimalLongitude": 0.0},
                    {"decimalLongitude": 0.0},
                ],
            },
        )
        processed_dir = tmp_path / "processed"
        result = process_obis_density(sources_dir, processed_dir, "whale-shark", resolution=1.0)
        data = json.loads(result.read_text())
        assert data["max"] == 1.0

    def test_resolution_changes_grid_size(self, tmp_path: Path):
        sources_dir = self._setup_sources(tmp_path, {"2020": []})
        processed_dir = tmp_path / "processed"

        result_05 = process_obis_density(sources_dir, processed_dir, "whale-shark", resolution=0.5)
        data_05 = json.loads(result_05.read_text())
        assert data_05["shape"] == [360, 720]

        result_1 = process_obis_density(sources_dir, processed_dir, "whale-shark", resolution=1.0)
        data_1 = json.loads(result_1.read_text())
        assert data_1["shape"] == [180, 360]

    def test_path_includes_resolution(self, tmp_path: Path):
        sources_dir = self._setup_sources(tmp_path, {"2020": []})
        processed_dir = tmp_path / "processed"
        result = process_obis_density(sources_dir, processed_dir, "whale-shark", resolution=0.5)
        assert result.name == "density-0.5.json"

    def test_ignores_latest_file(self, tmp_path: Path):
        sources_dir = self._setup_sources(
            tmp_path,
            {
                "2020": [{"decimalLatitude": 0.0, "decimalLongitude": 0.0}],
            },
        )
        # latest.json should be skipped to avoid double-counting.
        (sources_dir / "latest.json").write_text(
            json.dumps([{"decimalLatitude": 0.0, "decimalLongitude": 0.0}])
        )
        processed_dir = tmp_path / "processed"
        result = process_obis_density(sources_dir, processed_dir, "whale-shark", resolution=1.0)
        data = json.loads(result.read_text())
        assert data["max"] == 1.0  # only the year file counted, not latest
