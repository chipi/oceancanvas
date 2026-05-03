"""Tests for OBIS biologging data tasks."""

import json
from pathlib import Path

from oceancanvas.tasks.obis import SPECIES, process_obis


class TestSpecies:
    def test_known_species(self):
        assert "whale-shark" in SPECIES
        assert "leatherback-turtle" in SPECIES
        assert "elephant-seal" in SPECIES

    def test_scientific_names(self):
        assert SPECIES["whale-shark"] == "Rhincodon typus"


class TestProcessObis:
    def test_produces_point_format(self, tmp_path: Path):
        raw_path = tmp_path / "raw.json"
        raw_path.write_text(json.dumps([
            {"decimalLatitude": 10.5, "decimalLongitude": -20.3, "depth": 15},
            {"decimalLatitude": 12.0, "decimalLongitude": -18.0, "eventDate": "2020-05-01"},
        ]))

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
        raw_path.write_text(json.dumps([
            {"decimalLatitude": 10.5, "decimalLongitude": -20.3},
            {"decimalLatitude": None, "decimalLongitude": -18.0},
            {"depth": 100},
        ]))

        processed_dir = tmp_path / "processed"
        result = process_obis(raw_path, processed_dir, "whale-shark")
        data = json.loads(result.read_text())
        assert data["shape"] == [1]

    def test_custom_date(self, tmp_path: Path):
        raw_path = tmp_path / "raw.json"
        raw_path.write_text(json.dumps([
            {"decimalLatitude": 10, "decimalLongitude": 20},
        ]))

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
