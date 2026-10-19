import { useEffect, useState } from 'react';

export function ViewportZoom() {
  const [zoom, setZoom] = useState(60);
  useEffect(() => {
    const receive = (event: Event) => setZoom((event as CustomEvent<number>).detail);
    window.addEventListener('moonbase-zoom-changed', receive);
    return () => window.removeEventListener('moonbase-zoom-changed', receive);
  }, []);
  const change = (value: number) => {
    const next = Math.max(0, Math.min(100, value));
    setZoom(next);
    window.dispatchEvent(new CustomEvent('moonbase-zoom-request', {detail: next}));
  };
  return <div className="hud-zoom" aria-label="Viewport zoom">
    <button aria-label="Zoom out" onClick={() => change(zoom - 5)}>−</button>
    <input aria-label="Zoom" type="range" min="0" max="100" step="1" value={zoom} onChange={e => change(Number(e.target.value))}/>
    <button aria-label="Zoom in" onClick={() => change(zoom + 5)}>+</button>
    <span>ZOOM</span>
  </div>;
}
