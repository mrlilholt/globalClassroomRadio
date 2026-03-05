import { TopBar } from "../components/layout/TopBar";
import { StationDiscoveryPanel } from "../features/stations/components/StationDiscoveryPanel";
import { StationFilterPanel } from "../features/filters/components/StationFilterPanel";
import { PlayerPanel } from "../features/player/components/PlayerPanel";
import { WhitelistPanel } from "../features/whitelist/components/WhitelistPanel";
import { ClassroomModePanel } from "../features/classroom/components/ClassroomModePanel";

export function AppShell() {
  return (
    <>
      <TopBar />
      <main className="app-main">
        <div className="layout-grid">
          <StationFilterPanel />
          <StationDiscoveryPanel />
          <WhitelistPanel />
          <ClassroomModePanel />
        </div>
      </main>
      <PlayerPanel />
    </>
  );
}
