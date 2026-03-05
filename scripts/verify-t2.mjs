const RADIO_BROWSER_ENDPOINTS = [
  "https://de1.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info"
];

const DEFAULT_TIMEOUT_MS = 10_000;

function buildSearchUrl(baseUrl, { country, language, limit }) {
  const url = new URL("/json/stations/search", baseUrl);

  url.searchParams.set("hidebroken", "true");
  url.searchParams.set("order", "votes");
  url.searchParams.set("reverse", "true");
  url.searchParams.set("limit", String(limit));

  if (country) {
    url.searchParams.set("country", country);
  }

  if (language) {
    url.searchParams.set("language", language);
  }

  return url;
}

async function fetchJsonWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GlobalClassroomRadio/0.1 (T2 verification)"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeStation(station) {
  const name = typeof station?.name === "string" && station.name.trim().length > 0 ? station.name.trim() : "Unknown";
  const country = typeof station?.country === "string" && station.country.trim().length > 0 ? station.country.trim() : "Unknown";
  const language =
    typeof station?.language === "string" && station.language.trim().length > 0 ? station.language.trim() : "Unknown";
  const streamUrl = typeof station?.url_resolved === "string" && station.url_resolved.trim().length > 0 ? station.url_resolved.trim() : "";

  return {
    name,
    country,
    language,
    streamUrl
  };
}

async function discoverStations({ country = "", language = "", limit = 5 } = {}) {
  const errors = [];

  for (const endpoint of RADIO_BROWSER_ENDPOINTS) {
    const url = buildSearchUrl(endpoint, { country, language, limit });

    try {
      const payload = await fetchJsonWithTimeout(url);
      if (!Array.isArray(payload)) {
        throw new Error("Unexpected non-array payload");
      }

      const stations = payload.map(normalizeStation).filter((station) => station.streamUrl.length > 0);
      return stations;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      errors.push({ endpoint, reason });
    }
  }

  const details = errors.map((entry) => `${entry.endpoint}: ${entry.reason}`).join("; ");
  throw new Error(`All Radio Browser endpoints failed. ${details}`);
}

try {
  let stations = await discoverStations({ country: "United States", language: "English", limit: 5 });
  if (!stations.length) {
    stations = await discoverStations({ limit: 5 });
  }

  console.log("T2 verification results:");
  stations.forEach((station, index) => {
    console.log(`${index + 1}. ${station.name} | country=${station.country} | language=${station.language} | stream=${station.streamUrl}`);
  });

  if (!stations.length) {
    console.log("No stations were returned.");
  }
} catch (error) {
  console.error("T2 verification failed:", error);
  process.exitCode = 1;
}
