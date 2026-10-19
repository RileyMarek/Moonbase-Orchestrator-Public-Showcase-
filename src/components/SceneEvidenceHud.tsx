import { useEffect, useState } from 'react';
import { Eye, Route, ScanLine } from 'lucide-react';
import type { ControlSnapshot } from '../hooks/useRobotControl';
import { navigationEvidence, reasoningLabels, reasoningStage } from '../domain/sceneEvidence';

export function SceneEvidenceHud({snapshot}: {snapshot?:ControlSnapshot|null}) {
  const [now,setNow] = useState(() => performance.now());
  useEffect(() => {const timer = setInterval(() => setNow(performance.now()),500); return () => clearInterval(timer);},[]);
  const current = !!snapshot?.runtimeFresh && snapshot.receivedAt != null && now-snapshot.receivedAt<1000;
  const active = current ? reasoningStage(snapshot) : -1;
  const evidence = snapshot ? navigationEvidence(snapshot,Math.max(now,snapshot.receivedAt || 0)) : null;
  return <div className="scene-evidence" aria-label="Spatial evidence">
    <div className="scene-evidence-title"><ScanLine size={13}/><strong>SPATIAL EVIDENCE</strong><span className={current ? 'fresh' : ''}>{current ? 'CONNECTED' : 'OFFLINE / STALE'}</span></div>
    <div className="scene-route-key"><span><i className="route"/>Planned</span><span><i className="rollout"/>Rollout</span><span><i className="trail"/>Measured</span><span><i className="occupied"/>Occupied</span></div>
    {snapshot?.agent && <>
      <div className="scene-reasoning-stages">{reasoningLabels.map((label,i) => <span key={label} className={active===i ? 'active' : ''}>{label}</span>)}</div>
      <p className="scene-reasoning-message">{current ? snapshot.agent.message : 'Live reasoning paused · waiting for fresh telemetry'}</p>
    </>}
    <div className="scene-evidence-meta"><span><Eye size={11}/>{snapshot?.perception?.frames ?? 0} observations</span><span><Route size={11}/>{evidence?.blocked ? 'Blocked' : evidence?.executing ? 'Executing' : 'No live motion'}</span></div>
  </div>;
}
