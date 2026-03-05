# Agent Communication Protocol
Project: Global Classroom Radio

This document defines how agents communicate and collaborate within the project.

All agents communicate ONLY through the Project Manager (PM).

Agents never communicate directly with each other.

System Structure:

User -> Project Manager -> Specialist Agents

Agents involved in this project:

PM — Project Manager
ARCH — Architecture Agent
UI — UI/UX Agent
FE — Frontend Agent
DATA — Data/API Agent
SAFE — Safety & Filtering Agent
QA — Testing Agent

---

## Communication Rules

1. All work must originate from the Kernel Task Board.

2. Agents only execute tasks assigned by the PM.

3. Each task assignment must include:
- Task ID
- Goal
- Deliverables
- Acceptance Criteria

4. Agents must return structured responses using one of the approved headers:
- `STATUS UPDATE` (work in progress)
- `TASK COMPLETE` (task done)

Required response body fields:
- Task ID:
- Agent:
- Files Created/Modified:
- Summary:
- Next Risks or Notes:

5. If an agent requires clarification, they must ask the PM only.

Example:

QUESTION FOR PM:
Clarify expected API filtering logic for children-safe radio stations.

---

## Agent Responsibilities

### PM — Project Manager
Coordinates the entire system.

Responsible for:
- Task creation
- Task prioritization
- Agent assignment
- Gate approvals

PM does not execute specialist task work.

---

### ARCH — Architecture Agent
Responsible for system structure.

Responsibilities:
- Folder structure
- Data flow design
- Component hierarchy
- State management approach

---

### UI — UI/UX Agent
Responsible for interface design.

Responsibilities:
- Layout
- Interaction patterns
- UI components
- Visual hierarchy
- Accessibility

---

### FE — Frontend Agent
Responsible for implementing the interface.

Responsibilities:
- React components
- Audio player
- Filters and controls
- State management
- Responsive layout

---

### DATA — Data/API Agent
Responsible for external data systems.

Responsibilities:
- Radio Browser API integration
- Request optimization
- Caching
- Data normalization

---

### SAFE — Safety Agent
Responsible for content safety.

Responsibilities:
- Filtering rules
- Tag filtering
- Whitelist system
- Classroom mode restrictions

---

### QA — Quality Agent
Responsible for validation.

Responsibilities:
- Test scenarios
- Edge cases
- Stability of audio playback
- UI behavior validation

---

## Task Board Authority

The Kernel Task Board is the Single Source of Truth.

Agents cannot create their own tasks.

Only the PM may modify the Kernel Task Board.

---

## Gate Structure

G1 — Architecture Stable
G2 — API Integration Complete
G3 — Classroom Mode Working
G4 — MVP Ready

Agents may not proceed beyond a Gate until approved.

---

## Communication Format

Use this exact skeleton for `STATUS UPDATE` and `TASK COMPLETE`:

Task ID:
Agent:
Files Created/Modified:
Summary:
Next Risks or Notes:

---

This protocol ensures predictable collaboration between AI agents and keeps the system organized.

---

## Active Change Requests

### CR1 — Discovery Coverage and Filter Yield Improvement

Objective:
- Increase station result coverage so filtered combinations (for example `Language=German` + `safe-only`) do not produce avoidable false-zero results.

Constraint:
- Work must still map to Kernel task ownership and acceptance areas:
  - DATA/T2 scope for API retrieval strategy
  - SAFE/T4 scope for safe-tag matching rules
  - FE/T3+T8 scope for filter/discovery UX and state behavior
  - QA/T9 scope for validation

PM dispatch order for CR1:
1. ARCH
- Validate architecture impact for larger API result sets and client-side/state implications.
- Recommend fetch strategy boundary (pagination, limit windows, caching approach).

2. DATA
- Implement improved API retrieval strategy (broader coverage than current single small sample).
- Add safe failure handling for larger fetch plans and endpoint variability.
- Return evidence of improved candidate-set breadth.

3. SAFE
- Review and refine safe-tag matching policy to reduce false negatives (including common tag variants where appropriate).
- Keep classroom-safety intent strict while improving recall.

4. FE
- Wire discovery refresh behavior so filter combinations can access broader relevant data.
- Ensure performance remains acceptable and UI state stays predictable.

