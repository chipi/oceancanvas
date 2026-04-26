# ADR-013: Cloudflare R2 for Production Image Serving

- **Status**: Accepted
- **Related RFCs**: — *(stream A — decided in concept phase, see OC-04)*
- **Related PRDs**: `docs/prd/PRD-007-gallery.md`

## Context & Problem Statement

The gallery serves PNG renders — potentially thousands of images as recipes accumulate over time. Serving them from the VPS directly creates bandwidth costs, latency for distant users, and no CDN caching.

## Decision

Use Cloudflare R2 for render image storage and serving in production. Start with local disk + Caddy in development and Phase 1. Move to R2 when going public.

## Rationale

Cloudflare R2 has zero egress fees — images served globally cost only storage (not bandwidth). Cloudflare's CDN sits in front automatically. R2 is S3-compatible so the pipeline write path needs no change (just swap the destination).

## Alternatives Considered

1. **AWS S3 + CloudFront**
   - **Pros**: Largest ecosystem, well-documented
   - **Cons**: Egress fees from S3 to CloudFront (~$0.09/GB). For a public gallery with thousands of images, egress costs accumulate.
   - **Why Rejected**: R2's zero-egress model is strictly better for this use case.

2. **Self-hosted from VPS**
   - **Pros**: No external dependency
   - **Cons**: Bandwidth costs from VPS providers are significant. No CDN — all requests hit the VPS.
   - **Why Rejected**: Acceptable for Phase 1 development, not for public production.

## Consequences

**Positive:**
- Zero egress fees regardless of traffic
- Global CDN built-in
- S3-compatible API — pipeline write path unchanged

**Neutral:**
- R2 activation required before public launch — not needed in Phase 1

## Implementation Notes

Phase 1: renders served from `renders/` by Caddy on localhost. Production: pipeline writes PNGs to R2 bucket, gallery reads from R2 public URL. R2 bucket name: `oceancanvas-renders`.
