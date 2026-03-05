import { AppShell } from "./app/AppShell";
import { AppStateProvider } from "./state/AppStateProvider";

function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}

export default App;
