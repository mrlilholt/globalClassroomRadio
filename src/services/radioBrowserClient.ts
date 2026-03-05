export type RadioBrowserErrorType = "network" | "timeout" | "http" | "parse" | "schema";

export interface RadioBrowserErrorAttempt {
  endpoint: string;
  type: RadioBrowserErrorType;
  status: number | null;
  message: string;
}

interface RadioBrowserClientErrorOptions {
  type: RadioBrowserErrorType;
  endpoint: string;
  status?: number | null;
  cause?: unknown;
  attempts?: RadioBrowserErrorAttempt[];
}

export class RadioBrowserClientError extends Error {
  readonly type: RadioBrowserErrorType;
  readonly endpoint: string;
  readonly status: number | null;
  readonly attempts: RadioBrowserErrorAttempt[];
  readonly cause?: unknown;

  constructor(message: string, options: RadioBrowserClientErrorOptions) {
    super(message);
    this.name = "RadioBrowserClientError";
    this.type = options.type;
    this.endpoint = options.endpoint;
    this.status = options.status ?? null;
    this.attempts = options.attempts ?? [];
    this.cause = options.cause;
  }
}

export interface RadioBrowserSearchQuery {
  country?: string;
  language?: string;
  tag?: string;
  limit?: number;
  offset?: number;
  order?: "votes" | "clickcount";
  reverse?: boolean;
  hideBroken?: boolean;
}

const RADIO_BROWSER_ENDPOINTS = [
  "https://de1.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info"
];

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_LIMIT = 120;
const DEFAULT_OFFSET = 0;

function trimOrEmpty(value: string | undefined): string {
  return value?.trim() ?? "";
}

function normalizeLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(200, Math.max(1, Math.floor(limit)));
}

function normalizeOffset(offset: number | undefined): number {
  if (typeof offset !== "number" || !Number.isFinite(offset)) {
    return DEFAULT_OFFSET;
  }

  return Math.max(0, Math.floor(offset));
}

function buildSearchUrl(endpoint: string, query: RadioBrowserSearchQuery): URL {
  const url = new URL("/json/stations/search", endpoint);
  const order = query.order ?? "votes";
  const reverse = query.reverse ?? true;
  const hideBroken = query.hideBroken ?? true;

  url.searchParams.set("hidebroken", hideBroken ? "true" : "false");
  url.searchParams.set("order", order);
  url.searchParams.set("reverse", reverse ? "true" : "false");
  url.searchParams.set("limit", String(normalizeLimit(query.limit)));
  url.searchParams.set("offset", String(normalizeOffset(query.offset)));

  const country = trimOrEmpty(query.country);
  const language = trimOrEmpty(query.language);
  const tag = trimOrEmpty(query.tag);

  if (country) {
    url.searchParams.set("country", country);
  }

  if (language) {
    url.searchParams.set("language", language);
  }

  if (tag) {
    url.searchParams.set("tag", tag);
  }

  return url;
}

function buildAttempt(error: RadioBrowserClientError): RadioBrowserErrorAttempt {
  return {
    endpoint: error.endpoint,
    type: error.type,
    status: error.status,
    message: error.message
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function fetchJsonWithTimeout(url: URL, endpoint: string, timeoutMs: number): Promise<unknown> {
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
      throw new RadioBrowserClientError(`Radio Browser returned HTTP ${response.status}`, {
        type: "http",
        endpoint,
        status: response.status
      });
    }

    try {
      return await response.json();
    } catch (error) {
      throw new RadioBrowserClientError("Radio Browser response could not be parsed as JSON", {
        type: "parse",
        endpoint,
        status: response.status,
        cause: error
      });
    }
  } catch (error) {
    if (error instanceof RadioBrowserClientError) {
      throw error;
    }

    if (isAbortError(error)) {
      throw new RadioBrowserClientError("Radio Browser request timed out", {
        type: "timeout",
        endpoint,
        cause: error
      });
    }

    throw new RadioBrowserClientError("Radio Browser request failed", {
      type: "network",
      endpoint,
      cause: error
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchRadioBrowserStations(
  query: RadioBrowserSearchQuery,
  options?: {
    endpoints?: string[];
    timeoutMs?: number;
  }
): Promise<unknown[]> {
  const endpoints = options?.endpoints?.length ? options.endpoints : RADIO_BROWSER_ENDPOINTS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const attempts: RadioBrowserErrorAttempt[] = [];
  let lastError: RadioBrowserClientError | null = null;

  for (const endpoint of endpoints) {
    const url = buildSearchUrl(endpoint, query);

    try {
      const payload = await fetchJsonWithTimeout(url, endpoint, timeoutMs);
      if (!Array.isArray(payload)) {
        throw new RadioBrowserClientError("Radio Browser payload schema was invalid", {
          type: "schema",
          endpoint
        });
      }

      return payload;
    } catch (error) {
      if (error instanceof RadioBrowserClientError) {
        lastError = error;
        attempts.push(buildAttempt(error));
      } else {
        const fallbackError = new RadioBrowserClientError("Radio Browser request failed", {
          type: "network",
          endpoint,
          cause: error
        });
        lastError = fallbackError;
        attempts.push(buildAttempt(fallbackError));
      }
    }
  }

  throw new RadioBrowserClientError("All Radio Browser endpoints failed", {
    type: lastError?.type ?? "network",
    endpoint: lastError?.endpoint ?? "unknown",
    status: lastError?.status ?? null,
    cause: lastError?.cause,
    attempts
  });
}
