/** Display-only filtering. Never use this value for control or validation. */
export function telemetryStep(current: number, target: number, dt: number, dangerUp = false): number {
  if (!Number.isFinite(target)) return 0;
  if (!Number.isFinite(current) || (dangerUp ? target >= current : target <= current)) return target;
  return target + (current - target) * Math.exp(-Math.max(0, dt) / .18);
}
