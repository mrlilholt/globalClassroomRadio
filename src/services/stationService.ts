import { SAFE_TAGS } from "../constants/safeTags";
import type { RadioStation, StationQuery } from "../types/radio";
import { canonicalizeSafeTag, tokenizeCsv } from "./filterEngine";
import { listIprdCountryStations } from "./iprdClient";
import { listIptvOrgKidStations } from "./iptvOrgClient";
import { detectStreamCompatibility } from "./streamCompatibility";
import {
  RadioBrowserClientError,
  searchRadioBrowserStations,
  type RadioBrowserErrorAttempt,
  type RadioBrowserErrorType,
  type RadioBrowserSearchQuery
} from "./radioBrowserClient";

export interface StationService {
  listStations(query: StationQuery, options?: StationListOptions): Promise<RadioStation[]>;
}

export interface StationListOptions {
  forceRefresh?: boolean;
}

export type StationServiceErrorType = RadioBrowserErrorType;

interface StationServiceErrorOptions {
  type: StationServiceErrorType;
  endpoint?: string;
  status?: number | null;
  cause?: unknown;
  attempts?: RadioBrowserErrorAttempt[];
}

export class StationServiceError extends Error {
  readonly type: StationServiceErrorType;
  readonly endpoint: string;
  readonly status: number | null;
  readonly attempts: RadioBrowserErrorAttempt[];
  readonly cause?: unknown;

  constructor(message: string, options: StationServiceErrorOptions) {
    super(message);
    this.name = "StationServiceError";
    this.type = options.type;
    this.endpoint = options.endpoint ?? "unknown";
    this.status = options.status ?? null;
    this.attempts = options.attempts ?? [];
    this.cause = options.cause;
  }
}

export interface StationCoverageSnapshot {
  cacheKey: string;
  cacheStatus: "miss" | "fresh-hit" | "stale-hit";
  windowCount: number;
  failedWindowCount: number;
  candidateCount: number;
  refreshedAt: number;
}

interface RadioBrowserStationPayload {
  stationuuid?: unknown;
  changeuuid?: unknown;
  name?: unknown;
  url_resolved?: unknown;
  url?: unknown;
  codec?: unknown;
  country?: unknown;
  language?: unknown;
  tags?: unknown;
}

interface NormalizedStationQuery {
  country: string;
  language: string;
  tags: string[];
  safeOnly: boolean;
}

interface StationFetchWindow {
  id: string;
  query: RadioBrowserSearchQuery;
}

interface StationCacheEntry {
  stations: RadioStation[];
  createdAt: number;
  coverage: Omit<StationCoverageSnapshot, "cacheStatus" | "cacheKey" | "candidateCount">;
}

interface FetchResult {
  stations: RadioStation[];
  windowCount: number;
  failedWindowCount: number;
  refreshedAt: number;
}

const WINDOW_LIMIT_DEFAULT = 180;
const WINDOW_LIMIT_MAX = 220;
const WINDOW_LIMIT_MIN = 100;
const MAX_WINDOWS = 6;
const WINDOW_CONCURRENCY = 2;
const MAX_STATION_POOL = 1200;
const PROFILE_RELEVANCE_MIN = 20;
const CACHE_TTL_MS = 7 * 60 * 1000;
const CACHE_MAX_KEYS = 12;
const SAFE_TAG_STRATEGY_VERSION = "safe-v3";

const stationCache = new Map<string, StationCacheEntry>();
const inflightByKey = new Map<string, Promise<RadioStation[]>>();

interface TargetLanguageProfile {
  id: "uzbek" | "russian" | "ukrainian";
  displayLanguage: string;
  languageTerms: readonly string[];
  countryTerms: readonly string[];
  radioBrowserLanguage: string;
  localizedSafeTags: readonly string[];
  supplementalCountryCodes: readonly string[];
}

