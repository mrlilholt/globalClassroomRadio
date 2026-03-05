import { useAppState } from "../../../state/AppStateProvider";

export function ClassroomModePanel() {
  const {
    state: { classroomMode, whitelistIds },
    dispatch
  } = useAppState();

  return (
    <section className="panel col-12 classroom-panel" aria-label="Classroom Mode Panel">
      <div className="panel-heading-row">
        <h2>Classroom Mode</h2>
        <p className={`status-pill ${classroomMode ? "status-pill-warning" : "status-pill-success"}`}>
          {classroomMode ? "Restrictions active" : "Open discovery mode"}
        </p>
      </div>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={classroomMode}
          onChange={(event) => {
            dispatch({ type: "SET_CLASSROOM_MODE", enabled: event.target.checked });
          }}
        />
        <span>Enforce classroom restrictions</span>
      </label>
      <p className="panel-meta">
        Current state: <strong>{classroomMode ? "Enabled" : "Disabled"}</strong>.
      </p>
      <p className="panel-meta">Approved stations in whitelist: {whitelistIds.length}</p>
      {classroomMode ? <p className="hint-text">Discovery and filter interactions are locked while classroom mode is active.</p> : null}
      {classroomMode && whitelistIds.length === 0 ? (
        <p className="warning-text">No stations are currently playable because the classroom whitelist is empty.</p>
      ) : null}
    </section>
  );
}
