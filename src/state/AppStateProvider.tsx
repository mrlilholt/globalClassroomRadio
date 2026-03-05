import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { appReducer, initialState } from "./appState";
import type { AppAction, AppState } from "./appState";
import { loadWhitelist, saveWhitelist } from "../services/localStorageService";

interface AppStateContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState, (baseState) => ({
    ...baseState,
    whitelistIds: loadWhitelist()
  }));

  useEffect(() => {
    saveWhitelist(state.whitelistIds);
  }, [state.whitelistIds]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }

  return context;
}
