"""Scaffold test — verifies the test infrastructure works."""

from oceancanvas import __version__


def test_version():
    assert __version__ == "0.1.0"


def test_fixtures_dir_exists(fixtures_dir):
    assert fixtures_dir.exists()
    assert (fixtures_dir / "oisst").is_dir()
    assert (fixtures_dir / "argo").is_dir()
    assert (fixtures_dir / "gebco").is_dir()
    assert (fixtures_dir / "recipes").is_dir()
