import { useEffect, useRef, useState } from 'react';
import { telemetryStep } from '../domain/telemetryDisplay';

export function useTelemetryDisplay(target: number, dangerUp = false): number {
  const current = useRef(target);
  const [display, setDisplay] = useState(target);
  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      current.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? target : telemetryStep(current.current, target, (now - previous) / 1000, dangerUp);
      previous = now;
      if (Math.abs(current.current - target) < .001) current.current = target;
      setDisplay(current.current);
      if (current.current !== target) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, dangerUp]);
  // Critical changes show in the same render, before the next animation frame.
  return dangerUp ? Math.max(display, target) : Math.min(display, target);
}
