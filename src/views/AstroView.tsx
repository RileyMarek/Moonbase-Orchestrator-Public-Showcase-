import { ActionConsole } from "../components/ActionConsole";

import { useState } from 'react';
import { Activity, Crosshair, Factory, Maximize2, Moon, Plus, Radio, Trash2, X } from 'lucide-react';
import { Viewport3D } from '../components/Viewport3D';
import { useMoonbaseRuntime } from '../hooks/useMoonbaseRuntime';
import { useAppStore } from '../store';
import type { Robot } from '../store';
import '../App.css';
import { FleetRegistry } from '../components/FleetRegistry';
import { BotPortrait } from '../components/BotPortrait';


import '../AstroRevision.css';
import '../MotionControl.css';
import '../FleetBrain.css';
import { Wordmark, Globe, Terrain, CircuitFrame, CircuitBackdrop } from '../AstroGraphics';
import '../ActionConsole.css';

function Mascot({ head = false }: { head?: boolean }) {
  return <svg className={head ? 'mascot-head' : 'mascot-body'} viewBox={head ? '48 202 352 354' : '422 212 742 542'} role="img" aria-label={head ? 'A.S.T.R.O robot mascot face' : 'J03 orange robotic cat companion'}><image href="/astro-reference.png" width="1536" height="1024" /></svg>;
}

