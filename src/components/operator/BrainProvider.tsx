import { useState } from 'react';
import type { ControlSnapshot } from '../../hooks/useRobotControl';

export function BrainProvider({ snapshot, send, enabled }: { snapshot: ControlSnapshot | null; send: (path: string, body?: object) => Promise<unknown>; enabled: boolean }) {
  const [error, setError] = useState(''), [pending, setPending] = useState(false);
  const [frame, setFrame] = useState<{ url: string; id: string } | null>(null);
  const [click, setClick] = useState<[number, number] | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const mock = snapshot?.cloud?.dev_mode === true;
  const idle = enabled && !snapshot?.busy && !['running', 'canceling'].includes(snapshot?.mission?.state || '') && !['settling', 'observing', 'inference', 'validating', 'executing'].includes(snapshot?.agent?.state || '');

  function toggleCamera() {
    if (!cameraOpen) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0a141b';
        ctx.fillRect(0, 0, 320, 240);
        ctx.strokeStyle = '#4cfcdf';
        ctx.lineWidth = 1;
        ctx.strokeRect(30, 20, 260, 200);
        ctx.fillStyle = '#4cfcdf';
        ctx.font = '10px monospace';
        ctx.fillText('SIMULATED OPTICAL OBSERVATION', 40, 50);
        ctx.fillText('CLICK ANY POINT TO PLAN WAYPOINT', 40, 70);
      }
      setFrame({ url: canvas.toDataURL(), id: 'obs-demo-1' });
    } else {
      setFrame(null);
    }
    setCameraOpen(!cameraOpen);
  }

  async function choose(provider: string) {
    setPending(true); setError('');
    try { await send('/brain/provider', { provider }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Provider unavailable'); }
    finally { setPending(false); }
  }

  async function clicked(event: React.MouseEvent<HTMLImageElement>) {
    if (!frame || !idle) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width, y = (event.clientY - bounds.top) / bounds.height;
    setClick([x, y]); setError(''); setPending(true);
    try {
      await send('/brain/click', { x, y, observation_id: frame.id });
      await send('/agent', { task: 'Navigate to the clicked observed floor waypoint.' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Waypoint rejected'); }
    finally { setPending(false); }
  }

  return <section className="op-panel op-padding op-provider" aria-label="Semantic brain provider">
    <header><div><span className="op-eyebrow">SEMANTIC / REACTIVE</span><h2>Navigation brain</h2></div><span className={mock ? 'op-warning' : 'op-live'}>{mock ? 'DEV MODE' : snapshot?.cloud?.provider || 'OFFLINE'}</span></header>
    <label>Proposal provider<select aria-label="Proposal provider" disabled={!idle || pending} value={snapshot?.cloud?.provider === 'gemini' && snapshot.cloud.fallback ? 'auto' : snapshot?.cloud?.provider || 'molmo'} onChange={e => void choose(e.target.value)}><option value="mock">Mock · local floor / click</option><option value="gemini">Gemini · multimodal API</option><option value="auto">Gemini + Molmo backup</option><option value="molmo">Molmo · Colab</option></select></label>
    <p>{snapshot?.cloud?.model_id || 'No configured model'} · {snapshot?.cloud?.readiness || (snapshot?.cloud?.ready ? 'ready' : 'unavailable')}</p>
    {mock && <><p className="op-muted">Mock tests choose visible floor; they do not understand object names. Click a floor point to run one development waypoint through real ROS actions.</p><button aria-expanded={cameraOpen} onClick={toggleCamera}>Camera click control</button>{cameraOpen && frame && <div className="op-preview-image op-click-camera"><img src={frame.url} alt="Correlated development camera; click observed floor to navigate" onClick={event => void clicked(event)} />{click && <span className="op-preview-point clear" style={{left:`${click[0]*100}%`,top:`${click[1]*100}%`}}>+</span>}</div>}<button disabled={!idle || !snapshot?.agentReady || pending} onClick={() => void send('/agent', {task:'Navigate to one open floor development waypoint.'}).catch(e => setError(String(e)))}>Test open-floor waypoint</button></>}
    <div className="op-controller-status"><b>Local controller · {snapshot?.navigation?.state || 'idle'}</b><span>{snapshot?.navigation?.hz || 20} Hz target · {snapshot?.navigation?.measured_hz?.toFixed(1) || '—'} Hz measured · {snapshot?.navigation?.tick_ms?.toFixed(1) || '—'} ms computation</span><p>{snapshot?.navigation?.reason || 'Current depth screens motion independently of the semantic model.'}</p></div>
    {snapshot?.embodiment && <p className="op-muted">{snapshot.embodiment.label} · {snapshot.embodiment.capabilities.join(', ') || 'controllers unqualified'} · radius {snapshot.embodiment.body_radius_m} m</p>}
    {(error || snapshot?.cloud?.error) && <p role="alert" className="op-error">{error || snapshot?.cloud?.error}</p>}
  </section>;
}