const TARGET_LANGUAGE_PROFILES: readonly TargetLanguageProfile[] = [
  {
    id: "uzbek",
    displayLanguage: "Uzbek",
    languageTerms: ["uzbek", "ozbek", "o'zbek", "uz", "\u045e\u0437\u0431\u0435\u043a", "\u0443\u0437\u0431\u0435\u043a"],
    countryTerms: ["uzbekistan", "uz"],
    radioBrowserLanguage: "uzbek",
    localizedSafeTags: [
      "bolalar",
      "bolalar uchun",
      "oila",
      "ta'lim",
      "klassik",
      "xalq",
      "alla",
      "\u0431\u043e\u043b\u0430\u043b\u0430\u0440",
      "\u0431\u043e\u043b\u0430\u043b\u0430\u0440 \u0443\u0447\u0443\u043d",
      "\u043e\u0438\u043b\u0430",
      "\u0442\u0430\u044a\u043b\u0438\u043c",
      "\u043a\u043b\u0430\u0441\u0441\u0438\u043a",
      "\u0445\u0430\u043b\u049b",
      "\u0430\u043b\u043b\u0430"
    ],
    supplementalCountryCodes: ["uz"]
  },
  {
    id: "russian",
    displayLanguage: "Russian",
    languageTerms: ["russian", "ru", "\u0440\u0443\u0441\u0441\u043a\u0438\u0439"],
    countryTerms: ["russia", "ru"],
    radioBrowserLanguage: "russian",
    localizedSafeTags: [
      "\u0434\u0435\u0442\u0438",
      "\u0434\u0435\u0442\u0441\u043a\u0438\u0439",
      "\u0434\u043b\u044f \u0434\u0435\u0442\u0435\u0439",
      "\u0441\u0435\u043c\u0435\u0439\u043d\u044b\u0439",
      "\u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u043d\u0438\u0435",
      "\u043a\u043b\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043a\u0430\u044f",
      "\u043d\u0430\u0440\u043e\u0434\u043d\u0430\u044f",
      "\u043a\u043e\u043b\u044b\u0431\u0435\u043b\u044c\u043d\u044b\u0435"
    ],
    supplementalCountryCodes: ["ru"]
  },
  {
    id: "ukrainian",
    displayLanguage: "Ukrainian",
    languageTerms: ["ukrainian", "uk", "ua", "\u0443\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430"],
    countryTerms: ["ukraine", "ua"],
    radioBrowserLanguage: "ukrainian",
    localizedSafeTags: [
      "\u0434\u0456\u0442\u0438",
      "\u0434\u0438\u0442\u044f\u0447\u0438\u0439",
      "\u0434\u043b\u044f \u0434\u0456\u0442\u0435\u0439",
      "\u0441\u0456\u043c\u0435\u0439\u043d\u0438\u0439",
      "\u043e\u0441\u0432\u0456\u0442\u0430",
      "\u043a\u043b\u0430\u0441\u0438\u0447\u043d\u0430",
      "\u043d\u0430\u0440\u043e\u0434\u043d\u0430",
      "\u043a\u043e\u043b\u0438\u0441\u043a\u043e\u0432\u0456"
    ],
    supplementalCountryCodes: ["ua"]
  }
] as const;

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstToken(value: string): string {
  const [token] = tokenizeCsv(value);
  return token ?? "";
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

function normalizeStation(rawStation: RadioBrowserStationPayload): RadioStation | null {
  const streamUrl = readText(rawStation.url_resolved) || readText(rawStation.url);
  if (!streamUrl) {
    return null;
  }

  const name = readText(rawStation.name) || "Unknown";
  const country = toDisplayText(readText(rawStation.country));
  const language = toDisplayText(firstToken(readText(rawStation.language)));
  const tags = tokenizeCsv(readText(rawStation.tags)).join(",");
  const stationuuid = readText(rawStation.stationuuid) || readText(rawStation.changeuuid) || streamUrl;
  const compatibility = detectStreamCompatibility(streamUrl, [readText(rawStation.codec), readText(rawStation.tags)]);

  return {
    stationuuid,
    name,
    urlResolved: streamUrl,
    country,
    language,
    tags,
    source: "radio-browser",
    streamType: compatibility.streamType,
    audioCompatible: compatibility.audioCompatible,
    supplemental: false
  };
}

function normalizeWindowLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return WINDOW_LIMIT_DEFAULT;
  }

  return Math.min(WINDOW_LIMIT_MAX, Math.max(WINDOW_LIMIT_MIN, Math.floor(limit)));
}

