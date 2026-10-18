import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startDemoStream } from './telemetry/demoMockStream';
import { useDemo } from './store';
import './style.css';

function Demo() {
  const paused = useDemo(s => s.paused);
  useEffect(() => {
    if (paused) return;
    const offset = useDemo.getState().frame.time;
    return startDemoStream(frame => useDemo.setState({ frame: sampleWithOffset(frame.time + offset) }));
  }, [paused]);
  return <App />;
}
import { sampleDemo as sampleWithOffset } from './telemetry/demoMockStream';
const enabled = import.meta.env.VITE_DEMO_MODE === 'true';
createRoot(document.getElementById('root')!).render(<StrictMode>{enabled ? <Demo /> : <main><h1>Demo mode disabled</h1><p>Set VITE_DEMO_MODE=true to run this browser-only showcase.</p></main>}</StrictMode>);
