# CR1 Architecture Impact and Discovery Coverage Boundary

Last Updated: 2026-03-05
Owner: ARCH

## Context

CR1 requires higher discovery coverage so combinations like `language + safe-only` avoid false-zero outcomes caused by undersampling.

As of 2026-03-05, discovery retrieval has already moved to a windowed aggregation model in `src/services/stationService.ts`. This document now acts as both boundary definition and architecture status for the remaining CR1 dispatch steps.

## Current Implementation Snapshot (ARCH verification)

Implemented now:
- Multi-window fetch plan with dedupe by `stationuuid`
- Bounded execution profile:
  - max windows: 6
  - per-window limit: 100-220 (default 180)
  - concurrency: 2 windows
  - absolute pool cap: 1200 stations
- Cache and refresh policy:
  - TTL: 7 minutes
  - stale-while-refresh behavior
  - max cache keys: 12
- Coverage metadata available from service:
  - `cacheStatus`
  - `windowCount`
  - `failedWindowCount`
  - `candidateCount`
  - `refreshedAt`
- Safe-tag variant policy (strict alias map) applied for:
  - station safety classification in `filterEngine`
  - safe-seed query normalization in discovery fetch planning (`safe-v2`)

Remaining architecture-aligned work for CR1:
- FE/UI: surface coverage metadata and clearer discovery-yield messaging
- QA: run targeted CR1 yield and regression matrix

## Architecture Impact Assessment

### 1. Candidate-set breadth is now a first-class concern

- Single fixed-size requests do not provide stable recall for targeted filter combinations.
- Discovery now aggregates across multiple fetch windows and dedupes by `stationuuid`.

### 2. Client-side derived filtering remains valid

- Existing `filterEngine` and state model can remain the source for interactive filtering.
- Improvement target is upstream candidate acquisition, not a rewrite of local filter logic.

### 3. Network and memory cost increase is expected and must be bounded

- Larger candidate pools improve recall but increase request volume and processing time.
- Explicit hard limits are required to protect UI responsiveness.

### 4. Data flow should support stale-while-refresh behavior

- Cached candidate pools should be shown immediately when available.
- Background refresh should replace cache atomically to avoid UI thrash.

## Recommended Fetch Strategy Boundary (for DATA implementation)

Define discovery retrieval as **windowed aggregation**:

1. Build an ordered fetch plan of query windows.
2. Execute windows with bounded concurrency.
3. Normalize + dedupe into a single candidate pool.
4. Return pool + coverage metadata.
5. Cache by plan key for short TTL.

### Window Types

- `global-top`: broad baseline window for popular stations.
- `country-focused`: added when country filter is set.
- `language-focused`: added when language filter is set.
- `safe-tag-focused`: one window per canonical safe tag when safe-only mode is active and recall is low.

### Execution Limits

- Per-window limit cap: 150-250 stations.
- Max windows per fetch cycle: 6.
- Concurrency: 2-3 windows in parallel.
- Absolute post-dedupe station cap in memory: 1200.
- Request timeout: reuse existing endpoint timeout policy.

### Cache Boundary

- Cache key dimensions:
  - country
  - language
  - safe-only state
  - safe-tag strategy version
- TTL target: 5-10 minutes.
- Stale-while-refresh: allowed.
- Eviction target: keep only most-recent 10-20 keys.

## State and UI Implications (for FE/UI)

No global state rewrite is required. Additive metadata is recommended:

- `coverageStatus`: `loading | partial | complete | error`
- `coverageWindowCount`: number
- `candidateCount`: number
- `lastRefreshAt`: epoch ms

UI should expose coverage clarity:

- "Loaded from cache" vs "Updated just now"
- "Coverage expanded" messaging when additional windows were fetched
- Empty-state copy should distinguish "no matches" from "limited coverage due to failures"

## Safety Policy Implications (for SAFE)

- Safety filtering remains deterministic and local via `SAFE_TAGS` matching policy.
- CR1 should not loosen classroom restrictions.
- Any safe-tag variant expansion must be explicit and versioned.

## Validation Targets (for QA)

- Compare candidate counts before/after windowed aggregation for language-specific filters.
- Verify safe-only + language/country combinations no longer fail due to undersampling where data exists.
- Ensure classroom mode and whitelist gating regressions do not occur.

## Handoff Contract Summary

- DATA owns fetch-plan execution, failover, and caching implementation.
- FE owns coverage metadata rendering and deterministic local filter application.
- SAFE owns tag-policy recall tuning while preserving strict safety intent.
- QA owns CR1 regression and yield validation matrix.
