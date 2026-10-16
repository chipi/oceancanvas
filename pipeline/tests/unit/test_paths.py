"""Tests for data/recipes/renders directory resolution (paths.py)."""

import os
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

import oceancanvas
from oceancanvas import paths

# tests/unit/test_paths.py → the checkout this test file belongs to.
THIS_CHECKOUT = Path(__file__).resolve().parents[3]
DIR_VARS = ("DATA_DIR", "RECIPES_DIR", "RENDERS_DIR")


@pytest.fixture()
def no_dir_env(monkeypatch):
    for var in DIR_VARS:
        monkeypatch.delenv(var, raising=False)


def _git(*args: str) -> Path:
    out = subprocess.run(
        ["git", *args], cwd=THIS_CHECKOUT, capture_output=True, text=True, check=True
    )
    return Path(out.stdout.strip())


def _fake_package(root: Path, *parts: str) -> Path:
    package_dir = root.joinpath(*parts)
    package_dir.mkdir(parents=True)
    return package_dir


class TestNativeDefaults:
    def test_package_imports_from_this_checkout(self):
        assert Path(oceancanvas.__file__).resolve().is_relative_to(THIS_CHECKOUT)

    def test_checkout_root_is_this_checkout(self):
        assert paths.checkout_root() == THIS_CHECKOUT

    def test_checkout_root_matches_git_toplevel(self):
        assert paths.checkout_root() == _git("rev-parse", "--show-toplevel").resolve()

    def test_defaults_are_checkout_local(self, no_dir_env):
        assert paths.data_dir() == THIS_CHECKOUT / "data"
        assert paths.recipes_dir() == THIS_CHECKOUT / "recipes"
        assert paths.renders_dir() == THIS_CHECKOUT / "renders"

    def test_linked_worktree_does_not_resolve_into_primary(self, no_dir_env):
        """A side worktree resolves to itself, not to the primary checkout."""
        primary = _git("rev-parse", "--path-format=absolute", "--git-common-dir").resolve().parent
        if primary == THIS_CHECKOUT:
            pytest.skip("running from the primary checkout")
        for resolved in (paths.data_dir(), paths.recipes_dir(), paths.renders_dir()):
            assert resolved.parent == THIS_CHECKOUT
            assert resolved.parent != primary

    def test_empty_env_var_falls_back_to_checkout(self, monkeypatch):
        monkeypatch.setenv("DATA_DIR", "")
        assert paths.data_dir() == THIS_CHECKOUT / "data"

    def test_fake_checkout_layout(self, tmp_path, no_dir_env):
        root = tmp_path / "repo"
        package_dir = _fake_package(root, "pipeline", "src", "oceancanvas")
        (root / "pipeline" / "pyproject.toml").write_text("")
        assert paths.data_dir(package_dir) == root / "data"
        assert paths.recipes_dir(package_dir) == root / "recipes"
        assert paths.renders_dir(package_dir) == root / "renders"

    def test_independent_of_working_directory(self, tmp_path):
        """A fresh interpreter started elsewhere still resolves to this checkout."""
        env = {k: v for k, v in os.environ.items() if k not in DIR_VARS}
        out = subprocess.run(
            [
                sys.executable,
                "-c",
                "import oceancanvas.cli as c; print(c.DATA_DIR); print(c.RECIPES_DIR);"
                " print(c.RENDERS_DIR)",
            ],
            cwd=tmp_path,
            env=env,
            capture_output=True,
            text=True,
            check=True,
        )
        assert out.stdout.split() == [
            str(THIS_CHECKOUT / "data"),
            str(THIS_CHECKOUT / "recipes"),
            str(THIS_CHECKOUT / "renders"),
        ]


class TestExplicitConfigurationWins:
    def test_env_vars_override_checkout(self, monkeypatch, tmp_path):
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "d"))
        monkeypatch.setenv("RECIPES_DIR", str(tmp_path / "r"))
        monkeypatch.setenv("RENDERS_DIR", str(tmp_path / "o"))
        assert paths.data_dir() == tmp_path / "d"
        assert paths.recipes_dir() == tmp_path / "r"
        assert paths.renders_dir() == tmp_path / "o"

    def test_env_vars_override_container_fallback(self, monkeypatch, tmp_path):
        package_dir = _fake_package(tmp_path, "site-packages", "oceancanvas")
        monkeypatch.setenv("RECIPES_DIR", "/recipes")
        monkeypatch.setenv("DATA_DIR", str(tmp_path / "d"))
        assert paths.recipes_dir(package_dir) == Path("/recipes")
        assert paths.data_dir(package_dir) == tmp_path / "d"


class TestContainerDefaults:
    """The Docker image installs the package non-editable; Compose mounts /data etc."""

    @pytest.mark.parametrize(
        "parts",
        [
            ("usr", "local", "lib", "python3.12", "site-packages", "oceancanvas"),
            ("app", "src", "oceancanvas"),  # pipeline/Dockerfile copies src/ to /app/src
        ],
    )
    def test_installed_package_uses_mount_points(self, tmp_path, no_dir_env, parts):
        package_dir = _fake_package(tmp_path, *parts)
        assert paths.checkout_root(package_dir) is None
        assert paths.data_dir(package_dir) == Path("/data")
        assert paths.recipes_dir(package_dir) == Path("/recipes")
        assert paths.renders_dir(package_dir) == Path("/renders")

    def test_layout_without_pyproject_is_not_a_checkout(self, tmp_path, no_dir_env):
        package_dir = _fake_package(tmp_path, "pipeline", "src", "oceancanvas")
        assert paths.data_dir(package_dir) == Path("/data")

    def test_shallow_path(self, no_dir_env):
        assert paths.checkout_root(Path("/oceancanvas")) is None
        assert paths.data_dir(Path("/oceancanvas")) == Path("/data")


class TestCallers:
    def test_flow_resolves_at_call_time(self, no_dir_env):
        from oceancanvas.flow import daily_ocean_pipeline

        with patch("oceancanvas.flow._run_pipeline_core") as core:
            daily_ocean_pipeline.fn(test_mode=True)
        kwargs = core.call_args.kwargs
        assert kwargs["data_dir"] == THIS_CHECKOUT / "data"
        assert kwargs["recipes_dir"] == THIS_CHECKOUT / "recipes"
        assert kwargs["renders_dir"] == THIS_CHECKOUT / "renders"

    def test_flow_honours_env(self, monkeypatch, tmp_path):
        from oceancanvas.flow import daily_ocean_pipeline

        monkeypatch.setenv("DATA_DIR", str(tmp_path))
        with patch("oceancanvas.flow._run_pipeline_core") as core:
            daily_ocean_pipeline.fn(test_mode=True)
        assert core.call_args.kwargs["data_dir"] == tmp_path
