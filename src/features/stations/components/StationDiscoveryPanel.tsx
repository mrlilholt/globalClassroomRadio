import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../../../state/AppStateProvider";
import {
  RadioBrowserStationService,
  StationServiceError,
  type StationCoverageSnapshot
} from "../../../services/stationService";
import { filterStationsByQuery, filterStationsBySafety, tokenizeCsv } from "../../../services/filterEngine";
import { evaluateClassroomPolicy, isDiscoveryDisabled } from "../../../services/classroomGuard";

function formatTag(tag: string): string {
  return tag
    .split(" ")
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
    .join(" ");
}

type CoverageStatus = "idle" | "loading" | "partial" | "complete" | "error";

type CR3LanguagePath = "uzbek" | "russian" | "ukrainian";

interface CR3LanguageCopy {
  loading: string;
  error: string;
  partial: string;
  complete: string;
  emptyTitle: string;
  emptyHint: string;
}

const CR3_LANGUAGE_COPY: Record<CR3LanguagePath, CR3LanguageCopy> = {
  uzbek: {
    loading: "Expanding Uzbek safe-only coverage...",
    error: "Could not refresh Uzbek safe-only coverage. Showing last available results if any.",
    partial: "Uzbek safe-only coverage is partial",
    complete: "Uzbek safe-only coverage loaded",
    emptyTitle: "No Uzbek kid-safe stations match the current filters.",
    emptyHint: "Try removing extra tags, clearing country, or turning off safe-only to compare broader Uzbek results."
  },
  russian: {
    loading: "Expanding Russian safe-only coverage...",
    error: "Could not refresh Russian safe-only coverage. Showing last available results if any.",
    partial: "Russian safe-only coverage is partial",
    complete: "Russian safe-only coverage loaded",
    emptyTitle: "No Russian kid-safe stations match the current filters.",
    emptyHint: "Try removing extra tags, clearing country, or turning off safe-only to compare broader Russian results."
  },
  ukrainian: {
    loading: "Expanding Ukrainian safe-only coverage...",
    error: "Could not refresh Ukrainian safe-only coverage. Showing last available results if any.",
    partial: "Ukrainian safe-only coverage is partial",
    complete: "Ukrainian safe-only coverage loaded",
    emptyTitle: "No Ukrainian kid-safe stations match the current filters.",
    emptyHint: "Try removing extra tags, clearing country, or turning off safe-only to compare broader Ukrainian results."
  }
};

const CR3_LANGUAGE_ALIASES: Record<CR3LanguagePath, string[]> = {
  uzbek: ["uzbek", "o'zbek", "o‘zbek", "узбек", "ӯзбек", "ўзбек"],
  russian: ["russian", "русский", "русская", "русский язык"],
  ukrainian: ["ukrainian", "українська", "украинский", "українська мова"]
};

function detectCR3LanguagePath(language: string | null, safeOnly: boolean): CR3LanguagePath | null {
  if (!safeOnly || !language) {
    return null;
  }

  const normalizedLanguage = language.trim().toLowerCase();

  for (const [path, aliases] of Object.entries(CR3_LANGUAGE_ALIASES) as [CR3LanguagePath, string[]][]) {
    if (aliases.includes(normalizedLanguage)) {
      return path;
    }
  }

  return null;
}

function describeCoverage(
  status: CoverageStatus,
  snapshot: StationCoverageSnapshot | null,
  languagePath: CR3LanguagePath | null
): string {
  const localizedCopy = languagePath ? CR3_LANGUAGE_COPY[languagePath] : null;

  if (status === "idle") {
    return "Discovery coverage is paused.";
  }

  if (status === "loading") {
    return localizedCopy?.loading ?? "Expanding discovery coverage for current filters...";
  }

  if (status === "error") {
    return localizedCopy?.error ?? "Coverage update failed. Showing last available results if any.";
  }

  if (!snapshot) {
    return "Coverage details unavailable.";
  }

  const source =
    snapshot.cacheStatus === "miss"
      ? "Updated just now"
      : snapshot.cacheStatus === "fresh-hit"
        ? "Loaded from cache"
        : "Loaded from cache, refreshing";
  const failedWindows =
    snapshot.failedWindowCount > 0 ? ` (${snapshot.failedWindowCount} window${snapshot.failedWindowCount === 1 ? "" : "s"} failed)` : "";

  if (status === "partial" && localizedCopy) {
    return `${localizedCopy.partial}; ${source}; candidate pool ${snapshot.candidateCount}, windows ${snapshot.windowCount}${failedWindows}.`;
  }

  if (status === "complete" && localizedCopy) {
    return `${localizedCopy.complete}; ${source}; candidate pool ${snapshot.candidateCount}, windows ${snapshot.windowCount}${failedWindows}.`;
  }

  return `${source}; candidate pool ${snapshot.candidateCount}, windows ${snapshot.windowCount}${failedWindows}.`;
}

