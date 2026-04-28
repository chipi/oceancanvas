.PHONY: help setup up down logs restart \
        pipeline-install pipeline-lint pipeline-test pipeline-test-int pipeline-run pipeline-shell \
        gallery-install gallery-lint gallery-test gallery-dev gallery-build \
        render-test build build-pipeline build-gallery \
        ci e2e clean format lint docs-check \
        gebco-download backup restore

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Setup ─────────────────────────────────────────

setup: gebco-download pipeline-install gallery-install ## First-time setup

gebco-download: ## Download GEBCO subset from GitHub Release
	@mkdir -p data/gebco
	@echo "Downloading GEBCO subset..."
	gh release download gebco-v1 --pattern '*.nc' --dir data/gebco 2>/dev/null || \
		echo "⚠ No GEBCO release found. Create one with: gh release create gebco-v1 gebco_subset.nc"

# ── Full stack ────────────────────────────────────

up: ## Start all services (docker compose up -d)
	docker compose up -d

down: ## Stop all services
	docker compose down

logs: ## Follow all container logs
	docker compose logs -f

restart: down up ## Restart all services

# ── Pipeline (Python) ─────────────────────────────

pipeline-install: ## Install pipeline Python dependencies
	cd pipeline && uv sync --extra dev

pipeline-lint: ## Lint pipeline code
	cd pipeline && uv run ruff check src/ tests/ && uv run ruff format --check src/ tests/

pipeline-test: ## Run pipeline unit tests
	cd pipeline && uv run pytest tests/unit/ -v

pipeline-test-int: ## Run pipeline integration tests
	cd pipeline && uv run pytest tests/integration/ -v

pipeline-run: ## Trigger a manual pipeline run
	docker compose exec pipeline python -m oceancanvas.flow

pipeline-shell: ## Open a Python shell with pipeline deps
	cd pipeline && uv run python

# ── Gallery (React) ───────────────────────────────

gallery-install: ## Install gallery npm dependencies
	cd gallery && npm install

gallery-lint: ## Lint gallery code
	cd gallery && npx prettier --check "src/**/*.{ts,tsx,css}" && npx eslint src/

gallery-test: ## Run gallery tests
	cd gallery && npx vitest run

gallery-dev: ## Start Vite dev server (port 5173)
	cd gallery && npx vite

gallery-build: ## Build gallery for production
	cp pipeline/src/oceancanvas/schemas/recipe-schema.json gallery/src/schemas/
	cd gallery && npm run build

# ── Renderer (Node) ──────────────────────────────

render-test: ## Run renderer tests
	cd pipeline/src/oceancanvas/renderer && npm test

# ── Docker ────────────────────────────────────────

build: ## Build all Docker images
	docker compose build

build-pipeline: ## Build pipeline image only
	docker build -t oceancanvas-pipeline -f pipeline/Dockerfile .

build-gallery: ## Build gallery image only
	docker build -t oceancanvas-gallery gallery/

# ── CI-equivalent (run locally) ──────────────────

ci: lint pipeline-test gallery-test render-test build e2e ## Run full CI locally

e2e: ## Run end-to-end tests via Docker Compose
	docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from e2e
	docker compose -f docker-compose.test.yml down

# ── Utilities ─────────────────────────────────────

clean: ## Remove generated files
	rm -rf data/processed/ renders/ pipeline/src/oceancanvas/__pycache__/ gallery/dist/

format: ## Auto-format all code
	cd pipeline && uv run ruff format src/ tests/
	cd gallery && npx prettier --write "src/**/*.{ts,tsx,css}"

lint: pipeline-lint gallery-lint ## Lint all code

backup: ## Backup renders to GitHub Release
	@tar czf renders-backup-$$(date +%Y%m%d).tar.gz renders/ 2>/dev/null || echo "No renders to backup"
	@gh release create backup-$$(date +%Y%m%d) \
		renders-backup-$$(date +%Y%m%d).tar.gz \
		--title "Renders backup $$(date +%Y-%m-%d)" \
		--notes "Automated renders backup" 2>/dev/null && \
		rm -f renders-backup-*.tar.gz || \
		echo "⚠ Backup failed. Is gh CLI authenticated?"

restore: ## Restore renders from latest GitHub Release backup
	@LATEST=$$(gh release list --limit 10 --json tagName -q '.[].tagName' | grep backup | head -1); \
	if [ -n "$$LATEST" ]; then \
		gh release download "$$LATEST" --pattern '*.tar.gz' && \
		tar xzf renders-backup-*.tar.gz && \
		rm -f renders-backup-*.tar.gz && \
		echo "✓ Restored from $$LATEST"; \
	else \
		echo "⚠ No backup found"; \
	fi
