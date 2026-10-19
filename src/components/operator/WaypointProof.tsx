import { useState } from 'react';
import { ArrowUpRight, Check, Circle, Download, LoaderCircle, Navigation, X } from 'lucide-react';
import { ACTION_URL, type ControlSnapshot } from '../../hooks/useRobotControl';
import { proofComplete, proofMetric, proofNames } from '../../domain/waypointProof';

export function WaypointProofPanel({ snapshot, send, enabled }: {snapshot: ControlSnapshot | null; send: (path:string, body?:object)=>Promise<unknown>; enabled:boolean}) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const proof = snapshot?.waypoint_demo;
  const running = proof?.state === 'running';
  const carter = snapshot?.runtime.embodiment_type === 'wheeled_amr';
  const ready = enabled && carter && snapshot?.ready && !snapshot.busy && !running && snapshot.agent?.state !== 'running' && snapshot.mission?.state !== 'running';
  const steps = proof?.steps.length ? proof.steps : proofNames.map(name => ({name, state:'pending' as const}));
  async function start() {
    setPending(true); setError('');
    try { await send('/demo/waypoint'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Milestone unavailable'); }
    finally { setPending(false); }
  }
  function download() {
    if (!proof?.id) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({robot_id:snapshot?.robotId, ...proof},null,2)],{type:'application/json'}));
    const link = document.createElement('a'); link.href=url; link.download=`moonbase-waypoint-${proof.id}.json`; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="op-proof op-panel" aria-label="One-waypoint live proof" data-testid="waypoint-proof">
    <header><div><span className="op-eyebrow">SEMANTIC / CARTER</span><h2>One waypoint. Six proofs.</h2></div><span className={`op-proof-badge ${proofComplete(proof)?'passed':proof?.state || 'idle'}`}>{proofComplete(proof)?(proof?.mock?'DEV VERIFIED':'VERIFIED'):running?'LIVE RUN':proof?.state === 'failed'?'BLOCKED':'AWAITING RUN'}</span></header>
    {proof?.provider && <p className="op-proof-note">Measured proof · {proof.provider} · {proof.model_id}{proof.mock?' · development proposal, real physics':''}</p>}
    <div className="op-proof-metrics"><div><span>BASE SPEED</span><b>{snapshot?.runtimeFresh && snapshot.speed_m_s != null ? snapshot.speed_m_s.toFixed(3) : '—'}<small> m/s</small></b></div><div><span>FRAME AGE</span><b>{snapshot?.perception?.age_s != null ? (snapshot.perception.age_s*1000).toFixed(0) : '—'}<small> ms</small></b></div><div><span>ARRIVAL LIMIT</span><b>10<small> cm</small></b></div></div>
    <ol className="op-proof-steps">{steps.map((step,index)=><li key={step.name} className={step.state}><span className="op-proof-step-icon">{step.state==='passed'?<Check size={14}/>:step.state==='failed'?<X size={14}/>:step.state==='running'?<LoaderCircle size={14} className="op-spin"/>:<Circle size={12}/>}</span><div><b><em>{String(index+1).padStart(2,'0')}</em>{step.name}</b><p>{proofMetric(step)}</p></div></li>)}</ol>
    {proof?.id && proof.steps[1]?.state === 'passed' && <div className="op-proof-frame"><div className="op-preview-image"><img src={`${ACTION_URL}/demo/frame.png?id=${encodeURIComponent(proof.id)}&robot_id=${encodeURIComponent(snapshot?.robotId || '')}`} alt="Recorded Carter frame used by the selected provider in this milestone"/>{proof.steps[2]?.image && <span className="op-preview-point blocked" style={{left:`${proof.steps[2].image[0]*100}%`,top:`${proof.steps[2].image[1]*100}%`}}>1</span>}</div><span>RECORDED SOURCE FRAME · {proof.steps[2]?.total_sec?.toFixed(2) || '—'} s inference round trip</span></div>}
    <div className="op-proof-actions"><button className="op-primary" disabled={!ready || pending} onClick={()=>void start()}><Navigation size={14}/>{running?'Running milestone…':'Run one waypoint'}<ArrowUpRight size={13}/></button><button aria-label="Download waypoint evidence" title="Download measured evidence" disabled={!proof?.id} onClick={download}><Download size={14}/></button></div>
    {(error || !carter) && <p className="op-proof-note" role={error?'alert':undefined}>{error || 'Deploy and select Nova Carter to run this milestone.'}</p>}
    {carter && !snapshot?.runtime.stop_controller_qualified && <p className="op-proof-note">Drive qualification pending. Dispatch stays blocked until the physical audit passes.</p>}
    {carter && !snapshot?.cloud?.ready && <p className="op-proof-note">{snapshot?.cloud?.disabled ? 'Remote inference is disabled. Local development proposals remain available.' : 'Semantic provider is unavailable. The milestone will report its failure.'}</p>}
    <footer><span className="op-dot live"/>Evidence comes from ROS odometry and correlated camera frames.</footer>
  </section>;
}
