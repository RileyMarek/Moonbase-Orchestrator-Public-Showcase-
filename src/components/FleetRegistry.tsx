import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowLeft, ArrowUpRight, Search } from 'lucide-react';
import type { Robot } from '../store';
import type { ControlSnapshot } from '../hooks/useRobotControl';
import { CircuitFrame } from '../AstroGraphics';
import { BotPortrait } from './BotPortrait';

interface Props {
  fleet: Robot[];
  selected: string | null;
  select: (id: string) => void;
  mode: string;
  snapshot: ControlSnapshot | null;
}
type Phase = 'fleet' | 'opening' | 'brain' | 'closing';
type Config = { brain: string; policy: string };
const defaults: Config = { brain: 'None', policy: 'H1 Flat Terrain' };
function readConfig(id: string, type: Robot['type']): Config {
  const defaultPolicy = type === 'humanoid' ? defaults.policy : 'Unassigned';
  try {
    const data = JSON.parse(localStorage.getItem(`astro.config.${id}`) || 'null');
    return {
      brain: typeof data?.brain === 'string' ? data.brain : defaults.brain,
      policy: typeof data?.policy === 'string' ? data.policy : defaultPolicy,
    };
  } catch { return { ...defaults, policy: defaultPolicy }; }
}

function BrainDiagram() {
  return <svg viewBox="0 0 130 120" role="img" aria-label="Neural network concept diagram" className="config-diagram">
    <circle cx="65" cy="60" r="51" fill="none" stroke="#222" strokeWidth=".7" strokeDasharray="2 4" />
    <circle cx="65" cy="60" r="31" fill="none" stroke="#f27722" strokeWidth=".8" />
    <g stroke="#535353" strokeWidth="1">
      <path d="M65 12 26 34 16 69 44 101 89 105 116 76 103 32 65 12Z" fill="none" />
      <path d="M65 12 65 60 26 34M65 60 16 69m49-9-21 41m21-41 24 45m-24-45 51 16m-51-16 38-28" fill="none" />
    </g>
    <g fill="#1f1f1f" stroke="#f27722" strokeWidth="2">
      {[[65,12],[26,34],[16,69],[44,101],[89,105],[116,76],[103,32],[65,60]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===7?8:4} />)}
    </g>
    <circle cx="65" cy="60" r="2.5" fill="#fff" />
  </svg>;
}
function PolicyDiagram() {
  return <svg viewBox="0 0 130 120" role="img" aria-label="Joint and motion policy diagram" className="config-diagram">
    <circle cx="65" cy="59" r="49" fill="none" stroke="#555" strokeWidth=".7" strokeDasharray="2 4" />
    <path d="M10 95H120M65 15V110" stroke="#777" strokeWidth=".8" />
    <path d="M20 85 36 75 51 79 62 56 71 67 87 42 110 35" fill="none" stroke="#f27722" strokeWidth="2.2" />
    <path d="M26 47 51 29 69 35 91 24M38 77 44 42 65 57 86 48 95 84" fill="none" stroke="#202020" strokeWidth="1.5" />
    <g fill="#f27722">{[[20,85],[62,56],[87,42],[110,35]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="3" />)}</g>
    <path d="m105 31 6 4-5 5" fill="none" stroke="#f27722" strokeWidth="2" />
  </svg>;
}

