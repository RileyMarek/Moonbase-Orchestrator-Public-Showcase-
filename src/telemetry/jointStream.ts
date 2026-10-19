import type { JointSample, PoseSample } from './foxgloveTelemetry';

export type StreamConnection = 'connecting' | 'waiting' | 'disconnected' | 'disabled';
export type JointFrame = JointSample & { receivedAt: number; sequence: number };
export type PoseFrame = PoseSample & { receivedAt: number; sequence: number };
const poses = new Map<string, PoseFrame>();
const latest = new Map<string, JointFrame>();
let connection: StreamConnection = 'disconnected';
let sequence = 0;

/** Animation reads the latest sample directly; React diagnostics still refresh at 10 Hz. */
export function publishJointFrame(sample: JointSample, now = performance.now()) {
  latest.set(sample.robotId, { ...sample, receivedAt: now, sequence: ++sequence });
}
export function getJointFrame(robotId: string) { return latest.get(robotId); }
export function setJointConnection(next: StreamConnection) {
  connection = next;
  // A reconnect/mode switch must receive a new frame before claiming a live pose.
  if (next !== 'waiting') { latest.clear(); poses.clear(); }
}
export function getJointFreshness(robotId: string, now = performance.now()) {
  if (connection !== 'waiting') return connection;
  const frame = latest.get(robotId);
  return !frame ? 'waiting' : now - frame.receivedAt > 2000 ? 'stale' : 'live';
}

export function publishPoseFrame(sample: PoseSample, now = performance.now()) {
  poses.set(sample.robotId, {...sample,receivedAt:now,sequence:++sequence});
}
export function getPoseFrame(robotId: string) { return poses.get(robotId); }
export function getPoseFreshness(robotId: string, now = performance.now()) {
  if (connection !== 'waiting') return connection;
  const frame = poses.get(robotId);
  return !frame ? 'waiting' : now-frame.receivedAt>2000 ? 'stale' : 'live';
}
