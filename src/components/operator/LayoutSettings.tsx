import { useAppStore } from "../../store";
import { Sun, Moon } from 'lucide-react';

export function LayoutSettings() {
  const { colorMode, setColorMode, sceneMotion, setSceneMotion } = useAppStore();
  const theme = useAppStore((s) => s.uiTheme),
    setTheme = useAppStore((s) => s.setUiTheme);
  return (
    <div className="op-layout-settings">
      <h3>Appearance</h3>
      <p>Choose the Operator workspace appearance and digital twin lighting.</p>
      <div className="op-appearance-options" role="group" aria-label="Color mode">
        <button aria-pressed={colorMode === 'light'} onClick={() => setColorMode('light')}><Sun size={20}/><strong>Light</strong><small>Soft daylight · porcelain surfaces</small></button>
        <button aria-pressed={colorMode === 'dark'} onClick={() => setColorMode('dark')}><Moon size={20}/><strong>Dark</strong><small>Night studio · luminous guidance</small></button>
      </div>
      <label className="op-motion-setting"><input type="checkbox" checked={sceneMotion} onChange={e => setSceneMotion(e.target.checked)}/>Animate live evidence<span>Route flow and new sensor observations. Robot pose always follows telemetry.</span></label>
      <h3>Interface</h3>
      <p>
        Choose a layout. Connections, mission drafts and active execution remain
        shared.
      </p>
      <label>
        <input
          type="radio"
          name="layout"
          checked={theme === "operator"}
          onChange={() => setTheme("operator")}
        />{" "}
        Operator <span>Precise fleet and mission workspace</span>
      </label>
      <label>
        <input
          type="radio"
          name="layout"
          checked={theme === "astro"}
          onChange={() => setTheme("astro")}
        />{" "}
        Retro ASTRO <span>Original companion and instruments layout</span>
      </label>
      <p>
        Shortcut: Ctrl / Cmd + Shift + U. Your choice is saved on this browser.
      </p>
    </div>
  );
}
