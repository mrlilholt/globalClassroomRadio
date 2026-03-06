import { SAFE_TAG_ALIASES, SAFE_TAGS, type SafeTag } from "../constants/safeTags";
import type { RadioStation, StationFilters } from "../types/radio";

const TARGET_LANGUAGE_FILTER_SEEDS = ["Uzbek", "Russian", "Ukrainian", "Tajik", "Portuguese"] as const;
const TARGET_COUNTRY_FILTER_SEEDS = ["Uzbekistan", "Russia", "Ukraine", "Tajikistan", "Portugal"] as const;

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeSafeTagAlias(value: string): string {
  return normalizeToken(value)
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const SAFE_TAG_ALIAS_LOOKUP = (() => {
  const map = new Map<string, SafeTag>();

  for (const canonicalTag of SAFE_TAGS) {
    map.set(normalizeSafeTagAlias(canonicalTag), canonicalTag);

    for (const variant of SAFE_TAG_ALIASES[canonicalTag]) {
      map.set(normalizeSafeTagAlias(variant), canonicalTag);
    }
  }

  return map;
})();

export function tokenizeCsv(value: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map(normalizeToken)
    .filter((token) => token.length > 0);
}

export function canonicalizeSafeTag(value: string): SafeTag | null {
  const normalized = normalizeSafeTagAlias(value);
  if (!normalized) {
    return null;
  }

  return SAFE_TAG_ALIAS_LOOKUP.get(normalized) ?? null;
}

export function isStationSafe(station: RadioStation): boolean {
  const tags = tokenizeCsv(station.tags);
  if (tags.some((tag) => canonicalizeSafeTag(tag) !== null)) {
    return true;
  }

  const normalizedName = normalizeSafeTagAlias(station.name);
  if (!normalizedName) {
    return false;
  }

  const paddedName = ` ${normalizedName} `;
  for (const alias of SAFE_TAG_ALIAS_LOOKUP.keys()) {
    if (!alias) {
      continue;
    }

    if (paddedName.includes(` ${alias} `)) {
      return true;
    }
  }

  return false;
}

export function filterStationsBySafety(stations: RadioStation[], safeOnly: boolean): RadioStation[] {
  if (!safeOnly) {
    return stations;
  }

  return stations.filter(isStationSafe);
}

export interface StationFilterOptions {
  countries: string[];
  languages: string[];
  tags: string[];
}

function dedupeSorted(values: string[]): string[] {
  const uniqueValues = new Set(values.filter((value) => value.length > 0));
  return Array.from(uniqueValues).sort((left, right) => left.localeCompare(right));
}

export function getStationFilterOptions(stations: RadioStation[]): StationFilterOptions {
  const countries = dedupeSorted([...TARGET_COUNTRY_FILTER_SEEDS, ...stations.map((station) => station.country.trim())]);
  const languages = dedupeSorted([...TARGET_LANGUAGE_FILTER_SEEDS, ...stations.map((station) => station.language.trim())]);
  const tags = dedupeSorted(stations.flatMap((station) => tokenizeCsv(station.tags)));

  return {
    countries,
    languages,
    tags
  };
}

export function filterStationsByQuery(stations: RadioStation[], filters: StationFilters): RadioStation[] {
  const selectedTags = normalizeFiltersTags(filters.tags);

  return stations.filter((station) => {
    if (filters.country && station.country !== filters.country) {
      return false;
    }

    if (filters.language && station.language !== filters.language) {
      return false;
    }

    if (selectedTags.length > 0) {
      const stationTags = tokenizeCsv(station.tags);
      const hasMatchingTag = selectedTags.some((tag) => stationTags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    return true;
  });
}

function normalizeFiltersTags(tags: string[]): string[] {
  const unique = new Set(tags.map(normalizeToken).filter((tag) => tag.length > 0));
  return Array.from(unique);
}
