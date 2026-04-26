# ADR-016 — Single-author recipes in Phase 1

> **Status** · Accepted
> **Date** · April 2026
> **TA anchor** · §components/data-store · §constraints
> **Related PRDs** — PRD-001 Recipe (this constraint was flagged in its open threads)

## Context

OceanCanvas could plausibly support multi-author recipes — collaborative authorship, shared edits, attribution lists. PRD-001 explicitly defers this question to a future ADR. The deferral itself is a decision worth recording.

The single-author choice has implications across the system: recipe storage (one author field), permissions model (none in Phase 1), gallery attribution (one name), authorship UX (no collaborator-pending states).

## Decision

Phase 1 recipes are single-author. The recipe YAML has one `author` field. There is no collaboration model, no shared editing, no permissions system. A self-hosted instance has one author by definition; a future hosted multi-tenant instance would still treat each recipe as belonging to one author.

## Rationale

- *Self-hostable* — the typical OceanCanvas instance is one person on their machine. Multi-author features add complexity that nobody needs at this scale.
- *Sharp scope* — adding multi-author later is straightforward (extend the schema, add a permissions layer). Removing multi-author features once added is harder. Defer until there's a real pull.
- *Authorship is a creative claim* — a recipe is named, intentional creative work (PA §promises/authored). Single authorship matches this character.

## Alternatives considered

- **Multi-author from day one** — adds a permissions model, an invitation flow, conflict resolution, attribution chains. Significant work for no current users. Rejected.
- **Implicit author (no field at all)** — the recipe has no author. Acceptable for self-hosted but fails when recipes are shared between instances. Rejected.

## Consequences

**Positive:**
- Recipe schema is one field simpler.
- No permissions model needed.
- Gallery attribution is straightforward.

**Negative:**
- A future shift to multi-author requires schema migration and likely an editor refactor. Acceptable; the cost is paid once when the feature genuinely arrives.

## Implementation notes

- Recipe YAML has a top-level `author` field (RFC-001 schema).
- Gallery displays the single author name.
- Self-hosted default: the operating system user who initialised the instance.

## Future trigger

Revisit when:
- Multi-tenant hosting is on the roadmap.
- Real users ask for collaborative authorship.
- A research collaboration use case justifies the permissions model.

When triggered, write a new ADR adopting a multi-author model and supersede this one.
