"""Tests for atomic I/O helpers."""

from pathlib import Path

from oceancanvas.io import atomic_write_bytes, atomic_write_text


class TestAtomicWriteText:
    def test_creates_file(self, tmp_path: Path):
        p = tmp_path / "out.json"
        atomic_write_text(p, '{"key": "value"}')
        assert p.exists()
        assert p.read_text() == '{"key": "value"}'

    def test_no_tmp_remains(self, tmp_path: Path):
        p = tmp_path / "out.json"
        atomic_write_text(p, "data")
        assert not p.with_suffix(".json.tmp").exists()

    def test_creates_parent_dirs(self, tmp_path: Path):
        p = tmp_path / "a" / "b" / "c.txt"
        atomic_write_text(p, "nested")
        assert p.exists()

    def test_overwrites_existing(self, tmp_path: Path):
        p = tmp_path / "out.txt"
        p.write_text("old")
        atomic_write_text(p, "new")
        assert p.read_text() == "new"

    def test_cleans_orphaned_tmp(self, tmp_path: Path):
        p = tmp_path / "out.txt"
        orphan = p.with_suffix(".txt.tmp")
        orphan.write_text("orphan")
        atomic_write_text(p, "fresh")
        assert p.read_text() == "fresh"
        assert not orphan.exists()


class TestAtomicWriteBytes:
    def test_creates_file(self, tmp_path: Path):
        p = tmp_path / "out.png"
        atomic_write_bytes(p, b"\x89PNG")
        assert p.read_bytes() == b"\x89PNG"

    def test_no_tmp_remains(self, tmp_path: Path):
        p = tmp_path / "out.png"
        atomic_write_bytes(p, b"data")
        assert not p.with_suffix(".png.tmp").exists()
