# CR3 Source Viability Notes

Last Updated: 2026-03-05
Owner: DATA

## Source Matrix

| Source | Pricing/Auth | CORS Feasibility | Reliability Risk | Runtime Role |
| --- | --- | --- | --- | --- |
| Radio Browser API (`de1/fi1/nl1`) | Free, no auth | Browser-usable (`Access-Control-Allow-Origin: *`) | Medium: external endpoint variability/timeouts | Primary discovery source |
| IPRD Country Feed (`api.radio.iprd.org/data/countries/{code}.json`) | Free, no auth | Inconsistent in practice (HTTPS/TLS issues observed; HTTP may return non-JSON landing content) | High: endpoint/schema availability varies | Supplemental country feed merge |
| IPTV-Org Public Catalog (`iptv-org.github.io/api/channels.json` + `streams.json`) | Free, no auth | Browser-usable (`Access-Control-Allow-Origin: *`) | Medium: large payload size, many video/HLS streams | Targeted fallback for sparse CR3 safe-only language paths |

## Fallback Strategy in Runtime

1. Query Radio Browser windows first (multilingual safe-tag expansion where applicable).
2. Merge IPRD country supplemental rows for target-language profiles (`uz`, `ru`, `ua`) when available.
3. If safe-only target-language relevance remains sparse, fetch IPTV-Org kid-category fallback rows and merge/de-dupe.
4. On supplemental source outage, log warning and continue with available sources (no hard failure).

## Compatibility Notes

- Supplemental entries include stream compatibility metadata:
  - `streamType`: `audio-native | hls | video | unknown`
  - `audioCompatible`: boolean
- De-duplication prefers audio-compatible/audio-native variants when duplicate stream identities collide.
