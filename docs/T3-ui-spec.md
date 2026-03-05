# UI Task Spec: T3 Station Filters

## Scope
This document covers PM-assigned task `T3` only:
- Define filter control interaction design
- Define layout specs for filter UI
- Define accessibility notes for filter behavior

`T8` refinement work is listed as deferred notes only.

## T3 Alignment Validation (2026-03-04)

Acceptance criteria check:

1. UI filter controls for country, language, tags
- Status: Met
- Implemented in:
  - `src/features/filters/components/StationFilterPanel.tsx`
  - `src/services/filterEngine.ts`

2. Results update dynamically
- Status: Met
- Implemented in:
  - `src/features/stations/components/StationDiscoveryPanel.tsx`
  - `src/state/appState.ts`

T3 FE blockers:
- None identified for acceptance criteria.

## Filter Controls
Required controls for station discovery:

1. Country filter
- Type: single-select dropdown (`<select>`)
- Default: `All countries`
- Source: unique country values from loaded station dataset

2. Language filter
- Type: single-select dropdown (`<select>`)
- Default: `All languages`
- Source: unique language values from loaded station dataset

3. Tag filter
- Type: multi-select chip combobox
- Default: no tags selected
- Behavior: users can select multiple tags; selected tags render as removable chips

4. Clear filters action
- Type: tertiary button
- Label: `Clear all`
- Behavior: resets country, language, and tags to defaults in one action

## Dynamic Results Behavior

### Update trigger
- Results update immediately on every filter change with no submit button.

### Matching logic
- Apply `AND` across filter groups:
  - country must match selected country (if selected)
  - language must match selected language (if selected)
  - tags must include at least one selected tag (if any selected)
- Apply `OR` within selected tags:
  - selecting `kids` + `education` returns stations matching either tag

### Feedback behavior
- Station list re-renders in-place.
- Results summary text updates live:
  - Example: `42 stations shown`
- Empty state appears when no matches:
  - Message: `No stations match these filters.`
  - Secondary action: `Clear all`

## Layout Specs

### Desktop (>= 1024px)
- Filter bar is a single horizontal row above station list.
- Control order (left to right):
  - Country
  - Language
  - Tags
  - Clear all
- Spacing:
  - 16px horizontal gaps between controls
  - 16px top/bottom padding around filter section
- Filter section remains visible at top of content area during list scroll.

### Tablet (768px-1023px)
- Two-row filter layout:
  - Row 1: Country, Language
  - Row 2: Tags, Clear all
- 12px control gaps
- Keep filter area above list, non-modal.

### Mobile (< 768px)
- Controls remain inline and stack to a single column.
- Control order:
  - Country
  - Language
  - Tags
  - Clear all
- No modal or bottom-sheet behavior in T3.

## Accessibility Notes

1. Labels and semantics
- Every control has visible label text and associated programmatic label.
- Use native `<select>` where possible for country/language.
- Tag combobox must expose selected values to screen readers.

2. Keyboard behavior
- Full keyboard operability for all controls.
- Logical tab sequence follows visual order.

3. Live updates and announcements
- Result count region uses polite live announcement so screen readers are informed after filtering.
- Empty state is announced when list becomes empty.

4. Focus management
- On any filter change, keep focus on active control.
- On `Clear all`, return focus to first filter control.

5. Contrast and target size
- Minimum 4.5:1 text contrast.
- Minimum 44x44px touch targets for controls and chip remove buttons.

## Implementation Contract for FE (T3)
- FE should expose filter state as:
  - `country: string | null`
  - `language: string | null`
  - `tags: string[]`
- FE should compute `filteredStations` as derived state from base dataset and filter state.
- FE should avoid full page reloads; update station list reactively in component state.

## Deferred to T8 (Refinement Pass)
Not implemented in T3 scope:
- Visual polish and alignment consistency across:
  - filter controls
  - station list cards
  - player interface
  - saved station view
- Searchable country/language controls (if retained as UX direction)
- Mobile filters as collapsed entry point + bottom sheet flow
- Typography, spacing scale normalization, and final responsive polish
- Final design QA pass for cross-screen consistency
