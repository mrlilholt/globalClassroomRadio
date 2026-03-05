# T7 Classroom Mode Policy Notes

Last Updated: 2026-03-04

## Policy Rules

1. Classroom mode ON disables discovery interactions.
2. Classroom mode ON allows playback only for whitelisted stations.
3. Classroom mode transitions must clear any non-whitelisted selected station.

## Enforced Service Contracts

- `src/services/classroomGuard.ts`
  - `isDiscoveryDisabled(classroomMode)`: canonical discovery lock rule.
  - `canPlayStation({ stationId, classroomMode, whitelistIds })`: whitelist-only playback rule.
  - `evaluateClassroomPolicy(...)`: FE guard decision for interaction lock + whitelist playback.
  - `enforceClassroomSelection(...)`: reducer-side safety for selection transitions.

## State Enforcement

- `src/state/appState.ts`
  - `SET_CLASSROOM_MODE`: revalidates selected station with `enforceClassroomSelection`.
  - `SET_SELECTED_STATION`: selection is blocked if classroom policy disallows it.
  - `SET_WHITELIST`: revalidates selected station when whitelist changes.

## FE Disablement Behavior

- `StationFilterPanel`
  - Disable safe toggle and all filter controls while classroom mode is active.
  - Show lock-state messaging that discovery filters are unavailable.

- `StationDiscoveryPanel`
  - Hide interactive discovery results while classroom mode is active.
  - Show lock-state message directing users to the whitelist panel.
  - Retry/Clear actions are unavailable in classroom mode.

- `WhitelistPanel`
  - Keep whitelist visible and usable.
  - Provide station selection from whitelist for preview/playback path.

- `PlayerPanel`
  - Disable Play action if selected station fails classroom policy.
  - Display explicit blocked-state reason for non-whitelisted selections.
