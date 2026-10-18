import { Component, type ReactNode } from 'react';
import { Scene } from './Scene';
import { fleet, useDemo, voxels } from './store';

class ViewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert">The 3D view could not start. Telemetry is still available; try a WebGL-capable browser.</p> : this.props.children; }
}
export function App() {
  const { frame, paused, selected, showVoxels, plan } = useDemo();
  const active = selected === 'bot-01';
  const robot = fleet.find(r => r.id === selected)!;
  return <main>
    <header><a className="brand" href="./">M<span> / </span>MOONBASE</a><span className="subtitle">SPATIAL COMMAND / PUBLIC PREVIEW</span><span className="badge">● SYNTHETIC DEMO</span></header>
    <div className="intro"><div><p className="eyebrow">FROM INTENT TO EMBODIED ACTION</p><h1>One space. Every agent.</h1><p className="muted">A browser window into heterogeneous robot orchestration.</p></div><div className="intro-note">NO GPU REQUIRED<br /><span>All telemetry generated on your device.</span></div></div>
    <div className="console">
      <aside className="fleet"><div className="panel-title">FLEET <span>03 UNITS</span></div>{fleet.map((r, i) => <button key={r.id} aria-pressed={selected === r.id} className={`unit ${selected === r.id ? 'selected' : ''}`} onClick={() => useDemo.setState({ selected: r.id })}><span className="unit-index">0{i + 1}</span><strong>{r.name}<small>{r.id}</small></strong><span className={`status ${r.state === 'ACTIVE' ? 'on' : ''}`}>{r.state}</span></button>)}<div className="fleet-foot"><p className="eyebrow">ENVIRONMENT / ELBOW-V1</p><p>19 articulated joints.<br />Three embodiments.<br />One spatial interface.</p><hr /><p className="muted">Illustrative geometry and scripted motion. This preview does not run a locomotion policy or VLM inference.</p></div></aside>
      <section className="viewport" aria-label="Interactive spatial twin"><div className="view-top"><span>01 / DIGITAL TWIN</span><span className="cyan">{paused ? 'PAUSED' : 'DEMO STREAM'} · {frame.time.toFixed(1)}s / 60s</span></div><ViewBoundary><Scene /></ViewBoundary><div className="hud"><span className="badge">H1 / SYNTHETIC GAIT</span><p>v<sub>x</sub> = {(paused ? 0 : frame.speed).toFixed(2)} m/s <span>· WALK IN PLACE</span></p></div><div className="view-tools"><button aria-pressed={plan} onClick={() => useDemo.setState({ plan: !plan })}>{plan ? 'Perspective view' : 'Elevated view'}</button><button aria-pressed={showVoxels} onClick={() => useDemo.setState({ showVoxels: !showVoxels })}>Voxels {showVoxels ? 'on' : 'off'}</button><span>DRAG TO ORBIT / SCROLL TO ZOOM</span></div></section>
      <aside className="telemetry"><div className="panel-title">JOINT DYNAMICS <span>Nm</span></div><h2>{robot.name}</h2><p className="muted">{active ? 'Synthetic effort / 1.2 Hz gait' : 'Standby / no telemetry generated'}</p><div className="bars">{Object.entries(frame.efforts).map(([name, effort]) => <div className="bar-row" key={name}><span>{name.replace('_joint', '').replace('left_', 'L / ').replace('right_', 'R / ').replaceAll('_', ' ')}</span><div className="track"><i style={{ width: `${active ? effort / 50 * 100 : 0}%` }} /></div><b>{active ? effort.toFixed(1) : '—'}</b></div>)}</div><div className="stats"><span>OCCUPANCY<strong>{voxels.cells.size} cells</strong></span><span>CONTRACT<strong>MBVX v1</strong></span></div></aside>
    </div>
    <footer><span>PUBLIC SHOWCASE / LOCAL CONTROLS ONLY</span><div><button onClick={() => useDemo.setState({ paused: !paused })}>{paused ? 'Resume demo' : 'Pause demo'}</button><button onClick={() => useDemo.setState({ paused: true, frame: { ...frame, speed: 0 } })} className="stop">STOP DEMO</button></div><span>No connection to physical hardware</span></footer>
  </main>;
}
