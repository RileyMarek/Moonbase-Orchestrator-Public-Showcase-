/** Author: Riley Marek. Project: Moonbase. Date: 2026-09-29.
 * Editable, ordered commands executed by the ROS adapter, not browser timers. */
import { useState } from 'react';
import type { ControlSnapshot } from '../hooks/useRobotControl';

import type { MissionStep } from '../domain/types';
export type { MissionStep,Course,MissionSnapshot } from '../domain/types';
const defaults = (kind: MissionStep['kind']): MissionStep => kind === 'observe' ? {kind} : kind === 'walk' ? {kind, x: 1.9, y: 0, tolerance: .2, timeout_sec: 120} : {kind, yaw: 0, tolerance: .15, timeout_sec: 90};

export function MissionControl({snapshot, send}: {snapshot: ControlSnapshot | null; send: (path: string, body?: object) => Promise<unknown>}) {
  const [steps, setSteps] = useState<MissionStep[]>([]);
  const [request, setRequest] = useState<{id: string; steps: MissionStep[]} | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const mission = snapshot?.mission;
  const running = mission?.state === 'running' || mission?.state === 'canceling';
  const edit = (next: MissionStep[]) => {setSteps(next); setRequest(null); setError('');};
  const update = (i: number, values: Partial<MissionStep>) => edit(steps.map((s,j) => i === j ? {...s, ...values} : s));
  async function start() {
    const body = request || {id: crypto.randomUUID(), steps};
    setRequest(body); setPending(true); setError('');
    try {await send('/mission', body);} catch(e) {setError(e instanceof Error ? e.message : 'Sequence failed');}
    finally {setPending(false);}
  }
  async function cancel() {
    setPending(true);
    try {await send('/cancel');} catch(e) {setError(String(e));} finally {setPending(false);}
  }
  return <section className="mission-control" aria-label="Command sequence">
    <h4>COMMAND SEQUENCE <span>{mission?.state || 'offline'}</span></h4>
    <p>{snapshot?.course ? snapshot.course.name : 'Start Isaac with -ActionControl -ObstacleCourse.'} · World XY metres; heading degrees.</p>
    <p>Observe records fresh robot pose. The route uses explicit waypoints; it does not avoid obstacles automatically.</p>
    <fieldset disabled={running || pending}>
      <button type="button" disabled={!snapshot?.course} onClick={() => edit(structuredClone(snapshot!.course!.steps))}>Load obstacle course</button>
      <ol className="mission-editor">{steps.map((step,i) => <li key={i}>
        <select aria-label={`Command ${i+1}`} value={step.kind} onChange={e=>edit(steps.map((s,j)=>i===j?defaults(e.target.value as MissionStep['kind']):s))}>
          <option value="observe">observe</option><option value="walk">walk_to</option><option value="turn">turn_to</option>
        </select>
        {step.kind === 'walk' && <div className="mission-fields">{(['x','y'] as const).map(axis=><label key={axis}>{axis.toUpperCase()}<input aria-label={`Step ${i+1} ${axis}`} type="number" min="-6" max="6" step="0.1" value={step[axis]} onChange={e=>update(i,{[axis]:e.target.valueAsNumber})}/></label>)}</div>}
        {step.kind === 'turn' && <label>Heading °<input aria-label={`Step ${i+1} heading`} type="number" min="-180" max="180" step="1" value={Math.round((step.yaw || 0)*180/Math.PI)} onChange={e=>update(i,{yaw:e.target.valueAsNumber*Math.PI/180})}/></label>}
        {step.kind !== 'observe' && <label>Timeout s<input aria-label={`Step ${i+1} timeout`} type="number" min="1" max="180" value={step.timeout_sec} onChange={e=>update(i,{timeout_sec:e.target.valueAsNumber})}/></label>}
        <div className="mission-row-actions"><button type="button" disabled={i===0} aria-label={`Move step ${i+1} up`} onClick={()=>{const next=[...steps];[next[i-1],next[i]]=[next[i],next[i-1]];edit(next);}}>↑</button><button type="button" aria-label={`Remove step ${i+1}`} onClick={()=>edit(steps.filter((_,j)=>i!==j))}>Remove</button></div>
      </li>)}</ol>
      <button type="button" disabled={steps.length>=30} onClick={()=>edit([...steps,defaults('observe')])}>Add command</button>
      <button type="button" disabled={!snapshot?.ready || snapshot?.busy || !snapshot?.course || !steps.length || request?.id===mission?.id} onClick={()=>void start()}>Run sequence</button>
    </fieldset>
    <button type="button" disabled={!running || pending} onClick={()=>void cancel()}>Cancel sequence</button>
    <p role="alert">{error}</p>
    {mission?.id && <div aria-live="polite" data-testid="mission-result"><strong>Sequence {mission.state}</strong><ol>{mission.steps.map((s,i)=><li key={i}>{s.command.kind === 'walk' ? 'walk_to' : s.command.kind === 'turn' ? 'turn_to' : 'observe'} — <b>{s.state}</b>{s.result && <small>{s.result.message}{s.result.pose && ` · XY ${s.result.pose[0].toFixed(2)}, ${s.result.pose[1].toFixed(2)} · yaw ${(s.result.pose[2]*180/Math.PI).toFixed(1)}°`}</small>}</li>)}</ol></div>}
    <small>Reload the course to run again. Restart Isaac to reset the robot to the course start.</small>
  </section>;
}
