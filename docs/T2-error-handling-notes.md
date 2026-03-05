# T2 Error Handling Notes (Radio Browser Integration)

Last Updated: 2026-03-05

## Current Runtime Status

- Application runtime now uses `RadioBrowserStationService` in:
  - `src/services/stationService.ts`
- API client failover and categorized errors are implemented in:
  - `src/services/radioBrowserClient.ts`
- Discovery retrieval now uses bounded windowed aggregation + dedupe + cache:
  - max windows: 6
  - per-window limit: 100-220 (default 180)
  - concurrency: 2
  - post-dedupe cap: 1200 stations
  - cache TTL: 7 minutes (stale-while-refresh, max 12 keys)

This file defines current T2 behavior and verification expectations.

## Verification Script

- Script: `scripts/verify-t2.mjs`
- Purpose: validate endpoint reachability and required fields (`name`, `country`, `language`, stream URL)
- Strategy:
  - Multi-endpoint failover (`de1`, `fi1`, `nl1`)
  - 10s timeout per endpoint
  - Normalization to safe defaults
  - Filters out records without a usable stream URL

## Error Categories

Recommended categorized handling for DATA implementation:

- `network`: request could not connect to endpoint
- `timeout`: endpoint did not respond before timeout
- `http`: endpoint responded with non-2xx status
- `parse`: response body was not valid JSON
- `schema`: payload shape was valid JSON but not expected array/object shape

## Data Normalization Requirements

For each station item:
- `name`: default to `Unknown` when missing/blank
- `country`: default to `Unknown` when missing/blank
- `language`: default to `Unknown` when missing/blank
- stream URL: prefer `url_resolved`; filter out stations with empty stream URL
- stream compatibility metadata:
  - `streamType`: `audio-native | hls | video | unknown`
  - `audioCompatible`: true for audio-compatible sources, false for known video/HLS-only streams
  - `source` + `supplemental`: identifies primary vs merged supplemental entries

## UI Error Exposure Requirements

When wiring app runtime service:
- Show concise user-facing error in discovery panel when request fails
- Preserve debug detail in logs for endpoint + category + status
- Keep UI responsive with retry path