function normalizeQuery(query: StationQuery): NormalizedStationQuery {
  return {
    country: readText(query.country),
    language: normalizeQueryText(readText(query.language)),
    tags: tokenizeCsv(query.tags),
    safeOnly: Boolean(query.safeOnly)
  };
}

function buildCacheKey(query: NormalizedStationQuery): string {
  const tags = query.tags.length > 0 ? query.tags.join(",") : "*";

  return [
    `country=${query.country.toLowerCase() || "*"}`,
    `language=${query.language.toLowerCase() || "*"}`,
    `tags=${tags}`,
    `safeOnly=${query.safeOnly ? "1" : "0"}`,
    `safeTagStrategy=${SAFE_TAG_STRATEGY_VERSION}`
  ].join("|");
}

function dedupeValues(values: string[]): string[] {
  const unique = new Set(values.filter((value) => value.length > 0));
  return Array.from(unique);
}

function safeSeedTags(queryTags: string[]): string[] {
  const querySafeTags = dedupeValues(
    queryTags
      .map((tag) => canonicalizeSafeTag(tag))
      .filter((tag): tag is (typeof SAFE_TAGS)[number] => Boolean(tag))
  );
  if (querySafeTags.length > 0) {
    return dedupeValues(querySafeTags);
  }

  return SAFE_TAGS.slice(0, 4).map((tag) => tag.toLowerCase());
}

function findTargetLanguageProfile(query: NormalizedStationQuery): TargetLanguageProfile | null {
  const queryParts = [query.language, query.country, ...query.tags].map((part) => normalizeQueryText(part));

  for (const profile of TARGET_LANGUAGE_PROFILES) {
    const matchedByLanguage = queryParts.some((part) => profile.languageTerms.includes(part));
    const matchedByCountry = queryParts.some((part) => profile.countryTerms.includes(part));
    if (matchedByLanguage || matchedByCountry) {
      return profile;
    }
  }

  return null;
}

function mergeSafeTagSeeds(query: NormalizedStationQuery, profile: TargetLanguageProfile | null): string[] {
  const seeds = [...safeSeedTags(query.tags)];

  if (profile) {
    seeds.unshift(...profile.localizedSafeTags.map((tag) => normalizeQueryText(tag)));
  }

  return dedupeValues(seeds);
}

function toWindowId(prefix: string, query: RadioBrowserSearchQuery): string {
  return [
    prefix,
    query.order ?? "votes",
    `offset:${query.offset ?? 0}`,
    `country:${query.country ?? "*"}`,
    `language:${query.language ?? "*"}`,
    `tag:${query.tag ?? "*"}`
  ].join("|");
}

function normalizeQueryText(value: string): string {
  return value.trim().toLowerCase();
}

function buildSupplementalCountryCodes(
  query: NormalizedStationQuery,
  profile: TargetLanguageProfile | null
): string[] {
  if (!profile) {
    return [];
  }

  const countryCodes = new Set<string>(profile.supplementalCountryCodes);
  const normalizedCountry = normalizeQueryText(query.country);
  const matchingProfile = TARGET_LANGUAGE_PROFILES.find((entry) => entry.countryTerms.includes(normalizedCountry));
  if (matchingProfile) {
    matchingProfile.supplementalCountryCodes.forEach((code) => {
      countryCodes.add(code);
    });
  }

  return Array.from(countryCodes);
}

