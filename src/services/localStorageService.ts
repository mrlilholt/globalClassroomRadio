const WHITELIST_KEY = "gcr.whitelist";

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function loadWhitelist(): string[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(WHITELIST_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function saveWhitelist(ids: string[]) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(WHITELIST_KEY, JSON.stringify(ids));
}
