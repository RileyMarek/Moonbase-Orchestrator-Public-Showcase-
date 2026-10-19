import { useEffect, useState } from 'react';

import { Activity, Box, Camera, ChevronRight, Crosshair, Network, Radio, Search, Settings, X } from 'lucide-react';

import { useAppStore } from '../store';

import { useMoonbaseRuntime } from '../hooks/useMoonbaseRuntime';

import { Viewport3D } from '../components/Viewport3D';

import { MissionTimeline } from '../components/operator/MissionTimeline';

import { TelemetryInspector } from '../components/operator/TelemetryInspector';

import { FleetDeployment } from '../components/operator/FleetDeployment';

import { BrainProvider } from '../components/operator/BrainProvider';

import { MolmoPreview } from '../components/operator/MolmoPreview';

import { WaypointProofPanel } from '../components/operator/WaypointProof';

import { TaskContext } from '../components/operator/TaskContext';

import { describeCommand } from '../telemetry/missionView';

import moonbaseLogo from '../assets/moonbase-logo.png';

import '../SpatialHUD.css';
import { useTelemetryDisplay } from '../hooks/useTelemetryDisplay';
import { ViewportZoom } from '../components/operator/ViewportZoom';
import { PoseBookmarks } from '../components/operator/PoseBookmarks';
import { usePoseBookmarks } from '../hooks/usePoseBookmarks';



type Drawer = 'fleet' | 'perception' | 'joints' | 'settings' | 'mission' | 'bookmarks' | null;

