import { useMemo } from "react";
import { useAppState } from "../../../state/AppStateProvider";

export function WhitelistPanel() {
  const {
    state: { whitelistIds, stations, selectedStationId, classroomMode },
    dispatch
  } = useAppState();

  const whitelistedStations = useMemo(() => {
    const stationMap = new Map(stations.map((station) => [station.stationuuid, station]));
    return whitelistIds.map((id) => stationMap.get(id) ?? null);
  }, [stations, whitelistIds]);

  const removeFromWhitelist = (stationId: string) => {
    dispatch({
      type: "SET_WHITELIST",
      ids: whitelistIds.filter((id) => id !== stationId)
    });
  };

  const selectWhitelistedStation = (stationId: string) => {
    dispatch({ type: "SET_SELECTED_STATION", stationId });
  };

  return (
    <section className="panel col-6 whitelist-panel" aria-label="Station Whitelist Panel">
      <div className="panel-heading-row">
        <h2>Saved Stations</h2>
        <p className="status-pill status-pill-neutral" aria-live="polite">
          {whitelistIds.length} saved
        </p>
      </div>
      <p className="hint-text">Teacher-approved stations for classroom playback.</p>
      {classroomMode ? <p className="hint-text">Classroom mode is enabled: only these stations can be played.</p> : null}

      {whitelistIds.length === 0 ? (
        <div className="empty-state" role="status">
          <p>No stations saved yet.</p>
          <p className="hint-text">Use "Save to whitelist" in Station Discovery to add approved stations.</p>
        </div>
      ) : (
        <ul className="whitelist-list" aria-label="Saved whitelist stations">
          {whitelistIds.map((stationId, index) => {
            const station = whitelistedStations[index];
            return (
              <li key={stationId} className={`whitelist-item${selectedStationId === stationId ? " is-selected" : ""}`}>
                <div>
                  <p className="whitelist-name">{station?.name ?? "Saved station"}</p>
                  <p className="whitelist-meta">{station ? `${station.country} | ${station.language}` : stationId}</p>
                </div>
                <div className="whitelist-actions">
                  <button
                    type="button"
                    className={`text-button primary-button whitelist-select-button${selectedStationId === stationId ? " is-selected" : ""}`}
                    aria-pressed={selectedStationId === stationId}
                    disabled={!station}
                    onClick={() => {
                      selectWhitelistedStation(stationId);
                    }}
                  >
                    {selectedStationId === stationId ? "Selected" : "Select for preview"}
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      removeFromWhitelist(stationId);
                    }}
                  >
                    Remove
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