export function AstroView() {
  const { telemetry, control, mission } = useMoonbaseRuntime();
  const state = useAppStore();
  const { appMode, environment, robots, selectedRobotId, setAppMode, setEnvironment, selectRobot } = state;

  const [expanded,setExpanded] = useState(false);
  const fleet = robots.filter(r=>r.mode === appMode);
  const robot = fleet.find(r=>r.id===selectedRobotId);
  function spawn(type: Robot['type'], amrVariant?: Robot['amrVariant']) {
    const id = `${type.toUpperCase()}-${crypto.randomUUID().slice(0,6)}`;
    state.addRobot({ id, type, amrVariant, mode:'simulation', position:[(parseInt(id.slice(-6,-3),16)/4095-.5)*10,0,(parseInt(id.slice(-3),16)/4095-.5)*10], battery:100, status:'idle', temperature:30, assignedTasks:['Awaiting instructions'] });
    selectRobot(id);
  }
  return <div className="astro-app">
    <header className="masthead"><div className="brand"><div className="brand-mark"><BotPortrait type="quadruped" size={68}/></div><div><h1 aria-label="A.S.T.R.O"><Wordmark/></h1><p>COMMAND CENTER</p></div></div><div className="mission-motto">AUTONOMOUS / SEARCH / TRACK / RESPOND / OBSERVE<div className="signal-bars" aria-hidden="true">▰ ▰ ▰ ▰ ▰ <span>▰</span></div></div><div className="header-stamp"><span className="orange-square"/>MISSION CONTROL<span className="micro">PROJECT MOONBASE / V.01</span></div></header>
    <nav className="mode-bar" aria-label="Operating mode"><div className="mode-tabs"><button aria-pressed={appMode==='simulation'} className={appMode==='simulation'?'active':''} disabled={mission.locked||control.snapshot?.busy} onClick={()=>setAppMode('simulation')}><BotPortrait type="quadruped" size={18}/>Simulation<span className="tab-number">01</span></button><button aria-pressed={appMode==='physical'} className={appMode==='physical'?'active':''} disabled={mission.locked||control.snapshot?.busy} onClick={()=>setAppMode('physical')}><Radio size={15}/>Physical<span className="tab-number">02</span></button></div><div className="mode-context"><span className="status-dot"/> {appMode==='simulation'?'VIRTUAL OPERATIONS':'PHYSICAL OPERATIONS'}<span className="micro">/ {fleet.length.toString().padStart(2,'0')} UNITS REGISTERED</span></div></nav>
    <main className="console-grid"><CircuitBackdrop/>
      <aside className="fleet-column"><FleetRegistry fleet={fleet} selected={selectedRobotId} select={selectRobot} mode={appMode} snapshot={control.snapshot}/>
      <section className="panel companion"><CircuitFrame/><div className="panel-heading"><h2><span>J03</span> YOUR COMPANION</h2><span className="tiny-cross">+</span></div><div className="companion-art"><span className="art-code" aria-hidden="true">ᚷ ǀ ⊳ ⌁<br/>CAT / J03</span><Mascot/></div><div className="companion-caption"><strong>SMALL COMPANION.<br/>A BRIGHTER TOMORROW.</strong><span className="barcode" aria-hidden="true"/></div></section></aside>
      <div className="center-column"><section className={`viewport-panel ${expanded?'expanded':''}`}><CircuitFrame/><div className="viewport-heading"><div><span className="micro">INTERACTIVE DIGITAL TWIN</span><h2>{control.snapshot?.course && appMode==='simulation' ? control.snapshot.course.name.toUpperCase() : environment==='lunar'?'LUNAR OPERATIONS':'FACTORY OPERATIONS'}<span>/ {appMode==='simulation'?'SIM':'PHY'}</span></h2></div><button className="icon-button" aria-label={expanded?'Exit expanded view':'Expand 3D view'} onClick={()=>setExpanded(!expanded)}>{expanded?<X size={18}/>:<Maximize2 size={18}/>}</button></div><div className="viewport-stage"><Viewport3D course={appMode === "simulation" ? control.snapshot?.course : null}/><div className="viewport-hud"><span><i/> {appMode==='simulation'?'SIMULATION SPACE':'PHYSICAL VIEW'}</span><span>SECTOR / {environment==='lunar'?'L–01':'F–01'}</span></div><div className="viewport-crosshair" aria-hidden="true">+</div><div className="viewport-caption"><span>01 — A.S.T.R.O ENVIRONMENT</span><span>ORBIT · DRAG / ZOOM · SCROLL</span></div></div><div className="viewport-toolbar"><div className="environment-tabs">{(['lunar','factory'] as const).map(env=><button key={env} disabled={appMode!=='simulation' || !!control.snapshot?.course} aria-pressed={environment===env} className={environment===env?'active':''} onClick={()=>setEnvironment(env)}>{env==='lunar'?<Moon size={14}/>:<Factory size={14}/>} {env}</button>)}</div><button className="recenter" onClick={()=>selectRobot(null)}><Crosshair size={14}/> RESET FOCUS</button></div></section>
      <ActionConsole snapshot={control.snapshot} send={control.send} enabled={appMode === "simulation"}/><section className="instrument-grid"><div className="panel orbital-panel"><CircuitFrame open/><div className="panel-heading"><h2><span>03</span> ORBITAL REFERENCE</h2><span className="micro">SCHEMATIC</span></div><Globe/><div className="instrument-foot"><span>{environment==='lunar'?'LUNA / SECTOR L–01':'TERRA / SECTOR F–01'}</span><span className="orange-text">⊕</span></div></div><div className="panel surface-panel"><CircuitFrame open/><div className="panel-heading"><h2><span>04</span> SURFACE ANALYSIS</h2><span className="micro">ILLUSTRATIVE</span></div><div className="radar-row"><div className="radar" role="img" aria-label="Fleet positions on a 50 by 50 meter schematic"><div className="radar-sweep"/>{fleet.map(r=><span key={r.id} className="radar-blip" style={{left:`${Math.max(4,Math.min(96,50+r.position[0]*1.7))}%`,top:`${Math.max(4,Math.min(96,50+r.position[2]*1.7))}%`}}/>)}</div><dl><div><dt>SPACE</dt><dd>50 × 50 M</dd></div><div><dt>UNITS</dt><dd>{fleet.length.toString().padStart(2,'0')}</dd></div><div><dt>MODE</dt><dd>{appMode==='simulation'?'VIRTUAL':'PHYSICAL'}</dd></div></dl></div><div className="terrain"><Terrain/><span>TERRAIN / CONCEPT SCAN</span></div></div></section></div>
      <aside className="right-column"><section className="panel telemetry-panel"><CircuitFrame/><div className="panel-heading"><h2><span>05</span> SIGNAL MONITOR</h2><Activity size={14}/></div><div data-testid="telemetry-status" data-status={telemetry.status} className="telemetry-state"><span className={`status-dot ${telemetry.status==='live'?'live':'muted'}`}/><strong>{telemetry.status}</strong><span>ROS 2</span></div><div className="signal-track" aria-hidden="true">{Array.from({length:36},(_,i)=><i key={i} className={telemetry.status==='live'?'lit':''} style={{height:`${8+(i*17%24)}px`}}/>)}</div><div className="signal-info"><span>RECEIVED <b>{telemetry.messages.toLocaleString()}</b></span><span>FOXGLOVE / BRIDGE</span></div>{telemetry.error&&<p className="connection-error" title={telemetry.error}>{telemetry.error}</p>}</section>
      <section className="panel inspector"><CircuitFrame/><div className="panel-heading"><h2><span>06</span> UNIT INSPECTOR</h2>{robot&&<button className="icon-button" aria-label={`Remove ${robot.id}`} onClick={()=>state.removeRobot(robot.id)}><Trash2 size={14}/></button>}</div>{robot?<><div className="inspector-identity"><div><span className="micro">SELECTED UNIT</span><h3>{robot.id}</h3></div><span className={`robot-status ${robot.status}`}>{robot.status}</span></div><div className="metric-grid"><div><span>TEMPERATURE</span><strong>{robot.temperature}<small>°C</small></strong></div><div><span>BATTERY</span><strong>{robot.battery}<small>%</small></strong></div></div><div className="coordinates"><span>POSITION / X · Z</span><b>{robot.position[0].toFixed(1)} / {robot.position[2].toFixed(1)} <small>M</small></b></div>{robot.joints&&Object.keys(robot.joints).length>0&&<details><summary>Joint diagnostics · {Object.keys(robot.joints).length}</summary><div className="joint-section"><h4>LATEST JOINTS <span>{Object.keys(robot.joints).length}</span></h4><div className="joint-list">{Object.entries(robot.joints).map(([name,pos])=><div key={name}><span title={name}>{name.replace('_joint','')}</span><b>{pos.toFixed(2)}</b></div>)}</div></div></details>}<details><summary>Task history · {robot.assignedTasks.length}</summary><div className="task-section"><h4>TASK LOG <span>{robot.assignedTasks.length.toString().padStart(2,'0')}</span></h4><ul>{robot.assignedTasks.map((task,i)=><li key={i}><span>{String(i+1).padStart(2,'0')}</span>{task}</li>)}</ul></div></details></>:<div className="inspector-empty"><Crosshair size={35}/><h3>AWAITING SELECTION</h3><p>Select a unit from the fleet or the 3D environment to view diagnostics and dispatch commands.</p><span className="micro">NO TARGET / STANDBY</span></div>}</section>
      <section className="panel deployment"><CircuitFrame/><div className="panel-heading"><h2><span>07</span> DEPLOY UNIT</h2><Plus size={15}/></div>{appMode==='simulation'?<div className="spawn-grid">{[{type:'humanoid' as const,label:'Humanoid'},{type:'quadruped' as const,label:'Quadruped'},{type:'amr' as const,variant:'flat' as const,label:'AMR / Flat'},{type:'amr' as const,variant:'arm' as const,label:'AMR / Arm'}].map(item=><button key={item.label} onClick={()=>spawn(item.type,item.variant)}><Plus size={12}/>{item.label}</button>)}</div>:<p className="empty-copy">Deployment is available in Simulation mode.</p>}</section></aside>
    </main><footer className="system-footer"><span><span className="orange-square"/> A.S.T.R.O / COMMAND CENTER</span><span className="footer-glyphs" aria-hidden="true">⌁ ⊓ ǀ ⊳ ⊔ / 01.03</span><span>{appMode==='simulation'?'SIMULATED COMMANDS':'LOCAL DEMO CONTROLS'} <b>✳</b></span></footer>
  </div>;
}




