import { H1_JOINT_NAMES } from './h1Rig';
import { DEMO_BOUNDS } from '../demo/environment';

export const WALK_HZ = 1.2;
export const SPEED = 0.75;
export const LOOP_SECONDS = 60;
// Static public elbow-v1 geometry. ROS coordinates: x forward, y left, z up.
export const OBSTACLES = [
  { id: 'divider', center: [0.5, 1.3, 0.5], size: [1.2, 0.5, 1] },
  { id: 'outer', center: [3, 0.9, 0.5], size: [0.4, 1.4, 1] },
] as const;

export function sampleDemo(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Expected finite nonnegative time');
  const time = seconds % LOOP_SECONDS;
  const phase = 2 * Math.PI * WALK_HZ * time;
  const joints: Record<string, number> = {};
  const velocities: Record<string, number> = {};
  const efforts: Record<string, number> = {};
  for (const name of H1_JOINT_NAMES) {
    const offset = name.startsWith('right_') ? Math.PI : 0;
    let amplitude = 0.035, bias = 0;
    if (name.includes('hip_pitch')) amplitude = 0.32;
    if (name.includes('knee')) { amplitude = 0.24; bias = 0.3; }
    if (name.includes('ankle')) { amplitude = -0.15; bias = -0.12; }
    if (name.includes('shoulder_pitch')) amplitude = -0.23;
    if (name.includes('elbow')) { amplitude = 0.12; bias = 0.4; }
    joints[name] = bias + amplitude * Math.sin(phase + offset);
    velocities[name] = amplitude * 2 * Math.PI * WALK_HZ * Math.cos(phase + offset);
    const load = (Math.sin(phase + offset) + 1) / 2;
    efforts[name] = name.includes('knee') ? 20 + 25 * load
      : name.includes('shoulder') || name.includes('elbow') ? 5 + 10 * load : 10 + 14 * load;
  }
  return { time, joints, velocities, efforts, speed: SPEED };
}

/** Full MBVX snapshot of box surfaces. Synthetic occupancy, never live perception. */
export function demoVoxelSnapshot() {
  const cells = new Map<string, number[]>();
  const resolution = 0.1;
  // A sparse synthetic floor makes occupancy visible around every embodiment,
  // including units outside the two obstacle surfaces. Quantized on the same grid.
  for (let x=DEMO_BOUNDS[0]*10; x<=DEMO_BOUNDS[2]*10; x+=3) for (let y=DEMO_BOUNDS[1]*10; y<=DEMO_BOUNDS[3]*10; y+=3)
    cells.set(`${x},${y},0`,[x,y,0]);
  for (const box of OBSTACLES) {
    const bounds = box.center.map((c, i) => [
      Math.round((c - box.size[i] / 2) / resolution),
      Math.round((c + box.size[i] / 2) / resolution),
    ]);
    for (let x = bounds[0][0]; x <= bounds[0][1]; x++)
      for (let y = bounds[1][0]; y <= bounds[1][1]; y++)
        for (let z = bounds[2][0]; z <= bounds[2][1]; z++) {
          if (x === bounds[0][0] || x === bounds[0][1] || y === bounds[1][0] || y === bounds[1][1] || z === bounds[2][0] || z === bounds[2][1])
            cells.set(`${x},${y},${z}`, [x, y, z]);
        }
  }
  const bytes = new Uint8Array(24 + cells.size * 6);
  bytes.set(new TextEncoder().encode('MBVX'));
  const view = new DataView(bytes.buffer);
  view.setUint8(4, 1); view.setUint8(5, 1);
  view.setUint32(8, 1, true); view.setUint32(12, 1, true);
  view.setUint32(16, cells.size, true); view.setFloat32(20, resolution, true);
  let index = 24;
  for (const cell of cells.values()) for (const coordinate of cell) {
    view.setInt16(index, coordinate, true); index += 2;
  }
  return bytes;
}

export function startDemoStream(onFrame: (frame: ReturnType<typeof sampleDemo>) => void) {
  let elapsed = 0, previous = performance.now(), cancelled = false, request = 0;
  function tick(now: number) {
    if (cancelled) return;
    // Background tabs do not jump the demo forward when resumed.
    elapsed += Math.min((now - previous) / 1000, 0.1);
    previous = now;
    onFrame(sampleDemo(elapsed));
    request = requestAnimationFrame(tick);
  }
  request = requestAnimationFrame(tick);
  return () => { cancelled = true; cancelAnimationFrame(request); };
}