5. UI
- Refine messaging/controls to communicate result coverage, loading state, and empty-state meaning clearly.

6. QA
- Re-run T9 scenarios plus targeted CR1 checks:
  - high-yield language combinations
  - safe-only with language/country filters
  - regression on whitelist/classroom mode

Required response format (all CR1 dispatches):
TASK COMPLETE
Task ID:
Agent:
Files Created/Modified:
Summary:
Next Risks or Notes:

---

## Task Report Log

TASK COMPLETE
Task ID: T9
Agent: QA
Files Created/Modified:
- None in workspace
- Temp QA harness only: `/tmp/gcr-t9-qa/run-t9-scenarios.mjs`
Summary:
- T9 QA execution completed for discovery, filtering, playback policy logic, whitelist persistence, and classroom mode gating.
- Stability baseline passed: `npm run build`.
- Scenario execution passed:
  - Core suite: 10/10
  - Edge suite: 6/6
  - Discovery service suite: 2/2
- Acceptance criteria status:
  - multiple station playback tested: PASS
  - filtering works: PASS
  - whitelist persists: PASS
Next Risks or Notes:
- Playback start/stop behavior was validated through code-path and scenario execution, but not via full browser-driven audio E2E in this CLI environment.
- Discovery runtime remains dependent on external Radio Browser API availability and network conditions.

## QA Task Reports

TASK COMPLETE
Task ID: T9
Agent: QA
Files Created/Modified:
- None in workspace
- Temp QA harness only: `/tmp/gcr-t9-qa/run-t9-scenarios.mjs`
Summary:
- multiple station playback tested: PASS
- filtering works: PASS
- whitelist persists: PASS
- Additional QA scenario suites passed: core 10/10, edge 6/6, discovery service 2/2.
Next Risks or Notes:
- Playback was validated through logic/state execution paths, not full browser-driven audio E2E.
- Discovery runtime remains dependent on external Radio Browser API availability and network conditions.

### CR2 — Persistent Player Dock and Uzbek Coverage Extension

Objective:
- Keep the audio player always visible while teachers scroll discovery, filters, and whitelist sections.
- Improve player UI to read as a digital radio control surface.
- Add a supplemental free source path for Uzbek station coverage when query intent is Uzbek-focused.

Constraint:
- Work must still map to Kernel ownership and acceptance areas:
  - UI/T8 scope for layout behavior and player presentation
  - FE/T5+T8 scope for persistent player implementation and responsive behavior
  - DATA/T2 scope for supplemental source fetch/merge strategy and error tolerance
  - SAFE/T4 scope for safe-tag compatibility on supplemental station metadata
  - QA/T9 scope for playback/layout regression plus Uzbek-safe discovery checks

PM dispatch order for CR2:
1. UI
- Define persistent bottom-dock player behavior.
- Ensure filter panel and discovery flow remain usable with dock present on desktop/mobile.

2. FE
- Move player from grid panel into persistent bottom dock implementation.
- Preserve existing playback controls/state behavior and accessibility semantics.

3. DATA
- Integrate supplemental free source endpoint for Uzbek-focused queries.
- Merge/de-duplicate supplemental stations with Radio Browser results, and fail safely if source is unavailable.

4. SAFE
- Validate safe-only behavior still applies to supplemental stations.
- Confirm safe-tag canonicalization still blocks false positives.

5. QA
- Run targeted CR2 validation:
  - player remains visible across full-page scrolling
  - mobile layout avoids control overlap
  - Uzbek + safe-only discovery paths return stable non-crashing behavior
  - existing whitelist/classroom mode rules remain intact

Required response format (all CR2 dispatches):
TASK COMPLETE
Task ID:
Agent:
Files Created/Modified:
Summary:
Next Risks or Notes:

### CR3 — Kid-Safe Coverage for Uzbek, Russian, Ukrainian

Objective:
- Ensure Station Discovery returns meaningful results when `safe-only` is enabled and language is set to:
  - Uzbek
  - Russian
  - Ukrainian
- Expand retrieval and safety logic using free-access sources and multilingual kid-safe tags.

Constraint:
- Work must map to Kernel ownership and acceptance areas:
  - DATA/T2 scope for source discovery, request strategy, and merge/de-duplication
  - SAFE/T4 scope for multilingual safe-tag matching policy
  - FE/T3+T8 scope for query behavior and filter/discovery UX states
  - UI/T8 scope for clarity of coverage/empty-state messaging
  - QA/T9 scope for targeted verification of these 3 language paths

