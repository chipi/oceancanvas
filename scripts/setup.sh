#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# OceanCanvas — Developer Environment Setup
# ──────────────────────────────────────────────────────────────
#
# First thing to run after cloning. Sets up everything needed
# to develop, test, and run OceanCanvas locally.
#
# Usage:
#   bash scripts/setup.sh
#
# What it does:
#   1. Checks prerequisites (Python 3.12, Node 20, Docker, uv)
#   2. Installs Python dependencies (pipeline)
#   3. Installs Node dependencies (renderer + gallery)
#   4. Creates local config (.env from template)
#   5. Creates runtime directories
#   6. Downloads GEBCO bathymetry data
#   7. Validates the setup
#
# After this script completes:
#   make up          — starts the full stack (4 Docker containers)
#   make gallery-dev — starts Vite dev server with hot reload
#   make pipeline-run — triggers a manual pipeline run
#
# ──────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colours for output ────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No colour

info()  { echo -e "${BLUE}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; }

# ── Check we're in the repo root ──────────────────
if [ ! -f "Makefile" ] || [ ! -d "pipeline" ] || [ ! -d "gallery" ]; then
    fail "Run this from the OceanCanvas repo root."
    exit 1
fi

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   OceanCanvas — Dev Environment Setup ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ──────────────────────────────────────────────────
# 1. Prerequisites
# ──────────────────────────────────────────────────

info "Checking prerequisites..."
echo ""

MISSING=0

# Python 3.12+
if command -v python3 &>/dev/null; then
    PY_VER=$(python3 --version 2>&1 | sed 's/[^0-9.]//g' | cut -d. -f1-2)
    PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)
    if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 12 ]; then
        ok "Python $PY_VER"
    else
        fail "Python 3.12+ required (found $PY_VER)"
        MISSING=1
    fi
else
    fail "Python 3.12+ not found"
    MISSING=1
fi

# Node 20+
if command -v node &>/dev/null; then
    NODE_VER=$(node --version | sed 's/[^0-9.]//g' | cut -d. -f1)
    if [ "$NODE_VER" -ge 20 ]; then
        ok "Node.js $(node --version)"
    else
        fail "Node 20+ required (found $(node --version))"
        MISSING=1
    fi
else
    fail "Node.js 20+ not found"
    MISSING=1
fi

# npm
if command -v npm &>/dev/null; then
    ok "npm $(npm --version)"
else
    fail "npm not found"
    MISSING=1
fi

# Docker
if command -v docker &>/dev/null; then
    ok "Docker $(docker --version | sed 's/[^0-9.]//g' | cut -d. -f1-3)"
else
    fail "Docker not found — needed for make up"
    MISSING=1
fi

# Docker Compose
if docker compose version &>/dev/null 2>&1; then
    ok "Docker Compose $(docker compose version --short 2>/dev/null || echo 'available')"
else
    warn "Docker Compose not found — needed for make up (install docker-compose-plugin)"
fi

# uv (Python package manager)
if command -v uv &>/dev/null; then
    ok "uv $(uv --version 2>&1 | sed 's/[^0-9.]//g' || echo 'available')"
else
    warn "uv not found — installing..."
    if command -v pip &>/dev/null; then
        pip install uv --quiet
        ok "uv installed via pip"
    elif command -v pip3 &>/dev/null; then
        pip3 install uv --quiet
        ok "uv installed via pip3"
    else
        fail "Cannot install uv. Install manually: pip install uv"
        MISSING=1
    fi
fi

# gh CLI (optional — needed for GEBCO download and render backup)
if command -v gh &>/dev/null; then
    ok "GitHub CLI $(gh --version | head -1 | sed 's/[^0-9.]//g')"
else
    warn "GitHub CLI not found — optional but needed for: make gebco-download, make backup/restore"
    warn "  Install: https://cli.github.com"
fi

echo ""
if [ "$MISSING" -gt 0 ]; then
    fail "Missing prerequisites. Install them and re-run this script."
    exit 1
fi
ok "All prerequisites satisfied"
echo ""

# ──────────────────────────────────────────────────
# 2. Python dependencies
# ──────────────────────────────────────────────────

info "Installing Python dependencies (pipeline)..."
cd pipeline
if [ -f "uv.lock" ]; then
    uv sync --frozen
