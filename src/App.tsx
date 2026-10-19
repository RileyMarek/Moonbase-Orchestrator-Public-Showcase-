import { lazy, Suspense, useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { useAppStore } from "./store";
import { RuntimeProvider } from "./runtime";
const AstroView = lazy(() => import("./views/AstroView").then(module => ({default:module.AstroView})));
import { OperatorView } from "./views/OperatorView";
import { OperatorDialog } from "./components/operator/OperatorDialog";
import { LayoutSettings } from "./components/operator/LayoutSettings";
import "./Operator.css";

function ViewRouter() {
  const theme = useAppStore((s) => s.uiTheme),
    setTheme = useAppStore((s) => s.setUiTheme);
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    function handle(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "u"
      ) {
        event.preventDefault();
        setTheme(
          useAppStore.getState().uiTheme === "operator" ? "astro" : "operator",
        );
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [setTheme]);
  return (
    <>
      {theme === "operator" ? (
        <OperatorView />
      ) : (
        <>
          <Suspense fallback={<div className="op-loading">Loading workspace…</div>}><AstroView /></Suspense>
          <button
            className="op-legacy-settings"
            aria-label="Open settings"
            onClick={() => setSettings(true)}
          >
            <Settings size={15} /> Settings
          </button>
          {settings && (
            <OperatorDialog title="Settings" close={() => setSettings(false)}>
              <LayoutSettings />
            </OperatorDialog>
          )}
        </>
      )}
    </>
  );
}
export default function App() {
  return (
    <RuntimeProvider>
      <ViewRouter />
    </RuntimeProvider>
  );
}
