FROM python:3.12-slim

WORKDIR /app

# System deps: Node.js + Chromium for renderer
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm wget \
    chromium \
    libhdf5-dev libnetcdf-dev \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Python deps
COPY pipeline/pyproject.toml ./
RUN pip install uv && uv sync --frozen 2>/dev/null || pip install -e ".[dev]"

# Node renderer deps
COPY pipeline/src/oceancanvas/renderer/package.json \
     pipeline/src/oceancanvas/renderer/package-lock.json* \
     ./src/oceancanvas/renderer/
RUN cd src/oceancanvas/renderer && npm ci --omit=dev 2>/dev/null || npm install

# Application code
COPY pipeline/src/ ./src/

# Sketches (shared, from repo root — accessible because build context is repo root)
COPY sketches/ /sketches/