function toStationDedupeKey(station: RadioStation): string {
  const normalizedUrl = station.urlResolved.trim().toLowerCase();
  if (normalizedUrl) {
    return normalizedUrl;
  }

  return [
    normalizeQueryText(station.name),
    normalizeQueryText(station.country),
    normalizeQueryText(station.language),
    normalizeQueryText(station.stationuuid)
  ].join("|");
}

function mergeStationsByDedupe(target: Map<string, RadioStation>, sourceStations: RadioStation[]): void {
  for (const station of sourceStations) {
    if (target.size >= MAX_STATION_POOL) {
      return;
    }

    const dedupeKey = toStationDedupeKey(station);
    const existingStation = target.get(dedupeKey);
    if (!existingStation) {
      target.set(dedupeKey, station);
      continue;
    }

    const shouldReplace =
      (!existingStation.audioCompatible && station.audioCompatible) ||
      (existingStation.streamType !== "audio-native" && station.streamType === "audio-native");
    if (shouldReplace) {
      target.set(dedupeKey, station);
    }
  }
}

function stationMatchesTargetProfile(station: RadioStation, profile: TargetLanguageProfile): boolean {
  const normalizedLanguage = normalizeQueryText(station.language);
  const normalizedCountry = normalizeQueryText(station.country);

  const languageMatch = profile.languageTerms.some((term) => normalizedLanguage.includes(term));
  const countryMatch = profile.countryTerms.some((term) => normalizedCountry.includes(term));
  return languageMatch || countryMatch;
}

function countProfileRelevantStations(stations: Map<string, RadioStation>, profile: TargetLanguageProfile): number {
  let count = 0;

  for (const station of stations.values()) {
    if (stationMatchesTargetProfile(station, profile)) {
      count += 1;
    }
  }

  return count;
}

function buildFetchPlan(query: NormalizedStationQuery, windowLimit: number): StationFetchWindow[] {
  const windows: StationFetchWindow[] = [];
  const windowIds = new Set<string>();
  const targetProfile = findTargetLanguageProfile(query);
  const safeTagSeeds = mergeSafeTagSeeds(query, targetProfile);
  const defaultLanguage = query.language || targetProfile?.radioBrowserLanguage;

  const pushWindow = (prefix: string, windowQuery: RadioBrowserSearchQuery): void => {
    if (windows.length >= MAX_WINDOWS) {
      return;
    }

    const id = toWindowId(prefix, windowQuery);
    if (windowIds.has(id)) {
      return;
    }

    windows.push({ id, query: windowQuery });
    windowIds.add(id);
  };

  const withContext = (baseQuery: RadioBrowserSearchQuery): RadioBrowserSearchQuery => ({
    ...baseQuery,
    limit: windowLimit,
    country: query.country || baseQuery.country,
    language: defaultLanguage || baseQuery.language
  });

  pushWindow("global-top", {
    order: "votes",
    reverse: true,
    limit: windowLimit,
    offset: 0
  });

  if (query.country) {
    pushWindow("country-focused", withContext({ order: "votes", reverse: true, offset: 0 }));
  }

  if (query.language) {
    pushWindow("language-focused", withContext({ order: "votes", reverse: true, offset: 0 }));
  } else if (targetProfile) {
    pushWindow("language-focused", withContext({ order: "votes", reverse: true, offset: 0 }));
  }

  for (const tag of query.tags.slice(0, 2)) {
    pushWindow("tag-focused", withContext({ order: "votes", reverse: true, offset: 0, tag }));
  }

  if (query.safeOnly) {
    for (const safeTag of safeTagSeeds) {
      pushWindow("safe-tag-focused", withContext({ order: "votes", reverse: true, offset: 0, tag: safeTag }));
    }
  }

  pushWindow("global-clickcount", {
    order: "clickcount",
    reverse: true,
    limit: windowLimit,
    offset: 0
  });

  pushWindow("global-top", {
    order: "votes",
    reverse: true,
    limit: windowLimit,
    offset: windowLimit
  });

  return windows;
}

