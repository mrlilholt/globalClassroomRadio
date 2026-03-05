import { useMemo, useRef, useState } from "react";
import { useAppState } from "../../../state/AppStateProvider";
import { SAFE_TAGS } from "../../../constants/safeTags";
import { getStationFilterOptions } from "../../../services/filterEngine";
import { isDiscoveryDisabled } from "../../../services/classroomGuard";

function formatTag(tag: string): string {
  return tag
    .split(" ")
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
    .join(" ");
}

export function StationFilterPanel() {
  const {
    state: { stations, filters, safeOnly, classroomMode },
    dispatch
  } = useAppState();
  const [tagInput, setTagInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const countrySelectRef = useRef<HTMLSelectElement>(null);
  const discoveryDisabled = isDiscoveryDisabled(classroomMode);
  const activeFilterCount =
    (filters.country ? 1 : 0) +
    (filters.language ? 1 : 0) +
    filters.tags.length;

  const options = useMemo(() => getStationFilterOptions(stations), [stations]);
  const availableTags = useMemo(
    () => options.tags.filter((tag) => !filters.tags.includes(tag)),
    [options.tags, filters.tags]
  );
  const normalizedTagInput = tagInput.trim().toLowerCase();
  const suggestedTags = useMemo(() => {
    if (!normalizedTagInput) {
      return availableTags.slice(0, 8);
    }

    return availableTags.filter((tag) => tag.includes(normalizedTagInput)).slice(0, 8);
  }, [availableTags, normalizedTagInput]);

  const addTag = (tag: string) => {
    if (discoveryDisabled) {
      return;
    }

    if (filters.tags.includes(tag)) {
      return;
    }

    dispatch({
      type: "SET_FILTERS",
      filters: {
        tags: [...filters.tags, tag]
      }
    });
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    if (discoveryDisabled) {
      return;
    }

    dispatch({
      type: "SET_FILTERS",
      filters: {
        tags: filters.tags.filter((selectedTag) => selectedTag !== tag)
      }
    });
  };

  const clearAll = () => {
    if (discoveryDisabled) {
      return;
    }

    dispatch({ type: "RESET_FILTERS" });
    setTagInput("");
    countrySelectRef.current?.focus();
  };

  return (
    <section className="panel col-12 filter-panel" aria-label="Station Filtering Panel">
      <div className="panel-heading-row">
        <h2 id="station-filters-heading">Station Filters</h2>
        <div className="filter-heading-actions">
          <p className={`status-pill ${discoveryDisabled ? "status-pill-warning" : "status-pill-success"}`}>
            {discoveryDisabled ? "Locked in classroom mode" : "Live updates enabled"}
          </p>
          <button
            type="button"
            className="text-button"
            aria-expanded={isExpanded}
            aria-controls="station-filter-controls"
            onClick={() => {
              setIsExpanded((current) => !current);
            }}
          >
            {isExpanded ? "Hide filters" : "Show filters"}
          </button>
        </div>
      </div>
      {!isExpanded ? (
        <p className="hint-text">
          {activeFilterCount === 0 ? "No active filters." : `${activeFilterCount} active filters.`} Safe-only:{" "}
          {safeOnly ? "On" : "Off"}.
        </p>
      ) : null}

      <div id="station-filter-controls" hidden={!isExpanded}>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={safeOnly}
            disabled={discoveryDisabled}
            onChange={(event) => {
              dispatch({ type: "SET_SAFE_ONLY", enabled: event.target.checked });
            }}
          />
          <span>Show kid-safe stations only</span>
        </label>
        <p className="hint-text">Safe tag list: {SAFE_TAGS.join(", ")}</p>
        {discoveryDisabled ? (
          <p className="hint-text">Discovery filters are locked while classroom mode is enabled.</p>
        ) : null}

        <div className="filter-controls" role="group" aria-labelledby="station-filters-heading">
          <div className="filter-field">
            <label htmlFor="country-filter">Country</label>
            <select
              id="country-filter"
              ref={countrySelectRef}
              value={filters.country ?? ""}
              disabled={discoveryDisabled}
              onChange={(event) => {
                dispatch({
                  type: "SET_FILTERS",
                  filters: {
                    country: event.target.value || null
                  }
                });
              }}
            >
              <option value="">All countries</option>
              {options.countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="language-filter">Language</label>
            <select
              id="language-filter"
              value={filters.language ?? ""}
              disabled={discoveryDisabled}
              onChange={(event) => {
                dispatch({
                  type: "SET_FILTERS",
                  filters: {
                    language: event.target.value || null
                  }
                });
              }}
            >
              <option value="">All languages</option>
              {options.languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field filter-tags">
            <label htmlFor="tag-filter-input">Tags</label>
            <input
              id="tag-filter-input"
              type="text"
              value={tagInput}
              placeholder="Search tags"
              disabled={discoveryDisabled}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }

                event.preventDefault();

                if (suggestedTags.length > 0) {
                  addTag(suggestedTags[0]);
                }
              }}
              role="combobox"
              aria-controls="tag-suggestions"
              aria-expanded={suggestedTags.length > 0}
            />

            {!discoveryDisabled && suggestedTags.length > 0 && (
              <ul id="tag-suggestions" className="tag-suggestion-list" role="listbox" aria-label="Tag suggestions">
                {suggestedTags.map((tag) => (
                  <li key={tag}>
                    <button
                      type="button"
                      className="tag-suggestion-button"
                      onClick={() => {
                        addTag(tag);
                      }}
                    >
                      {formatTag(tag)}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <ul className="tag-chip-list" aria-label="Selected tags">
              {filters.tags.map((tag) => (
                <li key={tag}>
                  <button type="button" className="tag-chip" disabled={discoveryDisabled} onClick={() => removeTag(tag)}>
                    {formatTag(tag)} <span aria-hidden="true">x</span>
                    <span className="sr-only">Remove {formatTag(tag)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="filter-actions">
            <button type="button" className="text-button" disabled={discoveryDisabled} onClick={clearAll}>
              Clear all
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
