# Global Classroom Radio - T1 Architecture Skeleton

## Project Structure

- `src/app`: root application composition (`AppShell`)
- `src/components/layout`: shared top-level layout components
- `src/features/stations`: station discovery feature boundary
- `src/features/filters`: filter feature boundary
- `src/features/player`: audio playback feature boundary
- `src/features/whitelist`: teacher whitelist feature boundary
- `src/features/classroom`: classroom mode feature boundary
- `src/services`: service contracts and persistence adapters
- `src/state`: global state container (context + reducer)
- `src/types`: shared TypeScript contracts
- `src/constants`: static domain constants (`SAFE_TAGS`)

## Component Hierarchy

`App`
-> `AppStateProvider`
-> `AppShell`
-> `TopBar`
-> `StationFilterPanel`
-> `StationDiscoveryPanel`
-> `PlayerPanel`
-> `WhitelistPanel`
-> `ClassroomModePanel`

## State and Data Flow Outline

1. `AppStateProvider` owns global state through `useReducer`.
2. Feature panels consume state via `useAppState()`.
3. UI actions (T3+) dispatch state transitions via `dispatch`.
4. Discovery module (T2+) will call `StationService.listStations(query)`.
5. Whitelist module (T6+) will sync `whitelistIds` with LocalStorage.
6. Classroom mode module (T7+) will gate discovery/playback based on whitelist.

## Netlify Compatibility

- `netlify.toml` defines build command (`npm run build`) and publish directory (`dist`).
- SPA fallback redirect included in both `netlify.toml` and `public/_redirects`.

## Active Architecture Extensions

- `docs/CR1-architecture-impact.md`: discovery coverage architecture boundary for CR1 (windowed aggregation, cache policy, and FE/SAFE/QA implications).
