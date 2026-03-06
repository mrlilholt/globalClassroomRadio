# Global Classroom Radio - Project Overview

Last Updated: 2026-03-05

## Purpose
Build a web application for classroom-safe global radio playback.
Teachers can discover stations, preview streams, and whitelist safe stations.
When classroom mode is enabled, playback is restricted to approved stations only.

## Single Source of Truth
- Primary architecture + task board: `kernel.md`
- Agent coordination protocol: `agentCom.md`
- This file: cross-functional project snapshot and onboarding reference

## Product Architecture
- Frontend: React + Vite
- Hosting: Netlify (`netlify.toml` + `public/_redirects`)
- Audio: HTML5 Audio preview player with persistent bottom dock controls
- Data: Radio Browser API + supplemental IPRD country feed for Uzbek-focused discovery (`api.radio.iprd.org`)
- Persistence: LocalStorage for whitelist (`src/services/localStorageService.ts`)

## Current Implementation Snapshot
Implemented now:
- App shell and state container (`src/app`, `src/state`)
- Station discovery via `RadioBrowserStationService` with endpoint failover
- Supplemental targeted discovery merge paths from IPRD country feeds for Uzbek/Russian/Ukrainian/Tajik/Portugal-focused queries
- Filters for country/language/tags with dynamic updates
- Safe-only tag toggle using canonical safe tags plus multilingual variants (Uzbek/Russian/Ukrainian) and Unicode-safe normalization
- HTML5 audio preview controls with single active player behavior and persistent bottom dock placement
- Whitelist save/remove actions with persisted saved station view
- Classroom mode toggle + policy guardrails across discovery and playback
- T8 visual refinement pass across filter, discovery, player, and saved-stations panels
- Categorized discovery error handling with retry path
- Netlify build compatibility confirmed (`npm run build` passes)

Not implemented yet (per kernel goals):
- None for MVP scope. T1-T9 are complete.

## Task Status Snapshot (Operational)
Kernel task IDs remain authoritative; this is a working status estimate:
- T1: Complete
- T2: Complete (code/build verified; live endpoint calls require unrestricted network for runtime verification)
- T3: Complete (UI alignment validated)
- T4: Complete (safe tag rules + safe-only toggle wired and active in station result filtering)
- T5: Complete (HTML5 audio preview controls + discovery selection wiring + single active player flow)
- T6: Complete (save/remove whitelist actions + saved list view + LocalStorage persistence)
- T7: Complete (classroom mode locks discovery interactions and enforces whitelist-only playback)
- T8: Complete (UI refinement pass delivered for filter controls, station list, player, and saved stations)
- T9: Complete (QA validation report completed; MVP acceptance criteria verified)

## Known Risks
1. External API dependency risk: Radio Browser availability/timeouts can block discovery.
2. Supplemental source dependency risk: IPRD country feed availability/schema changes can reduce Uzbek supplemental yield.
3. Whitelist metadata risk: saved station IDs may appear without full station details until discovery data is loaded.
4. Network-constrained validation risk: full live endpoint QA is blocked in restricted environments without outbound access.

## Supporting References
- Architecture skeleton: `docs/architecture.md`
- UI T3 spec (moved from this file): `docs/T3-ui-spec.md`
- T8 refinement notes: `docs/T8-ui-refinement.md`
- T9 QA report: `docs/T9-qa-report.md`
- T2 technical notes: `docs/T2-error-handling-notes.md`
- T7 classroom policy notes: `docs/T7-classroom-policy-notes.md`
- T2 verification script: `scripts/verify-t2.mjs`