export function OperatorView() {

  const state = useAppStore();

  const { telemetry, control, mission: m } = useMoonbaseRuntime();

  const snapshot = control.snapshot;

  const [drawer, setDrawer] = useState<Drawer>(null);

  const [query, setQuery] = useState('');

  const [overview,setOverview]=useState(false);

  const [placing, setPlacing] = useState(false);
  const [pinning,setPinning]=useState(false);
  const [pin,setPin]=useState<number[]|null>(null);
  const bookmarks=usePoseBookmarks(snapshot?.robotId || '',snapshot?.fleet?.environment?.revision);

  const [perception, setPerception] = useState(true);

  const [voxels, setVoxels] = useState(false);

  const fleet = state.robots.filter(r => r.mode === state.appMode);

  const robot = fleet.find(r => r.id === state.selectedRobotId);

  const sim = state.appMode === 'simulation';

  const open = (next: Drawer) => {if(next==='fleet'){setOverview(true);state.setViewMode('perspective');}setDrawer(current => current === next ? null : next);};

  useEffect(() => {

    const close = (e: KeyboardEvent) => { if(e.key === 'Escape') { setDrawer(null); setPlacing(false); setPinning(false); } };

    window.addEventListener('keydown', close);

    return () => window.removeEventListener('keydown', close);

  }, []);
  useEffect(()=>{
    const hold=(event:KeyboardEvent)=>{
      const element=event.target as HTMLElement;
      if(event.code==='Space' && !event.repeat && !element.closest('input,textarea,select,[contenteditable=true]') && m.running && !m.held){event.preventDefault();void m.pause();}
    };
    window.addEventListener('keydown',hold);
    return()=>window.removeEventListener('keydown',hold);
  },[m]);

  const model = robot?.type === 'amr' ? 'Nova Carter' : robot?.type === 'quadruped' ? 'Unitree Go2' : 'Unitree H1';

  const rows = m.running ? m.mission?.steps.map(s => s.command) || [] : m.steps;

  const readings=snapshot?.displayTelemetry;

  const showingReadings=!!readings?.valid;
  const speedBar = useTelemetryDisplay(Math.min(1,(showingReadings ? readings?.speed || 0 : 0)/.4));
  const cadenceBar = useTelemetryDisplay(Math.min(1,(showingReadings ? readings?.hz || 0 : 0)/20));
  const depthBar = useTelemetryDisplay(showingReadings && readings?.depth != null ? Math.min(1,readings.depth/.85) : 0, true);

  const status = m.pending ? 'Preparing…' : m.held ? 'Held · queue saved' : m.mission?.state==='holding' ? 'Braking to hold…' : m.running ? 'Mission in progress' : snapshot?.busy ? 'Robot moving' : snapshot?.runtimeFresh ? 'Connected' : 'Reconnecting';

  return <div className={`operator-app spatial-hud ${state.colorMode}`}>

    <main className="hud-world" aria-label="Spatial environment">

      <Viewport3D presentation="operator" spatial={sim ? snapshot : null} course={sim ? snapshot?.course : null}

        selectionEnabled={!m.locked} overviewPanel={drawer==='fleet'} onRobotFocus={()=>{setOverview(false);setDrawer(null);}} overview={overview} showPerception={perception} showVoxels={voxels} steps={rows}

        locations={Object.values(bookmarks.data.items).filter(b=>b.available).map(b=>({name:b.label,pose:b.pose}))}
        drafting={(placing || pinning) && !m.locked} onDraft={(x,y) => {if(pinning){setPin([Number(x.toFixed(2)),Number(y.toFixed(2))]);setPinning(false);setDrawer('bookmarks');}else m.edit([...m.steps,{kind:'walk',x:Number(x.toFixed(2)),y:Number(y.toFixed(2)),tolerance:.1,timeout_sec:180,global_route:true}]);}}/>

    </main>

    <header className="hud-header">

      <div className="hud-date">{new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short'}).format(new Date())}<span>Spatial orchestration</span></div>

      <div className="hud-header-actions"><button className="hud-pill" onClick={()=>open('settings')} aria-expanded={drawer==='settings'}><Settings size={17}/> Settings</button><img src={moonbaseLogo} alt="Moonbase"/></div>

    </header>

    <div className="hud-agent-row">

      <label className="hud-pill hud-agent"><span className={`hud-dot ${snapshot?.runtimeFresh?'live':''}`}/><select aria-label="Active fleet unit" value={state.selectedRobotId || ''} disabled={m.locked} onChange={e=>{state.selectRobot(e.target.value || null);setOverview(!e.target.value);}}><option value="">Fleet overview</option>{fleet.map(r=><option key={r.id} value={r.id}>{r.id} | {r.type==='amr'?'Nova Carter':r.type==='quadruped'?'Unitree Go2':'Unitree H1'}</option>)}</select></label>

      <button className="hud-pill hud-mode" onClick={()=>open('settings')}>{sim?'SIM':'PHYS'} <span> / {sim?'PHYS':'SIM'}</span></button>

    </div>

    <nav className="hud-tools" aria-label="Spatial tools"><small>Tools</small>

      <button aria-pressed={drawer==='fleet'} onClick={()=>open('fleet')}><Network size={20}/> Fleet</button>

      <div className="hud-camera-tool"><Camera size={20}/><span>Camera</span><div className="hud-switch" aria-label="Camera projection"><button aria-pressed={state.viewMode==='perspective'} onClick={()=>{setOverview(false);state.setViewMode('perspective');}}>3D</button><button aria-pressed={state.viewMode==='plan'} onClick={()=>{setOverview(false);state.setViewMode('plan');}}>2D</button></div></div>

      <button aria-pressed={placing} disabled={m.locked || !sim} onClick={()=>{setOverview(false);setPinning(false);setPlacing(!placing);m.setMode('manual')}}><Crosshair size={20}/> Waypoints</button>
      <button aria-pressed={drawer==='bookmarks'||pinning} onClick={()=>open('bookmarks')}><Search size={20}/> Locations</button>

      <button aria-pressed={perception} onClick={()=>{setPerception(!perception);open('perception')}}><Radio size={20}/> Perception</button>

      <button aria-pressed={voxels} onClick={()=>setVoxels(!voxels)}><Box size={20}/> Voxels</button>

      <button aria-pressed={drawer==='joints'} onClick={()=>open('joints')}><Activity size={20}/> Joints</button>

    </nav>

    <button title="Last measured readings; brief gaps retain values for up to five seconds. Control rate is from the last active run." className="hud-vitals" onClick={()=>open('joints')} aria-label="Open telemetry">

      <div className="hud-equalizer">{[speedBar,cadenceBar,depthBar].map((v,i)=><div key={i} className={i===2?'orange':''}>{Array.from({length:16},(_,n)=><i key={n} className={15-n < v*16?'lit':''}/>)}</div>)}</div>

      <div className="hud-vital-labels"><span>Speed<b>{showingReadings?readings?.speed?.toFixed(2) ?? '—':'—'} m/s</b></span><span>Control<b>{showingReadings?readings?.hz?.toFixed(0) ?? '—':'—'} Hz</b></span><span>Depth<b>{showingReadings&&readings?.depth!=null?Math.round(readings.depth*1000):'—'} ms</b></span></div>

      <small>{model} · {status}</small>

    </button>

    <div className="hud-scene-note">{pinning?'Click the floor to place a location · Esc to cancel':placing?'Click the floor to add waypoints · Esc to finish':snapshot?.fleet?.environment?.id || 'Waiting for scene'}<span>{snapshot?.fleet?.environment?'Isaac ground truth':'Drafting never sends motion'}</span></div>

    <section className="hud-mission" aria-label="Mission control">

      <div className="hud-mission-label"><span>Mission control <small>{status}</small></span><select aria-label="Control strategy" value={m.mode} disabled={m.locked} onChange={e=>m.setMode(e.target.value as 'agent'|'manual')}><option value="agent">Agentic</option><option value="manual">Sequence</option></select></div>

      <form className="hud-command-bar" onSubmit={e=>{e.preventDefault();void m.dispatchGoal()}}>

        {m.mode==='agent'?<><div className="hud-objective"><label htmlFor="mission-objective">Instruction</label><input id="mission-objective" aria-label="Task objective" placeholder="Visit the terminal, inspect it, then return home…" value={m.goal} disabled={m.locked} maxLength={1000} onChange={e=>m.setGoal(e.target.value)}/></div><button hidden={m.held} className="hud-dispatch" disabled={m.locked || !sim || !m.goal.trim() || !snapshot}>{m.pending?'Starting…':'Go'}</button></>:<><button type="button" className="hud-sequence" onClick={()=>open('mission')}>{rows.length?rows.map((step,i)=><span key={i}>{describeCommand(step)} <ChevronRight size={14}/></span>):'Idle · Add waypoints or edit a sequence'}</button><button type="button" onClick={()=>open('mission')}>Edit</button><button type="button" disabled={!m.canRun} onClick={()=>void m.start()}>Run</button></>}

        {m.held&&<button className="hud-dispatch" type="button" disabled={m.pending} onClick={()=>void m.resume()}>Resume</button>}
        <button className="hud-stop" title={m.running?'Brake and hold mission queue':'Stop robot motion'} type="button" disabled={!sim || !snapshot} onClick={()=>void (m.running?m.pause():m.halt('/stop'))}>STOP</button>

      </form>

      {m.plan&&m.plan.objective===m.goal&&<button className="hud-plan-summary" onClick={()=>open('mission')}>{m.plan.steps.length} steps drafted · Review plan <ChevronRight size={12}/><small>Relative steps use the verified dispatch pose</small></button>}

      {m.mission?.id&&!m.plan&&<button className="hud-plan-summary" onClick={()=>open('mission')}>{m.mission?.steps.filter(s=>s.state==='succeeded').length}/{m.mission?.steps.length} steps complete · View mission</button>}

      {m.error&&<div role="alert" className="hud-error">{m.error}<button aria-label="Dismiss message" onClick={m.clearError}><X size={12}/></button></div>}

    </section>

    <ViewportZoom/>
    {drawer&&<aside className={`hud-drawer hud-drawer-${drawer}`} aria-label={`${drawer} panel`}><header><h2>{drawer==='fleet'?'Fleet overview':drawer==='settings'?'Settings':drawer==='joints'?'Telemetry':drawer==='mission'?'Mission workspace':drawer==='bookmarks'?'Pose bookmarks':'Perception'}</h2><button aria-label="Close panel" onClick={()=>setDrawer(null)}><X size={18}/></button></header><div className="hud-drawer-body">

      {drawer==='fleet'&&<><label className="op-search"><Search size={15}/><input aria-label="Search fleet" placeholder="Search Carter, Go2, H1…" value={query} onChange={e=>setQuery(e.target.value)}/></label>{fleet.filter(r=>`${r.id} ${r.type}`.toLowerCase().includes(query.toLowerCase())).map(r=><button className="hud-fleet-unit" key={r.id} disabled={m.locked} onClick={()=>{state.selectRobot(r.id);setOverview(false);setDrawer(null);}}><Network size={24}/><span><b>{r.id}</b><small>{r.type} · {r.id===snapshot?.robotId?snapshot.motion.state:r.status}</small></span><span>Focus</span></button>)}<FleetDeployment manifest={snapshot?.fleet} send={control.send} enabled={sim&&!m.locked}/><BrainProvider snapshot={snapshot} send={control.send} enabled={sim}/></>}

      {drawer==='bookmarks'&&<PoseBookmarks data={bookmarks.data} pin={pin} error={bookmarks.error} onRefresh={bookmarks.refresh} enabled={sim&&!m.locked&&!snapshot?.busy} send={control.send} onSaved={data=>{bookmarks.update(data);setPinning(false);setPin(null);}} choosing={pinning} onPin={()=>{setPinning(true);setPlacing(false);}} onGo={name=>{setPinning(false);setPlacing(false);m.setMode('agent');m.setGoal(`go to ${name}`);setDrawer(null);}}/>}
      {drawer==='settings'&&<><h3>Appearance</h3><div className="hud-switch"><button aria-pressed={state.colorMode==='dark'} onClick={()=>state.setColorMode('dark')}>Dark</button><button aria-pressed={state.colorMode==='light'} onClick={()=>state.setColorMode('light')}>Light</button></div><label className="hud-setting"><input type="checkbox" checked={state.sceneMotion} onChange={e=>state.setSceneMotion(e.target.checked)}/> Sensor motion</label><h3>Operating mode</h3><div className="hud-switch"><button disabled={m.locked} aria-pressed={sim} onClick={()=>state.setAppMode('simulation')}>Simulation</button><button disabled={m.locked} aria-pressed={!sim} onClick={()=>state.setAppMode('physical')}>Physical registry</button></div><p>Physical motion is unavailable in this adapter.</p><h3>Brain</h3><BrainProvider snapshot={snapshot} send={control.send} enabled={sim}/><h3>System</h3><p>ROS 2 domain 42 · {telemetry.status} · {telemetry.messages.toLocaleString()} samples</p><p>Policy: {snapshot?.runtime.policy || 'Asset-qualified controller'}</p><details><summary>Connection diagnostics</summary>{snapshot?.session?.components.map(c=><p key={c.id}>{c.id}: {c.ready?'Ready':c.message}</p>)}<p>Global planner: {snapshot?.globalNavigation?.ready?'Ready':snapshot?.globalNavigation?.reason || 'Waiting'}</p></details><details><summary>Scene & development</summary><button disabled={!m.ready||m.locked} onClick={()=>void m.changeCourse(true)}>Load L-course</button><button disabled={!m.ready||m.locked} onClick={()=>void m.changeCourse(false)}>Unload course</button><WaypointProofPanel snapshot={snapshot} send={control.send} enabled={sim}/></details></>}

      {(drawer==='joints'||drawer==='perception')&&<TelemetryInspector openBrain={()=>setDrawer('settings')} showCamera={drawer==='perception'} showJoints={drawer==='joints'}/>}

      {drawer==='perception'&&<><MolmoPreview snapshot={snapshot} send={control.send} enabled={sim} initialTask={m.goal}/><TaskContext agent={snapshot?.agent} robotId={snapshot?.robotId}/></>}

      {drawer==='mission'&&<>{m.running&&<button onClick={()=>void m.halt('/cancel')}>Cancel remaining mission</button>}<button disabled={m.pending||!m.goal.trim()} onClick={()=>void m.draftMission()}>Preview instruction</button>{m.plan&&<section aria-label="Structured mission preview"><h3>Draft · {m.plan.steps.length} steps</h3><ol>{m.plan.steps.map((s,i)=><li key={i}>{s.kind==='inspect'?`Inspect ${s.landmark || 'camera'}`:s.kind==='wait'?`Wait ${s.seconds}s`:describeCommand(s)}</li>)}</ol><p>{m.plan.verification}</p><p>Drafting is independent of the stationary hold. Dispatch verifies the current pose and scene before motion.</p><button className="hud-dispatch" disabled={m.locked||m.plan.objective!==m.goal} onClick={()=>void m.dispatchGoal()}>Go</button></section>}<MissionTimeline/></>}

    </div></aside>}

  </div>;

}