Source policy for CR3:
- Prefer free/open sources first:
  1. Radio Browser API (existing primary source)
  2. IPRD catalog/data files (supplemental source)
  3. IPTV-Org public catalog (targeted fallback dataset for kid-category language coverage when radio directories are sparse)
- Any additional source must be documented with:
  - pricing/auth model
  - CORS/browser feasibility
  - reliability risk and fallback path

Known triage signal:
- If `candidate pool` is non-trivial but `safe-only` returns zero for these languages, prioritize SAFE canonicalization checks before assuming source absence.
- Current risk pattern to watch: non-Latin tags/scripts getting dropped by normalization rules.

Localized kid-safe strategy requirement:
- SAFE and DATA must test localized tag variants (not only English safe tags), including script variants where applicable.
- Example variants to evaluate include:
  - Russian: `дети`, `детский`, `для детей`, `семейный`, `образование`, `классическая`, `народная`, `колыбельные`
  - Ukrainian: `діти`, `дитячий`, `для дітей`, `сімейний`, `освіта`, `класична`, `народна`, `колискові`
  - Uzbek: `bolalar`, `bolalar uchun`, `oila`, `ta'lim`, `klassik`, `xalq`, `alla`, plus Cyrillic equivalents when present

PM dispatch order for CR3:
1. DATA (research phase)
- Produce source matrix for Uzbek/Russian/Ukrainian kid-safe discovery yield.
- Confirm free/open viability and endpoint behavior for Radio Browser + IPRD, and evaluate any additional candidate source.

2. SAFE
- Deliver multilingual safe-tag canonicalization proposal and false-positive controls.
- Return exact canonical + alias mapping plan for the 3 target languages.

3. DATA (implementation phase)
- Implement query expansion windows for the 3 target languages using multilingual safe tags.
- Merge/de-duplicate supplemental results and fail safely on source outage.
- Annotate supplemental entries with stream type compatibility (audio-native vs video/HLS) so FE can avoid unplayable audio rows by default.

4. FE
- Wire discovery behavior and state updates so language + safe-only combinations re-query predictably.
- Ensure no regressions in classroom mode and whitelist flows.
- Enforce player compatibility guardrails:
  - default: show/play audio-compatible streams first
  - if supplemental video-only streams are included, clearly mark them and prevent broken playback loops

5. UI
- Improve empty/loading/coverage messaging specifically for the 3 target-language safe-only paths.
- Keep filter panel behavior compact and non-obstructive.

6. QA
- Run CR3 focused suite:
  - `language=Uzbek + safe-only`
  - `language=Russian + safe-only`
  - `language=Ukrainian + safe-only`
  - regression: classroom mode, whitelist persistence, player behavior

Required response format (all CR3 dispatches):
TASK COMPLETE
Task ID:
Agent:
Files Created/Modified:
Summary:
Next Risks or Notes:

### QA Report Template

TASK COMPLETE
Task ID:
Agent: QA
Files Created/Modified:
Summary:
- multiple station playback tested: PASS/FAIL
- filtering works: PASS/FAIL
- whitelist persists: PASS/FAIL
Next Risks or Notes:

TASK COMPLETE
Task ID: CR3
Agent: QA
Files Created/Modified:
- No workspace files modified
- Temp QA harness created/executed: `/tmp/gcr-cr3-qa/run-cr3-suite.mjs`
Summary:
- CR3 focused suite:
  - `language=Uzbek + safe-only`: PASS
  - `language=Russian + safe-only`: PASS
  - `language=Ukrainian + safe-only`: PASS
- Regression suite:
  - classroom mode behavior: PASS
  - whitelist persistence: PASS
  - player behavior: PASS
- multiple station playback tested: PASS
- filtering works: PASS
- whitelist persists: PASS
- Build check: `npm run build` PASS
Next Risks or Notes:
- CR3 endpoint behavior was validated with deterministic mocked fetch flows in this restricted environment; live-network yield can vary by source availability and time.
- Recommended follow-up in unrestricted network: verify live endpoint candidate yield and playable stream quality for Uzbek/Russian/Ukrainian safe-only paths.
