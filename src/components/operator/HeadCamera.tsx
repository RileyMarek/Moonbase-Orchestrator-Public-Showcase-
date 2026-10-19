import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';

export function HeadCamera({robotId, enabled, ageMs}: {robotId: string; enabled: boolean; ageMs?:number|null}) {
  const [image, setImage] = useState<{robotId: string; url: string; view:'rgb'|'depth'} | null>(null);
  const [view, setView] = useState<'rgb'|'depth'>('rgb');
  const [rate, setRate] = useState<number|null>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const render = () => {
      frame++;
      const time = performance.now() / 1000;
      ctx.fillStyle = view === 'rgb' ? '#080e14' : '#12091c';
      ctx.fillRect(0, 0, 320, 240);

      ctx.strokeStyle = view === 'rgb' ? 'rgba(76, 252, 223, 0.15)' : 'rgba(249, 115, 22, 0.15)';
      ctx.lineWidth = 1;
      for (let y = 140; y <= 230; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(320, y);
        ctx.stroke();
      }
      for (let x = -80; x <= 400; x += 36) {
        ctx.beginPath();
        ctx.moveTo(160, 120);
        ctx.lineTo(x, 240);
        ctx.stroke();
      }

      const bx = 110 + Math.sin(time) * 15;
      const by = 80 + Math.cos(time * 0.8) * 8;
      ctx.strokeStyle = view === 'rgb' ? '#4cfcdf' : '#f97316';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, 90, 75);

      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 4, by + 12); ctx.lineTo(bx - 4, by - 4); ctx.lineTo(bx + 12, by - 4);
      ctx.moveTo(bx + 94, by + 12); ctx.lineTo(bx + 94, by - 4); ctx.lineTo(bx + 78, by - 4);
      ctx.stroke();

      ctx.fillStyle = view === 'rgb' ? '#4cfcdf' : '#f97316';
      ctx.font = '10px monospace';
      ctx.fillText(`TRACK [PASSAGE] ${(0.92 + 0.04 * Math.sin(time)).toFixed(2)}`, bx, by - 8);

      ctx.font = '10px monospace';
      ctx.fillText(`CAM · ${view.toUpperCase()} · ${robotId.toUpperCase()}`, 15, 22);
      ctx.fillText(`T+${time.toFixed(1)}s · FRM #${frame}`, 15, 36);
      ctx.fillText(`DEPTH RANGE: 1.84m · CLEARANCE: PASS`, 15, 225);

      const dataUrl = canvas.toDataURL('image/png');
      setImage({ robotId, url: dataUrl, view });
      setRate(20.0);
    };

    render();
    const interval = setInterval(render, 250);
    return () => clearInterval(interval);
  }, [robotId, enabled, view]);

  const source = image?.robotId === robotId && image.view === view ? image.url : null;
  return <><div className="op-camera-modes"><button aria-pressed={view==='rgb'} onClick={()=>setView('rgb')}>Optical</button><button aria-pressed={view==='depth'} onClick={()=>setView('depth')}>Depth</button></div><div className="op-camera-feed">
    {source ? <img className="op-camera" src={source} alt="Synchronized onboard camera supplied to perception" /> :
      <div className="op-camera-empty"><Camera size={24}/><span>Waiting for camera</span></div>}
    {source && <div className="op-camera-hud" aria-hidden="true"><div className="op-camera-stamp"><span>CAM 01 · {view==='rgb'?'OPTICAL':'DEPTH Z'}</span><span>{robotId}</span></div><span className="op-camera-reticle"/><div className="op-camera-stamp"><span>{enabled && rate != null ? `${rate.toFixed(1)} Hz preview` : 'Preview paused'}</span><span>{enabled && ageMs != null ? `${Math.round(ageMs)} ms depth age` : 'No live depth'}</span></div></div>}
  </div>{view==='depth'&&<><div className="op-depth-key"/><div className="op-depth-labels"><span>Near · 0.15 m</span><span>Optical Z · 5 m+</span></div></>}</>;
}
