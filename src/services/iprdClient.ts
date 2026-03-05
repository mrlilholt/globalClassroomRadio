import type { RadioStation } from "../types/radio";
import { detectStreamCompatibility } from "./streamCompatibility";

const IPRD_COUNTRY_DATA_BASE = "https://api.radio.iprd.org/data/countries";
const DEFAULT_TIMEOUT_MS = 10_000;

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function tokenizeCsv(value: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
}

function toDisplayText(value: string): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .split(" ")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function toCountryFallback(code: string): string {
  if (code.toLowerCase() === "uz") {
    return "Uzbekistan";
  }

  return code.toUpperCase() || "Unknown";
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") {
    return tokenizeCsv(value);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => readText(entry))
    .flatMap((entry) => tokenizeCsv(entry));
}

function firstLanguage(value: unknown): string {
  const [language] = collectStringValues(value);
  return toDisplayText(language ?? "");
}

interface StreamCandidate {
  url: string;
  hints: string[];
}

function collectHints(rawStation: Record<string, unknown>): string[] {
  return [
    readText(rawStation.type),
    readText(rawStation.mime),
    readText(rawStation.mimetype),
    readText(rawStation.contentType),
    readText(rawStation.codec),
    readText(rawStation.format),
    readText(rawStation.kind)
  ].filter((hint) => hint.length > 0);
}

function streamCandidateScore(candidate: StreamCandidate): number {
  const compatibility = detectStreamCompatibility(candidate.url, candidate.hints);

  if (compatibility.streamType === "audio-native") {
    return 4;
  }

  if (compatibility.audioCompatible) {
    return 3;
  }

  if (compatibility.streamType === "hls") {
    return 1;
  }

  return 0;
}

function readBestStream(rawStation: Record<string, unknown>): StreamCandidate | null {
  const candidates: StreamCandidate[] = [];
  const streams = rawStation.streams;
  if (Array.isArray(streams)) {
    for (const stream of streams) {
      if (!isRecord(stream)) {
        continue;
      }

      const streamUrl = readText(stream.url);
      if (streamUrl) {
        candidates.push({
          url: streamUrl,
          hints: collectHints(stream)
        });
      }
    }
  }

  const directUrl = readText(rawStation.url);
  if (directUrl) {
    candidates.push({
      url: directUrl,
      hints: collectHints(rawStation)
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, current) => {
    return streamCandidateScore(current) > streamCandidateScore(best) ? current : best;
  });
}

function extractStationRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const directStations = payload.stations;
  if (Array.isArray(directStations)) {
    return directStations.filter(isRecord);
  }

  const nestedData = payload.data;
  if (isRecord(nestedData) && Array.isArray(nestedData.stations)) {
    return nestedData.stations.filter(isRecord);
  }

  return [];
}

function normalizeStation(rawStation: Record<string, unknown>, countryCode: string): RadioStation | null {
  const stream = readBestStream(rawStation);
  if (!stream) {
    return null;
  }

  const streamUrl = stream.url;
  const name = readText(rawStation.name) || "Unknown";
  const country = toDisplayText(readText(rawStation.country) || toCountryFallback(countryCode));
  const language = firstLanguage(rawStation.language);
  const tagTokens = new Set([
    ...collectStringValues(rawStation.tags),
    ...collectStringValues(rawStation.genres),
    ...collectStringValues(rawStation.genre)
  ]);
  const tags = Array.from(tagTokens).join(",");
  const stationId = readText(rawStation.id) || readText(rawStation.stationuuid) || streamUrl;
  const compatibility = detectStreamCompatibility(streamUrl, stream.hints);

  return {
    stationuuid: `iprd:${stationId}`,
    name,
    urlResolved: streamUrl,
    country,
    language,
    tags,
    source: "iprd",
    streamType: compatibility.streamType,
    audioCompatible: compatibility.audioCompatible,
    supplemental: true
  };
}

function buildCountryUrl(countryCode: string): URL {
  const code = readText(countryCode).toLowerCase();
  return new URL(`${IPRD_COUNTRY_DATA_BASE}/${code}.json`);
}

export async function listIprdCountryStations(countryCode: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<RadioStation[]> {
  const url = buildCountryUrl(countryCode);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`IPRD returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const stationRecords = extractStationRecords(payload);
    const normalizedStations = stationRecords
      .map((record) => normalizeStation(record, countryCode))
      .filter((station): station is RadioStation => Boolean(station));

    return normalizedStations;
  } finally {
    clearTimeout(timeout);
  }
}
