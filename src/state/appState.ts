import type { RadioStation, StationFilters } from "../types/radio";
import { enforceClassroomSelection } from "../services/classroomGuard";

export interface AppState {
  classroomMode: boolean;
  safeOnly: boolean;
  selectedStationId: string | null;
  whitelistIds: string[];
  stations: RadioStation[];
  filters: StationFilters;
}

export type AppAction =
  | { type: "SET_CLASSROOM_MODE"; enabled: boolean }
  | { type: "SET_SAFE_ONLY"; enabled: boolean }
  | { type: "SET_SELECTED_STATION"; stationId: string | null }
  | { type: "SET_FILTERS"; filters: Partial<StationFilters> }
  | { type: "RESET_FILTERS" }
  | { type: "SET_WHITELIST"; ids: string[] }
  | { type: "SET_STATIONS"; stations: RadioStation[] };

export const initialState: AppState = {
  classroomMode: false,
  safeOnly: true,
  selectedStationId: null,
  whitelistIds: [],
  stations: [],
  filters: {
    country: null,
    language: null,
    tags: []
  }
};

function normalizeWhitelistIds(ids: string[]): string[] {
  const uniqueIds = new Set(
    ids
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
  );

  return Array.from(uniqueIds);
}

function normalizeTags(tags: string[]): string[] {
  const uniqueTags = new Set(
    tags
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0)
  );

  return Array.from(uniqueTags);
}

function normalizeFilters(filters: Partial<StationFilters>, current: StationFilters): StationFilters {
  return {
    country: filters.country === undefined ? current.country : filters.country,
    language: filters.language === undefined ? current.language : filters.language,
    tags: filters.tags === undefined ? current.tags : normalizeTags(filters.tags)
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_CLASSROOM_MODE": {
      const classroomMode = action.enabled;
      return {
        ...state,
        classroomMode,
        selectedStationId: enforceClassroomSelection(state.selectedStationId, classroomMode, state.whitelistIds)
      };
    }
    case "SET_SAFE_ONLY":
      return { ...state, safeOnly: action.enabled };
    case "SET_SELECTED_STATION":
      return {
        ...state,
        selectedStationId: enforceClassroomSelection(action.stationId, state.classroomMode, state.whitelistIds)
      };
    case "SET_FILTERS":
      return { ...state, filters: normalizeFilters(action.filters, state.filters) };
    case "RESET_FILTERS":
      return { ...state, filters: initialState.filters };
    case "SET_WHITELIST": {
      const whitelistIds = normalizeWhitelistIds(action.ids);
      return {
        ...state,
        whitelistIds,
        selectedStationId: enforceClassroomSelection(state.selectedStationId, state.classroomMode, whitelistIds)
      };
    }
    case "SET_STATIONS":
      return { ...state, stations: action.stations };
    default:
      return state;
  }
}
