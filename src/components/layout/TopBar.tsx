import { useAppState } from "../../state/AppStateProvider";

export function TopBar() {
  const {
    state: { classroomMode, safeOnly }
  } = useAppState();

  return (
    <header className="app-header">
      <div className="app-header-content">
        <div className="app-header-brand">
          <img
            src="/global-classroom-radio-logo.png"
            alt="Global Classroom Radio logo"
            className="app-header-logo"
            loading="eager"
          />
          <div>
            <h1>Global Classroom Radio</h1>
            <p className="app-header-subtitle">Discover, filter, and preview station streams with classroom-safe controls.</p>
          </div>
        </div>
        <div className="status-row" aria-label="Current filter and classroom status">
          <span className={`badge ${classroomMode ? "badge-on" : "badge-off"}`}>
            Classroom Mode: {classroomMode ? "On" : "Off"}
          </span>
          <span className={`badge ${safeOnly ? "badge-on" : "badge-off"}`}>Safe Filter: {safeOnly ? "On" : "Off"}</span>
        </div>
      </div>
    </header>
  );
}
