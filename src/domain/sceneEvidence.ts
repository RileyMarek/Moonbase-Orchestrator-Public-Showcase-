import type { CameraGeometry, ControlSnapshot } from '../hooks/useRobotControl';

export type ScenePoint = [number, number, number];

/** Keep planner corners exact. Reject a malformed route instead of bridging a missing segment. */
export function worldPath(path: number[][] | undefined, height = .055): ScenePoint[] {
  if (!path?.length || path.some(p => p.length < 2 || !p.slice(0, 2).every(Number.isFinite))) return [];
  return path.map(p => [p[1], height, p[0]]);
}

export function navigationEvidence(snapshot: ControlSnapshot, now = performance.now()) {
  const nav = snapshot.navigation;
  const fresh = snapshot.runtimeFresh && snapshot.receivedAt != null && now-snapshot.receivedAt >= 0 && now-snapshot.receivedAt < 1000 && Number.isFinite(nav?.sensor_age_s) && nav!.sensor_age_s! >= 0 && nav!.sensor_age_s! <= .5;
  const executing = fresh && snapshot.motion.state === 'executing' && ['tracking', 'steering'].includes(nav?.state || '');
  const velocity = nav?.velocity?.[0];
  return { fresh, executing, blocked: nav?.state === 'blocked', flowSpeed: executing && Number.isFinite(velocity) ? Math.max(0, velocity!) : 0 };
}

export const reasoningStages = ['observing', 'inference', 'validating', 'executing', 'settling'] as const;
export const reasoningLabels = ['Observe', 'Plan', 'Validate', 'Move', 'Settle'];

export function reasoningStage(snapshot?: ControlSnapshot | null) {
  if (!snapshot?.runtimeFresh) return -1;
  return reasoningStages.indexOf(snapshot.agent?.state as typeof reasoningStages[number]);
}

export function cameraFrustum(camera: CameraGeometry) {
  const [fx,fy,cx,cy] = camera.intrinsics, m = camera.world_from_optical;
  if (m.length !== 16 || ![fx,fy,cx,cy,...m,camera.width,camera.height].every(Number.isFinite) || Math.min(fx,fy,camera.width,camera.height)<=0) return null;
  const corners: ScenePoint[] = [[0,0],[camera.width,0],[camera.width,camera.height],[0,camera.height]].map(([u,v]) => {
    const p = [(u-cx)*1.2/fx,(v-cy)*1.2/fy,1.2];
    const w = [0,1,2].map(r => m[r*4]*p[0]+m[r*4+1]*p[1]+m[r*4+2]*p[2]+m[r*4+3]);
    return [w[1],w[2],w[0]];
  });
  return {origin:[m[7],m[11],m[3]] as ScenePoint,corners};
}

/** Odom-derived wheel increments for Carter's 0.14 m wheels / 0.4132 m axle. */
export function wheelTravel(previous: [number, number, number], next: [number, number, number], dt: number): [number, number] {
  if (![...previous, ...next, dt].every(Number.isFinite) || dt <= 0 || dt > .5) return [0, 0];
  const dx = next[0] - previous[0], dy = next[1] - previous[1];
  const yaw = Math.atan2(Math.sin(next[2] - previous[2]), Math.cos(next[2] - previous[2]));
  // Teleports and reconnects must not spin the wheels.
  if (Math.hypot(dx, dy) > .5 || Math.abs(yaw) > Math.PI / 2) return [0, 0];
  const heading = previous[2] + yaw / 2;
  const travel = dx * Math.cos(heading) + dy * Math.sin(heading);
  return [(travel - yaw * .4132 / 2) / .14, (travel + yaw * .4132 / 2) / .14];
}

/** Observation animation is a receipt indicator, not a generated sensor measurement. */
export function observationSweep(frameAt: number, receivedAt: number, now: number, enabled: boolean) {
  const age = now-receivedAt, phase = (now-frameAt)/420;
  const active = enabled && Number.isFinite(age) && Number.isFinite(phase) && age >= 0 && age < 1000 && phase >= 0 && phase < 1;
  return {active,scale:active ? .08+.92*phase : 1,opacity:active ? .16*Math.sin(phase*Math.PI) : 0};
}