export function StationDiscoveryPanel() {
  const {
    state: { stations, filters, safeOnly, selectedStationId, whitelistIds, classroomMode },
    dispatch
  } = useAppState();
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [coverageStatus, setCoverageStatus] = useState<CoverageStatus>("loading");
  const [coverageSnapshot, setCoverageSnapshot] = useState<StationCoverageSnapshot | null>(null);

  const stationService = useMemo(() => new RadioBrowserStationService(), []);
  const discoveryDisabled = isDiscoveryDisabled(classroomMode);
  const cr3LanguagePath = useMemo(() => detectCR3LanguagePath(filters.language, safeOnly), [filters.language, safeOnly]);
  const shouldForceRefresh = useMemo(() => Boolean(filters.language && safeOnly), [filters.language, safeOnly]);
  const stationQuery = useMemo(
    () => ({
      country: filters.country ?? "",
      language: filters.language ?? "",
      tags: filters.tags.join(","),
      safeOnly
    }),
    [filters.country, filters.language, filters.tags, safeOnly]
  );

  function toUserErrorMessage(error: unknown): string {
    if (error instanceof StationServiceError) {
      switch (error.type) {
        case "timeout":
          return "Station directory timed out. Please retry.";
        case "http":
          return "Station directory is unavailable right now. Please retry.";
        case "parse":
        case "schema":
          return "Station data could not be read. Please retry.";
        case "network":
        default:
          return "Unable to reach station directory. Check connection and retry.";
      }
    }

    return "Unable to load stations.";
  }

  useEffect(() => {
    if (discoveryDisabled) {
      setIsLoading(false);
      setLoadError(null);
      setCoverageStatus("idle");
      return;
    }

    let isDisposed = false;
    setIsLoading(true);
    setLoadError(null);
    setCoverageStatus("loading");

    stationService
      .listStations(stationQuery, { forceRefresh: shouldForceRefresh })
      .then((loadedStations) => {
        if (isDisposed) {
          return;
        }

        dispatch({ type: "SET_STATIONS", stations: loadedStations });
        const snapshot = stationService.getLastCoverageSnapshot();
        setCoverageSnapshot(snapshot);
        setCoverageStatus(snapshot && snapshot.failedWindowCount > 0 ? "partial" : "complete");
      })
      .catch((error: unknown) => {
        if (isDisposed) {
          return;
        }

        if (error instanceof StationServiceError) {
          console.error("Station discovery load failed", {
            type: error.type,
            endpoint: error.endpoint,
            status: error.status,
            attempts: error.attempts
          });
        } else {
          console.error("Station discovery load failed", error);
        }

        setLoadError(toUserErrorMessage(error));
        setCoverageSnapshot(stationService.getLastCoverageSnapshot());
        setCoverageStatus("error");
      })
      .finally(() => {
        if (!isDisposed) {
          setIsLoading(false);
        }
      });

    return () => {
      isDisposed = true;
    };
  }, [dispatch, discoveryDisabled, reloadCount, shouldForceRefresh, stationQuery, stationService]);

  const filteredStations = useMemo(() => {
    const queryFiltered = filterStationsByQuery(stations, filters);
    const safeFiltered = filterStationsBySafety(queryFiltered, safeOnly);

    return [...safeFiltered].sort((left, right) => {
      if (left.audioCompatible !== right.audioCompatible) {
        return left.audioCompatible ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
  }, [filters, safeOnly, stations]);
  const emptyStateTitle = cr3LanguagePath ? CR3_LANGUAGE_COPY[cr3LanguagePath].emptyTitle : "No stations match these filters.";
  const emptyStateHint = cr3LanguagePath ? CR3_LANGUAGE_COPY[cr3LanguagePath].emptyHint : null;
  const loadingStateMessage = cr3LanguagePath ? CR3_LANGUAGE_COPY[cr3LanguagePath].loading : "Loading stations...";
  const partialCoverageHint =
    cr3LanguagePath && coverageStatus === "partial"
      ? "Some discovery windows failed in the last refresh. Retry may return additional stations."
      : null;
  const coverageDescription = useMemo(
    () => describeCoverage(discoveryDisabled ? "idle" : coverageStatus, coverageSnapshot, cr3LanguagePath),
    [coverageSnapshot, coverageStatus, cr3LanguagePath, discoveryDisabled]
  );

  return (
    <section className="panel col-12 discovery-panel" aria-label="Station Discovery Panel">
      <div className="panel-heading-row">
        <h2>Station Discovery</h2>
        <p id="result-summary" className="status-pill status-pill-neutral result-summary" aria-live="polite" tabIndex={-1}>
          {discoveryDisabled ? "Discovery locked" : `${filteredStations.length} stations shown`}
        </p>
      </div>
      <p className={`coverage-status coverage-status-${discoveryDisabled ? "idle" : coverageStatus}`} aria-live="polite">
        {coverageDescription}
      </p>

      {discoveryDisabled && (
        <div className="empty-state" role="status">
          <p>Classroom mode is active. Discovery interactions are locked.</p>
          <p className="hint-text">Use the Station Whitelist panel to select approved stations for playback.</p>
        </div>
      )}

      {!discoveryDisabled && isLoading && <p>{loadingStateMessage}</p>}
      {!discoveryDisabled && loadError && (
        <div className="empty-state" role="alert">
          <p className="error-text">{loadError}</p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setReloadCount((count) => count + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!discoveryDisabled && !isLoading && !loadError && filteredStations.length === 0 && (
        <div className="empty-state" role="status">
          <p>{emptyStateTitle}</p>
          {emptyStateHint ? <p className="hint-text">{emptyStateHint}</p> : null}
          {partialCoverageHint ? <p className="hint-text">{partialCoverageHint}</p> : null}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              dispatch({ type: "RESET_FILTERS" });
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {!discoveryDisabled && !isLoading && !loadError && filteredStations.length > 0 && (
        <ul id="station-results-list" className="station-list">
          {filteredStations.map((station) => {
            const isSelected = selectedStationId === station.stationuuid;
            const isWhitelisted = whitelistIds.includes(station.stationuuid);
            const selectionPolicy = evaluateClassroomPolicy({
              stationId: station.stationuuid,
              classroomMode,
              whitelistIds,
              discoveryInteraction: true
            });
            const canPreview = selectionPolicy.allowed && station.audioCompatible;
            const canWhitelist = selectionPolicy.allowed && station.audioCompatible;

            return (
              <li
                key={station.stationuuid}
                className={`station-card${isSelected ? " is-selected" : ""}${isWhitelisted ? " is-saved" : ""}`}
              >
                <h3 className="station-name">{station.name}</h3>
                <p className="station-meta">
                  {station.country} | {station.language}
                </p>
                <ul className="station-flag-list" aria-label={`${station.name} source and compatibility`}>
                  <li className="station-flag station-flag-source">{station.source}</li>
                  <li className={`station-flag ${station.audioCompatible ? "station-flag-audio" : "station-flag-blocked"}`}>
                    {station.audioCompatible ? "Audio compatible" : `Not supported (${station.streamType})`}
                  </li>
                  {station.supplemental ? <li className="station-flag station-flag-supplemental">Supplemental</li> : null}
                </ul>
                {!station.audioCompatible ? (
                  <p className="hint-text">This stream is video/HLS and is hidden from player controls by default.</p>
                ) : null}
                <ul className="station-tag-list" aria-label={`${station.name} tags`}>
                  {tokenizeCsv(station.tags).map((tag) => (
                    <li key={tag}>{formatTag(tag)}</li>
                  ))}
                </ul>
                <div className="station-card-actions">
                  <button
                    type="button"
                    className={`text-button station-select-button${isSelected ? " is-selected" : ""}`}
                    aria-pressed={isSelected}
                    disabled={!canPreview}
                    onClick={() => {
                      dispatch({ type: "SET_SELECTED_STATION", stationId: station.stationuuid });
                    }}
                  >
                    {!station.audioCompatible ? "Preview unavailable" : isSelected ? "Selected for preview" : "Select for preview"}
                  </button>
                  <button
                    type="button"
                    className={`text-button station-save-button${isWhitelisted ? " is-saved" : ""}`}
                    aria-pressed={isWhitelisted}
                    disabled={!canWhitelist}
                    onClick={() => {
                      dispatch({
                        type: "SET_WHITELIST",
                        ids: isWhitelisted
                          ? whitelistIds.filter((id) => id !== station.stationuuid)
                          : [...whitelistIds, station.stationuuid]
                      });
                    }}
                  >
                    {!station.audioCompatible
                      ? "Cannot whitelist (unplayable)"
                      : isWhitelisted
                        ? "Saved to whitelist"
                        : "Save to whitelist"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
