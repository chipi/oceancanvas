# PRD-003: Recipe System

- **Status**: Draft
- **Related RFCs**: `docs/rfc/RFC-001-recipe-yaml-schema.md`
- **Related ADRs**: `docs/adr/ADR-004-no-database-v1.md`
- **Source**: OC-02 Section 1 (The concept), OC-04 Section recipes/

## Summary

A recipe is the core creative artifact of OceanCanvas — a YAML file that defines how a specific ocean variable, from a specific region, becomes a daily art render. The recipe system covers the YAML format, the recipes/ directory structure, how the pipeline discovers active recipes, and the Phase 1 management operations (create, save, delete).

## Background & Context

The recipe is what separates OceanCanvas from a monitoring dashboard. A recipe is authored once and then renders automatically every day. The user's creative decision — which data, which region, which visual treatment — is encoded in a YAML file that the pipeline reads daily. The recipe is both a creative document and a technical specification.

## Goals

- Define a YAML schema for recipes that is both human-readable and machine-parseable
- Enable the pipeline to discover all active recipes automatically from the recipes/ directory
- Support Phase 1 recipe operations: create from the editor, save, delete
- Make recipes committable to git — a recipe saved is a recipe versioned

## Non-Goals

- Recipe renaming, archiving, duplicating, or version history — deferred to later phase
- Recipe sharing or public recipe discovery — deferred
- Recipe validation UI (showing errors in the editor) — basic validation only in Phase 1

## User Stories

- *As a user, I can save a recipe from the editor and have the pipeline pick it up on the next daily run without any additional steps.*
- *As a self-hoster, I can commit recipes to git and share them — anyone who clones the repo gets all my recipes.*
- *As a developer, I can read a recipe YAML and understand exactly what it will render without running the pipeline.*

## Functional Requirements

### FR1: YAML schema

- **FR1.1**: Each recipe is a single YAML file in `recipes/{recipe_name}.yaml`
- **FR1.2**: Required fields: `name`, `region` (lat/lon bounds), `sources` (primary, context, audio), `render` (type + style parameters), `schedule`
- **FR1.3**: The full schema is defined in RFC-001
- **FR1.4**: `recipe_name` is the filename without extension — used as the folder name for renders

### FR2: Pipeline discovery

- **FR2.1**: Task 01 (Discover) reads all `*.yaml` files in `recipes/` to determine active recipes
- **FR2.2**: A recipe is active if it exists in `recipes/` and is not marked `active: false`
- **FR2.3**: New recipes are picked up automatically on the next pipeline run after the YAML is saved

### FR3: Render output path

- **FR3.1**: Renders are written to `renders/{recipe_name}/{YYYY-MM-DD}.png`
- **FR3.2**: The recipe name in the YAML `name` field must match the filename (validated at pipeline start)

### FR4: Phase 1 management

- **FR4.1**: Create: the recipe editor generates and saves the YAML to `recipes/`
- **FR4.2**: Delete: removing the YAML from `recipes/` stops future renders; past renders in `renders/` are preserved
- **FR4.3**: No rename, archive, or duplicate operations in Phase 1

## Success Metrics

- A recipe saved from the editor is rendered on the next pipeline run without additional steps
- The pipeline correctly discovers all recipes in `recipes/` including newly added ones
- Recipe YAML is human-readable without documentation

## Dependencies

- RFC-001: Recipe YAML schema (the authoritative format specification)
- PRD-006: Recipe editor studio (the UI that creates recipes)

## Release Checklist

- [ ] RFC-001 completed and recipe YAML schema finalised
- [ ] Pipeline discovers and renders all recipes in recipes/ directory
- [ ] Recipe editor saves valid YAML that the pipeline can parse
- [ ] At least one complete recipe renders end to end
