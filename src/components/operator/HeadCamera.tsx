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
    if (ctx) {
      ctx.fillStyle = view === 'rgb' ? '#0b161e' : '#140c1e';
      ctx.fillRect(0, 0, 320, 240);
      ctx.strokeStyle = view === 'rgb' ? '#4cfcdf' : '#f97316';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(40, 30, 240, 180);
      ctx.fillStyle = view === 'rgb' ? '#4cfcdf' : '#f97316';
      ctx.font = '11px monospace';
      ctx.fillText(`SYNTHETIC ONBOARD CAM · ${view.toUpperCase()}`, 50, 60);
      ctx.fillText(`TARGET EMBODIMENT: ${robotId.toUpperCase()}`, 50, 80);
      ctx.fillText(`DEPTH RANGE: 1.84m · CLEARANCE: NOMINAL`, 50, 100);
      ctx.fillText(`CALIBRATION: INTRINSICS VERIFIED`, 50, 120);
    }
    const dataUrl = canvas.toDataURL('image/png');
    setImage({ robotId, url: dataUrl, view });
    setRate(20.0);
  }, [robotId, enabled, view]);

  const source = image?.robotId === robotId && image.view === view ? image.url : null;
  return <><div className="op-camera-modes"><button aria-pressed={view==='rgb'} onClick={()=>setView('rgb')}>Optical</button><button aria-pressed={view==='depth'} onClick={()=>setView('depth')}>Depth</button></div><div className="op-camera-feed">
    {source ? <img className="op-camera" src={source} alt="Synchronized onboard camera supplied to perception" /> :
      <div className="op-camera-empty"><Camera size={24}/><span>Waiting for camera</span></div>}
    {source && <div className="op-camera-hud" aria-hidden="true"><div className="op-camera-stamp"><span>CAM 01 · {view==='rgb'?'OPTICAL':'DEPTH Z'}</span><span>{robotId}</span></div><span className="op-camera-reticle"/><div className="op-camera-stamp"><span>{enabled && rate != null ? `${rate.toFixed(1)} Hz preview` : 'Preview paused'}</span><span>{enabled && ageMs != null ? `${Math.round(ageMs)} ms depth age` : 'No live depth'}</span></div></div>}
  </div>{view==='depth'&&<><div className="op-depth-key"/><div className="op-depth-labels"><span>Near · 0.15 m</span><span>Optical Z · 5 m+</span></div></>}</>;
}
