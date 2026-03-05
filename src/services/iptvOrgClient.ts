import type { RadioStation } from "../types/radio";
import { detectStreamCompatibility } from "./streamCompatibility";

const IPTV_CHANNELS_URL = "https://iptv-org.github.io/api/channels.json";
const IPTV_STREAMS_URL = "https://iptv-org.github.io/api/streams.json";
const DEFAULT_TIMEOUT_MS = 15_000;
const CATALOG_TTL_MS = 6 * 60 * 60 * 1000;

const SAFE_CATEGORY_TO_TAG: Record<string, "kids" | "family" | "education"> = {
  animation: "kids",
  children: "kids",
  educational: "education",
  education: "education",
  family: "family",
  kids: "kids"
};

interface IptvChannel {
  id: string;
  name: string;
  country: string;
  categories: string[];
  isNsfw: boolean;
}

interface IptvStream {
  channelId: string;
  title: string;
  url: string;
  quality: string;
  userAgent: string;
}

interface IptvCatalogCache {
  channelsById: Map<string, IptvChannel>;
  streams: IptvStream[];
  fetchedAt: number;
}

interface IptvFallbackQuery {
  countryCodes: readonly string[];
  languageLabel: string;
  timeoutMs?: number;
}

let catalogCache: IptvCatalogCache | null = null;
let catalogInflight: Promise<IptvCatalogCache> | null = null;

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
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

function toCountryName(countryCode: string): string {
  switch (normalizeToken(countryCode)) {
    case "ru":
      return "Russia";
    case "ua":
      return "Ukraine";
    case "uz":
      return "Uzbekistan";
    default:
      return countryCode.toUpperCase() || "Unknown";
  }
}

function collectSafeTags(categories: string[]): string[] {
  const mapped = new Set<string>();
  for (const category of categories) {
    const mappedTag = SAFE_CATEGORY_TO_TAG[normalizeToken(category)];
    if (mappedTag) {
      mapped.add(mappedTag);
    }
  }

  return Array.from(mapped);
}

function parseChannels(payload: unknown): Map<string, IptvChannel> {
  if (!Array.isArray(payload)) {
    return new Map<string, IptvChannel>();
  }

  const channelsById = new Map<string, IptvChannel>();
  for (const entry of payload) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const id = readText(record.id);
    if (!id) {
      continue;
    }

    const categories = Array.isArray(record.categories)
      ? record.categories.map((category) => readText(category)).filter((category) => category.length > 0)
      : [];

    channelsById.set(id, {
      id,
      name: readText(record.name) || "Unknown",
      country: readText(record.country).toLowerCase(),
      categories,
      isNsfw: Boolean(record.is_nsfw)
    });
  }

  return channelsById;
}

function parseStreams(payload: unknown): IptvStream[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const streams: IptvStream[] = [];
  for (const entry of payload) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const channelId = readText(record.channel);
    const url = readText(record.url);
    if (!channelId || !url) {
      continue;
    }

    streams.push({
      channelId,
      title: readText(record.title),
      url,
      quality: readText(record.quality),
      userAgent: readText(record.user_agent)
    });
  }

  return streams;
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`IPTV-Org returned HTTP ${response.status} for ${url}`);
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadCatalog(timeoutMs: number): Promise<IptvCatalogCache> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.fetchedAt <= CATALOG_TTL_MS) {
    return catalogCache;
  }

  if (catalogInflight) {
    return catalogInflight;
  }

  catalogInflight = (async () => {
    const [channelsPayload, streamsPayload] = await Promise.all([
      fetchJson(IPTV_CHANNELS_URL, timeoutMs),
      fetchJson(IPTV_STREAMS_URL, timeoutMs)
    ]);

    const nextCache: IptvCatalogCache = {
      channelsById: parseChannels(channelsPayload),
      streams: parseStreams(streamsPayload),
      fetchedAt: Date.now()
    };

    catalogCache = nextCache;
    return nextCache;
  })();

  try {
    return await catalogInflight;
  } finally {
    catalogInflight = null;
  }
}

function chooseBetterStream(current: IptvStream, candidate: IptvStream): IptvStream {
  const currentCompatibility = detectStreamCompatibility(current.url, [current.quality, current.title]);
  const candidateCompatibility = detectStreamCompatibility(candidate.url, [candidate.quality, candidate.title]);

  if (currentCompatibility.audioCompatible !== candidateCompatibility.audioCompatible) {
    return candidateCompatibility.audioCompatible ? candidate : current;
  }

  if (currentCompatibility.streamType !== candidateCompatibility.streamType) {
    if (candidateCompatibility.streamType === "audio-native") {
      return candidate;
    }
    if (currentCompatibility.streamType === "audio-native") {
      return current;
    }
  }

  const candidateIsHttp = candidate.url.startsWith("http://") || candidate.url.startsWith("https://");
  const currentIsHttp = current.url.startsWith("http://") || current.url.startsWith("https://");
  if (candidateIsHttp !== currentIsHttp) {
    return candidateIsHttp ? candidate : current;
  }

  return current;
}

export async function listIptvOrgKidStations(query: IptvFallbackQuery): Promise<RadioStation[]> {
  const timeoutMs = query.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const countryCodes = new Set(
    query.countryCodes.map((code) => normalizeToken(code)).filter((code) => code.length > 0)
  );
  const catalog = await loadCatalog(timeoutMs);

  const selectedChannels = new Map<string, IptvChannel>();
  for (const [channelId, channel] of catalog.channelsById.entries()) {
    if (channel.isNsfw) {
      continue;
    }

    if (countryCodes.size > 0 && !countryCodes.has(channel.country)) {
      continue;
    }

    const safeTags = collectSafeTags(channel.categories);
    if (safeTags.length === 0) {
      continue;
    }

    selectedChannels.set(channelId, channel);
  }

  const bestStreamByChannel = new Map<string, IptvStream>();
  for (const stream of catalog.streams) {
    if (!selectedChannels.has(stream.channelId)) {
      continue;
    }

    const existingStream = bestStreamByChannel.get(stream.channelId);
    if (!existingStream) {
      bestStreamByChannel.set(stream.channelId, stream);
      continue;
    }

    bestStreamByChannel.set(stream.channelId, chooseBetterStream(existingStream, stream));
  }

  const stations: RadioStation[] = [];
  for (const [channelId, channel] of selectedChannels.entries()) {
    const stream = bestStreamByChannel.get(channelId);
    if (!stream) {
      continue;
    }

    const safeTags = collectSafeTags(channel.categories);
    const compatibility = detectStreamCompatibility(stream.url, [stream.quality, stream.title]);

    stations.push({
      stationuuid: `iptv-org:${channel.id}`,
      name: channel.name || stream.title || "Unknown",
      urlResolved: stream.url,
      country: toCountryName(channel.country),
      language: toDisplayText(query.languageLabel),
      tags: [...safeTags, ...channel.categories.map(normalizeToken)].join(","),
      source: "iptv-org",
      streamType: compatibility.streamType,
      audioCompatible: compatibility.audioCompatible,
      supplemental: true
    });
  }

  return stations;
}