else
    uv sync
fi
cd ..
ok "Pipeline Python deps installed"

# ──────────────────────────────────────────────────
# 3. Node dependencies
# ──────────────────────────────────────────────────

info "Installing Node dependencies (renderer)..."
cd pipeline/src/oceancanvas/renderer
npm install --silent
cd ../../../..
ok "Renderer Node deps installed"

info "Installing Node dependencies (gallery)..."
cd gallery
npm install --silent
cd ..
ok "Gallery Node deps installed"

# ──────────────────────────────────────────────────
# 4. Local config
# ──────────────────────────────────────────────────

info "Setting up local config..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    ok "Created .env from .env.example"
else
    ok ".env already exists (keeping current)"
fi

# ──────────────────────────────────────────────────
# 5. Runtime directories
# ──────────────────────────────────────────────────

info "Creating runtime directories..."
mkdir -p data/sources data/processed data/gebco renders
ok "Runtime directories ready (data/, renders/)"

# ──────────────────────────────────────────────────
# 6. GEBCO bathymetry
# ──────────────────────────────────────────────────

info "Checking GEBCO bathymetry data..."
if [ -f "data/gebco/gebco_subset.nc" ]; then
    ok "GEBCO data already present"
elif command -v gh &>/dev/null; then
    info "Downloading GEBCO subset from GitHub Release..."
    gh release download gebco-v1 --pattern '*.nc' --dir data/gebco 2>/dev/null && \
        ok "GEBCO data downloaded" || \
        warn "No GEBCO release found yet. Create one when the subset is ready."
else
    warn "Skipping GEBCO download (gh CLI not installed)"
fi

# ──────────────────────────────────────────────────
# 7. Copy shared schema to gallery
# ──────────────────────────────────────────────────

info "Copying shared recipe schema to gallery..."
mkdir -p gallery/src/schemas
cp pipeline/src/oceancanvas/schemas/recipe-schema.json gallery/src/schemas/
ok "Recipe schema copied to gallery"

# ──────────────────────────────────────────────────
# 8. Validation
# ──────────────────────────────────────────────────

echo ""
info "Validating setup..."
echo ""

VALID=1

# Python package importable
if cd pipeline && uv run python -c "import oceancanvas; print(f'  oceancanvas v{oceancanvas.__version__}')" 2>/dev/null; then
    ok "Pipeline package imports correctly"
else
    fail "Pipeline package import failed"
    VALID=0
fi
cd ..

# Renderer node_modules present
if [ -d "pipeline/src/oceancanvas/renderer/node_modules/puppeteer-core" ]; then
    ok "Renderer Puppeteer installed"
else
    fail "Renderer node_modules missing"
    VALID=0
fi

# Gallery node_modules present
if [ -d "gallery/node_modules/react" ]; then
    ok "Gallery React installed"
else
    fail "Gallery node_modules missing"
    VALID=0
fi

# Recipe schema present in both locations
if [ -f "pipeline/src/oceancanvas/schemas/recipe-schema.json" ] && \
   [ -f "gallery/src/schemas/recipe-schema.json" ]; then
    ok "Recipe schema in both pipeline and gallery"
else
    fail "Recipe schema missing from one location"
    VALID=0
fi

# Sample recipe exists
if [ -f "recipes/north-atlantic-sst.yaml" ]; then
    ok "Sample recipe present"
else
    warn "No sample recipe found"
fi

echo ""

if [ "$VALID" -eq 1 ]; then
    echo "  ╔══════════════════════════════════════╗"
    echo "  ║          Setup complete ✓             ║"
    echo "  ╚══════════════════════════════════════╝"
    echo ""
    echo "  Next steps:"
    echo ""
    echo "    make up            Start the full stack (4 containers)"
    echo "    make gallery-dev   Start Vite dev server (hot reload)"
    echo "    make pipeline-run  Trigger a manual pipeline run"
    echo "    make help          See all available targets"
    echo ""
    echo "  Prefect UI:   http://localhost:4200"
    echo "  Gallery:      http://localhost:8080"
    echo "  Vite (dev):   http://localhost:5173"
    echo ""
else
    fail "Setup completed with errors. Check the messages above."
    exit 1
fi
