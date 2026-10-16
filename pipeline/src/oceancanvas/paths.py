"""Directory resolution for data/, recipes/ and renders/.

Each directory resolves, first match wins:

1. Its environment variable (`DATA_DIR`, `RECIPES_DIR`, `RENDERS_DIR`), when set
   and non-empty.
2. The checkout the package is imported from, when it runs from source
   (`uv sync` in `pipeline/` installs it editable): `<checkout>/data` etc.
   Each checkout resolves to its own directories, never another checkout's.
3. The container mount point: `/data`, `/recipes`, `/renders`. The Docker image
   installs the package into site-packages, so there is no checkout, and
   Compose mounts the repository directories at these paths.
"""

from __future__ import annotations

import os
from pathlib import Path

_PACKAGE_DIR = Path(__file__).resolve().parent


def checkout_root(package_dir: Path = _PACKAGE_DIR) -> Path | None:
    """Repository root when the package is imported from `<root>/pipeline/src/oceancanvas`."""
    if len(package_dir.parents) < 3:
        return None
    root = package_dir.parents[2]
    if package_dir != root / "pipeline" / "src" / "oceancanvas":
        return None
    if not (root / "pipeline" / "pyproject.toml").is_file():
        return None
    return root


def _resolve(env_var: str, name: str, package_dir: Path) -> Path:
    value = os.environ.get(env_var)
    if value:
        return Path(value)
    root = checkout_root(package_dir)
    return root / name if root is not None else Path("/") / name


def data_dir(package_dir: Path = _PACKAGE_DIR) -> Path:
    return _resolve("DATA_DIR", "data", package_dir)


def recipes_dir(package_dir: Path = _PACKAGE_DIR) -> Path:
    return _resolve("RECIPES_DIR", "recipes", package_dir)


def renders_dir(package_dir: Path = _PACKAGE_DIR) -> Path:
    return _resolve("RENDERS_DIR", "renders", package_dir)