function pruneCacheIfNeeded(): void {
  if (stationCache.size <= CACHE_MAX_KEYS) {
    return;
  }

  const entriesByAge = Array.from(stationCache.entries()).sort((left, right) => left[1].createdAt - right[1].createdAt);

  while (stationCache.size > CACHE_MAX_KEYS && entriesByAge.length > 0) {
    const [oldestKey] = entriesByAge.shift() as [string, StationCacheEntry];
    stationCache.delete(oldestKey);
  }
}

function toStationServiceError(error: unknown): StationServiceError {
  if (error instanceof StationServiceError) {
    return error;
  }

  if (error instanceof RadioBrowserClientError) {
    return new StationServiceError(error.message, {
      type: error.type,
      endpoint: error.endpoint,
      status: error.status,
      attempts: error.attempts,
      cause: error.cause
    });
  }

  return new StationServiceError("Unexpected station service failure", {
    type: "network",
    cause: error
  });
}

function aggregateWindowErrors(errors: StationServiceError[]): StationServiceError {
  const [firstError] = errors;
  const attempts = errors.flatMap((error) => error.attempts);

  return new StationServiceError("All discovery windows failed", {
    type: firstError?.type ?? "network",
    endpoint: firstError?.endpoint ?? "unknown",
    status: firstError?.status ?? null,
    attempts,
    cause: firstError?.cause
  });
}

export class RadioBrowserStationService implements StationService {
  private lastCoverageSnapshot: StationCoverageSnapshot | null = null;
  private readonly windowLimit: number;

  constructor(defaultLimit = WINDOW_LIMIT_DEFAULT) {
    this.windowLimit = normalizeWindowLimit(defaultLimit);
  }

  getLastCoverageSnapshot(): StationCoverageSnapshot | null {
    return this.lastCoverageSnapshot;
  }

  async listStations(query: StationQuery, options: StationListOptions = {}): Promise<RadioStation[]> {
    const normalizedQuery = normalizeQuery(query);
    const cacheKey = buildCacheKey(normalizedQuery);
    const cached = stationCache.get(cacheKey);
    const now = Date.now();
    const forceRefresh = options.forceRefresh === true;

    if (forceRefresh) {
      return this.fetchAndCache(cacheKey, normalizedQuery, "miss");
    }

    if (cached) {
      const cacheAgeMs = now - cached.createdAt;
      const isFresh = cacheAgeMs <= CACHE_TTL_MS;
      const cacheStatus = isFresh ? "fresh-hit" : "stale-hit";

      this.lastCoverageSnapshot = {
        cacheKey,
        cacheStatus,
        candidateCount: cached.stations.length,
        ...cached.coverage
      };

      if (isFresh) {
        return cached.stations;
      }

      this.refreshCacheInBackground(cacheKey, normalizedQuery);
      return cached.stations;
    }

    return this.fetchAndCache(cacheKey, normalizedQuery, "miss");
  }

  private refreshCacheInBackground(cacheKey: string, query: NormalizedStationQuery): void {
    if (inflightByKey.has(cacheKey)) {
      return;
    }

    void this.fetchAndCache(cacheKey, query, "stale-hit").catch((error) => {
      const stationError = toStationServiceError(error);
      console.error("Background discovery refresh failed", {
        type: stationError.type,
        endpoint: stationError.endpoint,
        status: stationError.status,
        attempts: stationError.attempts
      });
    });
  }