export function FleetRegistry({ fleet, selected, select, mode, snapshot }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [phase, setPhase] = useState<Phase>('fleet');
  const [robotId, setRobotId] = useState<string | null>(null);
  const [config, setConfig] = useState<Config>(defaults);
  const [editing, setEditing] = useState<keyof Config | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const robot = fleet.find(r => r.id === robotId);
  const visible = fleet.filter(r => (filter === 'all' || r.type === filter) && r.id.toLowerCase().includes(query.toLowerCase()));
  const moving = phase === 'opening' || phase === 'closing';
  const brainVisible = phase === 'opening' || phase === 'brain';
  const live = robot?.id === 'bot-01' && mode === 'simulation' && snapshot?.runtimeFresh;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function go(next: 'brain' | 'fleet', id?: string, source?: HTMLButtonElement) {
    if (moving) return;
    if (id) { setRobotId(id); setConfig(readConfig(id, fleet.find(r => r.id === id)?.type ?? 'amr')); select(id); opener.current = source || null; }
    setEditing(null);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase(next);
      requestAnimationFrame(() => (next === 'brain' ? backButton.current : opener.current)?.focus());
      return;
    }
    setPhase(next === 'brain' ? 'opening' : 'closing');
    timer.current = setTimeout(() => {
      setPhase(next);
      requestAnimationFrame(() => (next === 'brain' ? backButton.current : opener.current)?.focus());
    }, 780);
  }
  function save(key: keyof Config, value: string) {
    const next = { ...config, [key]: value };
    setConfig(next);
    if (robotId) localStorage.setItem(`astro.config.${robotId}`, JSON.stringify(next));
    setEditing(null);
  }
  return <section className={`panel fleet-panel fleet-config-shell phase-${phase}`} aria-label={brainVisible ? `Brain Config for ${robotId}` : 'Fleet Registry'} aria-busy={moving}>
    <CircuitFrame />
    <div className="config-shift-lines" aria-hidden="true"><span /><span /><span /><span /></div>
    <div className="fleet-face" aria-hidden={brainVisible} inert={brainVisible || moving}>
      <div className="panel-heading"><h2><span>01</span> FLEET REGISTRY</h2><span className="count">{fleet.length.toString().padStart(2,'0')}</span></div>
      <label className="search-field"><Search size={13}/><input aria-label="Search fleet" placeholder="SEARCH UNIT ID" value={query} onChange={e => setQuery(e.target.value)} /><span>/</span></label>
      <div className="filter-tabs">{['all','humanoid','quadruped','amr'].map(type => <button key={type} aria-pressed={filter === type} className={filter === type ? 'active' : ''} onClick={() => setFilter(type)}>{type === 'humanoid' ? 'HUM' : type === 'quadruped' ? 'QUAD' : type.toUpperCase()}</button>)}</div>
      <div className="fleet-list">{visible.map((r,i) => <article key={r.id} className={`robot-card ${selected === r.id ? 'selected' : ''}`}>
        <div className="robot-card-top"><button className="fleet-select" aria-label={`Select ${r.id}`} onClick={() => select(r.id)}><span className="unit-icon"><BotPortrait type={r.type} blink={r.id === robotId && moving} /></span><strong>{r.id}</strong></button><button className="brain-open" onClick={e => go('brain', r.id, e.currentTarget)} aria-label={`Brain Config for ${r.id}`}>BRAIN CONFIG</button></div>
        <button className="fleet-detail-select" onClick={() => select(r.id)} aria-label={`Select ${r.id} details`}><div className="robot-card-meta"><span>{r.type}</span><span className={`robot-status ${r.status}`}>{r.status}</span></div><div className="battery-line"><span style={{ width: `${r.battery}%` }} /></div><div className="robot-card-foot"><span>UNIT / {String(i+1).padStart(2,'0')}</span><span>PWR {r.battery}%</span></div></button>
      </article>)}{!visible.length && <p className="empty-copy">No matching units.</p>}</div>
      <div className="fleet-foot"><Activity size={14}/>{mode === 'simulation' ? 'SIMULATED FLEET' : 'HARDWARE REGISTRY'}<ArrowUpRight size={12}/></div>
    </div>
    <div className="brain-face" aria-hidden={!brainVisible} inert={!brainVisible || moving}>
      <div className="brain-head"><button ref={backButton} aria-label="Back to Fleet Registry" className="brain-back" onClick={() => go('fleet')}><ArrowLeft size={17}/></button><div><small>01 / UNIT INTELLIGENCE</small><h2>BRAIN CONFIG</h2></div><span className="brain-head-id">{robot?.id ?? 'UNIT'}</span></div>
      <div className="brain-unit"><BotPortrait type={robot?.type ?? 'humanoid'} size={37} blink={moving}/><span>{robot?.id ?? 'UNIT REMOVED'}<small>{robot?.type ?? 'UNAVAILABLE'}</small></span></div>
      <div className="config-row"><div className="config-row-head"><span>01</span><h3>HIGH LEVEL BRAIN</h3></div><div className="config-row-body"><div><b>{live && snapshot?.runtime.brain ? snapshot.runtime.brain : 'NO BRAIN RUNNING'}</b><p>Perception, scene understanding and task planning.</p><small>TEST PROFILE / {config.brain.toUpperCase()}</small></div><BrainDiagram/></div><button className="config-change" onClick={() => setEditing(editing === 'brain' ? null : 'brain')}>CHANGE BRAIN <ArrowUpRight size={13}/></button></div>
      <div className="config-row"><div className="config-row-head"><span>02</span><h3>LOW LEVEL POLICY</h3></div><div className="config-row-body"><div><b>{live ? snapshot?.runtime.policy : 'NO LIVE POLICY'}</b><p>Joint control, balance and movement.</p><small>TEST PROFILE / {config.policy.toUpperCase()}</small></div><PolicyDiagram/></div><button className="config-change" onClick={() => setEditing(editing === 'policy' ? null : 'policy')}>CHANGE POLICY <ArrowUpRight size={13}/></button></div>
      <div className="brain-foot"><span>ASTRO / CONTROL SYSTEMS</span><span>STATUS / {live ? 'LIVE SIM' : 'STANDBY'}</span></div>
      {editing && <div className="config-picker" role="dialog" aria-label={`Change ${editing}`}><h3>{editing === 'brain' ? 'HIGH LEVEL BRAIN' : 'LOW LEVEL POLICY'}</h3><p>{editing === 'brain' ? 'Choose a test profile for this unit. Model loading will be connected later.' : 'Choose a test profile. Start Isaac with the policy you want to run; this selection does not switch a running policy.'}</p>{(editing === 'brain' ? ['None','Molmo-7B / planned'] : robot?.type === 'humanoid' ? ['H1 Flat Terrain','Unassigned'] : robot?.type === 'quadruped' ? ['Unassigned','Quadruped Gait / planned'] : ['Unassigned','AMR Navigation / planned']).map(option => <button key={option} onClick={() => save(editing, option)}>{option}</button>)}<button onClick={() => setEditing(null)}>BACK</button></div>}
    </div>
  </section>;
}
