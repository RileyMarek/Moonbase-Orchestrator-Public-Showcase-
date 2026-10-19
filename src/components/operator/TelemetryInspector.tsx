import { useTelemetryDisplay } from '../../hooks/useTelemetryDisplay';
import { Brain } from 'lucide-react';

import { useAppStore } from '../../store';

import { useMoonbaseRuntime } from '../../hooks/useMoonbaseRuntime';

import { HeadCamera } from './HeadCamera';



function Gauge({label, value, unit, fraction, dangerUp=false}: {label:string; value:string; unit:string; fraction:number|null; dangerUp?:boolean}) {

  const fill = useTelemetryDisplay(fraction == null ? 0 : Math.max(0, Math.min(1, fraction)), dangerUp);

  return <div className="op-metric-gauge" data-exceeded={fraction != null && fraction > 1}>

    <svg viewBox="0 0 80 80" aria-hidden="true"><circle className="track" cx="40" cy="40" r="33"/>

      <circle className="reading" cx="40" cy="40" r="33" pathLength="100" strokeDasharray={`${fill * 100} 100`} transform="rotate(-90 40 40)"/></svg>

    <div><strong>{value}</strong><small>{unit}</small></div><span>{label}</span>

  </div>;

}



export function TelemetryInspector({openBrain,showCamera=true,showJoints=false}: {openBrain:()=>void;showCamera?:boolean;showJoints?:boolean}) {

  const {control:{snapshot}, telemetry} = useMoonbaseRuntime();

  const robot = useAppStore(s=>s.robots.find(r=>r.id===s.selectedRobotId));

  const active = robot?.mode==='simulation' && snapshot?.robotId===robot.id;

  const fresh = !!active && !!snapshot?.runtimeFresh;

  const cached=snapshot?.displayTelemetry;

  const displayed=!!active && !!cached?.valid;

  const speed = displayed ? cached?.speed : null;

  const cadence = displayed ? cached?.hz : null;

  const age = displayed && cached?.depth != null ? cached.depth * 1000 : null;

  const heading = fresh && snapshot?.pose ? snapshot.pose[2] * 180 / Math.PI : null;

  const names = Object.keys(robot?.joints || {});

  const final = snapshot?.mission?.state === 'succeeded' ? [...snapshot.mission.steps].reverse().find(s=>s.result?.goal_verified)?.result : null;

  const turning = snapshot?.motion.kind === 'turn';

  return <>

    {showCamera && <section className="op-panel op-inspector op-vision-panel" aria-label="Head camera">

      <header><h2>Head camera</h2><span className={fresh && snapshot?.perception?.ready ? 'op-live' : 'op-muted'}>{fresh && snapshot?.perception?.ready ? 'LIVE' : 'WAITING'}</span></header>

      <HeadCamera key={robot?.id || 'none'} robotId={robot?.id || ''} enabled={fresh} ageMs={age}/>

      <div className="op-vision-meta"><span>{robot?.id || 'Select a unit'}</span><span>{age != null ? `${Math.round(age)} ms depth` : 'No live frame'}</span></div>

      <button className="op-wide op-brain-button" onClick={openBrain}><Brain size={14}/> Inspect visual proposal</button>

    </section>}

    <section className="op-panel op-inspector" aria-label="Telemetry">

      <header><h2>Telemetry</h2><span className={fresh ? 'op-live' : 'op-muted'}>{fresh ? snapshot?.motion.state : displayed ? 'LAST READING' : 'OFFLINE'}</span></header>

      <div className="op-metric-gauges">

        <Gauge label="Base speed" value={speed != null ? speed.toFixed(3) : '—'} unit="m/s" fraction={speed != null ? speed / .4 : null}/>

        <Gauge label="Controller" value={cadence != null ? cadence.toFixed(1) : '—'} unit="Hz / 20" fraction={cadence != null ? cadence / 20 : null}/>

        <Gauge label="Depth age" value={age != null ? Math.round(age).toString() : '—'} unit="ms / 850" dangerUp fraction={age != null ? age / 850 : null}/>

      </div>

      <div className="op-navigation-summary">

        <svg className="op-compact-compass" viewBox="0 0 60 60" role="img" aria-label={heading == null ? 'Heading unavailable' : `Heading ${heading.toFixed(1)} degrees`}>

          <circle cx="30" cy="30" r="25"/><text x="30" y="12">+X</text>

          {heading != null && <path d="M30 17 L34 34 L30 31 L26 34 Z" transform={`rotate(${-heading} 30 30)`}/>}

        </svg>

        <div><b>{heading != null ? `${heading.toFixed(1)}°` : '—'}</b><span>Heading</span></div>

        <div><b>{fresh && snapshot?.pose ? `${snapshot.pose[0].toFixed(2)}, ${snapshot.pose[1].toFixed(2)}` : '—'}</b><span>World X / Y · m</span></div>

      </div>

      <dl className="op-readings">

        <div><dt>Observed map</dt><dd>{fresh ? `${snapshot?.perception?.map?.voxels.toLocaleString() || 0} cells` : '—'}</dd></div>

        <div><dt>{final ? 'Arrival error' : turning ? 'Heading error' : 'Goal remaining'}</dt><dd>{!fresh ? '—' : final?.remaining_m != null ? `${(final.remaining_m*100).toFixed(1)} cm` : snapshot?.motion.remaining != null ? turning ? `${snapshot.motion.remaining.toFixed(3)} rad` : `${(snapshot.motion.remaining*100).toFixed(1)} cm` : '—'}</dd></div>

        <div><dt>Stationary hold</dt><dd>{fresh ? snapshot?.planning?.stationary ? 'Verified' : 'Moving / settling' : '—'}</dd></div>

      </dl>

      <details className="op-metric-details"><summary>Navigation & connection</summary>

        <dl className="op-readings">

          <div><dt>Safety radius</dt><dd>{fresh && snapshot?.navigation?.footprint_radius_m != null ? `${snapshot.navigation.footprint_radius_m.toFixed(2)} m` : '—'}</dd></div>

          <div><dt>Replans / revocations</dt><dd>{fresh ? snapshot?.navigation?.revocations ?? '—' : '—'}</dd></div>

          <div><dt>Provider</dt><dd>{snapshot?.cloud?.provider || 'Offline'}</dd></div>

          <div><dt>Link</dt><dd>{telemetry.status}</dd></div>

        </dl>

      </details>

      <details open={showJoints || undefined} className="op-metric-details"><summary>Joint states · {fresh ? names.length : 0} channels</summary>

        <table className="op-compact-joints"><thead><tr><th>Joint</th><th>rad</th><th>rad/s</th><th>N·m</th></tr></thead><tbody>{fresh && names.map(name=><tr key={name}><th>{name}</th><td>{robot!.joints![name].toFixed(2)}</td><td>{robot?.velocities?.[name]?.toFixed(2) ?? '—'}</td><td>{robot?.efforts?.[name]?.toFixed(2) ?? '—'}</td></tr>)}</tbody></table>

        <p className="op-muted op-inspector-footnote">Measured joint position, velocity and effort. Missing values appear as —.</p>

      </details>

    </section>

  </>;

}