  private async fetchAndCache(
    cacheKey: string,
    query: NormalizedStationQuery,
    cacheStatus: StationCoverageSnapshot["cacheStatus"]
  ): Promise<RadioStation[]> {
    const activeRequest = inflightByKey.get(cacheKey);
    if (activeRequest) {
      return activeRequest;
    }

    const fetchPromise = this.executeFetchPlan(query)
      .then((result) => {
        const coverage = {
          windowCount: result.windowCount,
          failedWindowCount: result.failedWindowCount,
          refreshedAt: result.refreshedAt
        };

        stationCache.set(cacheKey, {
          stations: result.stations,
          createdAt: result.refreshedAt,
          coverage
        });
        pruneCacheIfNeeded();

        this.lastCoverageSnapshot = {
          cacheKey,
          cacheStatus,
          candidateCount: result.stations.length,
          ...coverage
        };

        return result.stations;
      })
      .finally(() => {
        inflightByKey.delete(cacheKey);
      });

    inflightByKey.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  private async executeFetchPlan(query: NormalizedStationQuery): Promise<FetchResult> {
    const windows = buildFetchPlan(query, this.windowLimit);
    const targetProfile = findTargetLanguageProfile(query);
    const supplementalCountryCodes = buildSupplementalCountryCodes(query, targetProfile);
    const dedupedStations = new Map<string, RadioStation>();
    const windowErrors: StationServiceError[] = [];
    let supplementalWindowCount = 0;
    let supplementalFailedWindowCount = 0;
    let nextWindowIndex = 0;

    const worker = async (): Promise<void> => {
      while (nextWindowIndex < windows.length) {
        if (dedupedStations.size >= MAX_STATION_POOL) {
          return;
        }

        const currentWindow = windows[nextWindowIndex];
        nextWindowIndex += 1;

        try {
          const payload = await searchRadioBrowserStations(currentWindow.query);

          for (const entry of payload) {
            if (dedupedStations.size >= MAX_STATION_POOL) {
              break;
            }

            if (!isRecord(entry)) {
              continue;
            }

            const normalizedStation = normalizeStation(entry as RadioBrowserStationPayload);
            if (!normalizedStation) {
              continue;
            }

            mergeStationsByDedupe(dedupedStations, [normalizedStation]);
          }
        } catch (error) {
          const stationError = toStationServiceError(error);
          windowErrors.push(stationError);
        }
      }
    };

    const workerCount = Math.min(WINDOW_CONCURRENCY, windows.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    if (supplementalCountryCodes.length > 0 && dedupedStations.size < MAX_STATION_POOL) {
      for (const countryCode of supplementalCountryCodes) {
        if (dedupedStations.size >= MAX_STATION_POOL) {
          break;
        }

        supplementalWindowCount += 1;
        try {
          const supplementalStations = await listIprdCountryStations(countryCode);
          mergeStationsByDedupe(dedupedStations, supplementalStations);
        } catch (error) {
          supplementalFailedWindowCount += 1;
          console.warn(`IPRD supplemental fetch failed for country '${countryCode}'`, error);
        }
      }
    }

    const shouldFetchIptvFallback =
      Boolean(query.safeOnly) &&
      Boolean(targetProfile) &&
      countProfileRelevantStations(dedupedStations, targetProfile as TargetLanguageProfile) < PROFILE_RELEVANCE_MIN &&
      dedupedStations.size < MAX_STATION_POOL;

    if (shouldFetchIptvFallback && targetProfile) {
      supplementalWindowCount += 1;

      try {
        const fallbackCountryCodes =
          supplementalCountryCodes.length > 0 ? supplementalCountryCodes : targetProfile.supplementalCountryCodes;
        const iptvFallbackStations = await listIptvOrgKidStations({
          countryCodes: fallbackCountryCodes,
          languageLabel: targetProfile.displayLanguage
        });
        mergeStationsByDedupe(dedupedStations, iptvFallbackStations);
      } catch (error) {
        supplementalFailedWindowCount += 1;
        console.warn(`IPTV-Org fallback fetch failed for profile '${targetProfile.id}'`, error);
      }
    }

    const stations = Array.from(dedupedStations.values());
    if (stations.length === 0 && windowErrors.length > 0) {
      throw aggregateWindowErrors(windowErrors);
    }

    return {
      stations,
      windowCount: windows.length + supplementalWindowCount,
      failedWindowCount: windowErrors.length + supplementalFailedWindowCount,
      refreshedAt: Date.now()
    };
  }
}
