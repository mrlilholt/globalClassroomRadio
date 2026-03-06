import type { RadioStation } from "../types/radio";
import { detectStreamCompatibility } from "./streamCompatibility";

export type CuratedLanguageProfile = "uzbek" | "russian" | "ukrainian" | "tajik" | "portuguese";

interface CuratedStationSeed {
  id: string;
  name: string;
  urlResolved: string;
  country: string;
  language: string;
  tags: string[];
}

const CURATED_STATION_SEEDS: Record<CuratedLanguageProfile, readonly CuratedStationSeed[]> = {
  uzbek: [],
  russian: [],
  ukrainian: [],
  tajik: [
    {
      id: "radiotoj-farhang",
      name: "Радиои Фарҳанг",
      urlResolved: "https://new.vobook.ru/online.radiotoj.tj:8000/farhang",
      country: "Tajikistan",
      language: "Tajik",
      tags: ["education", "family", "cultural", "маориф", "оилавӣ"]
    },
    {
      id: "radiotoj-otojik",
      name: "Радиои Овози тоҷик",
      urlResolved: "https://new.vobook.ru/online.radiotoj.tj:8000/otojik",
      country: "Tajikistan",
      language: "Tajik",
      tags: ["family", "education", "folk", "барои кӯдакон", "халқӣ"]
    },
    {
      id: "radiotoj-tojikiston",
      name: "Радиои Тоҷикистон",
      urlResolved: "https://new.vobook.ru/online.radiotoj.tj:8000/tojikiston",
      country: "Tajikistan",
      language: "Tajik",
      tags: ["family", "education", "folk", "таълим"]
    }
  ],
  portuguese: [
    {
      id: "radiomiudos-main",
      name: "Rádio Miúdos",
      urlResolved: "https://s5.radio.co/s9c516a065/listen",
      country: "Portugal",
      language: "Portuguese",
      tags: ["kids", "children", "family", "education", "crianças", "infantil", "para crianças"]
    },
    {
      id: "radiomiudos-miudinhos",
      name: "Canal Miudinhos",
      urlResolved: "https://s2.radio.co/s8dfeaed91/listen",
      country: "Portugal",
      language: "Portuguese",
      tags: ["kids", "children", "family", "education", "crianças", "infantil", "para crianças"]
    }
  ]
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeCountryCode(value: string): string {
  return normalizeToken(value);
}

function mapCountryToIso2(countryName: string): string {
  const normalized = normalizeCountryCode(countryName);
  if (normalized.includes("tajik")) {
    return "tj";
  }
  if (normalized.includes("portugal")) {
    return "pt";
  }
  if (normalized.includes("uzbek")) {
    return "uz";
  }
  if (normalized.includes("russia")) {
    return "ru";
  }
  if (normalized.includes("ukraine")) {
    return "ua";
  }

  return normalized.slice(0, 2);
}

function stationMatchesCountryCodes(station: CuratedStationSeed, countryCodes: readonly string[]): boolean {
  if (countryCodes.length === 0) {
    return true;
  }

  const stationCountry = normalizeCountryCode(station.country);
  const stationIso2 = mapCountryToIso2(station.country);
  return countryCodes.some((countryCode) => {
    const normalizedCountry = normalizeCountryCode(countryCode);
    if (!normalizedCountry) {
      return false;
    }

    if (normalizedCountry.length === 2) {
      return stationIso2 === normalizedCountry;
    }

    return stationCountry.includes(normalizedCountry);
  });
}

export function listCuratedKidStations(
  profile: CuratedLanguageProfile,
  options: { countryCodes?: readonly string[] } = {}
): RadioStation[] {
  const countryCodes = options.countryCodes ?? [];
  const seeds = CURATED_STATION_SEEDS[profile] ?? [];

  return seeds
    .filter((seed) => stationMatchesCountryCodes(seed, countryCodes))
    .map((seed) => {
      const compatibility = detectStreamCompatibility(seed.urlResolved, seed.tags);
      return {
        stationuuid: `curated:${seed.id}`,
        name: seed.name,
        urlResolved: seed.urlResolved,
        country: seed.country,
        language: seed.language,
        tags: seed.tags.map(normalizeToken).join(","),
        source: "curated",
        streamType: compatibility.streamType,
        audioCompatible: compatibility.audioCompatible,
        supplemental: true
      };
    });
}
