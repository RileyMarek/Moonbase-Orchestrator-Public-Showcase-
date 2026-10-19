import { Group } from 'three';

export const GO2_LEGS = ['FL', 'FR', 'RL', 'RR'] as const;
export const GO2_JOINTS = GO2_LEGS.flatMap(leg => ['hip', 'thigh', 'calf'].map(joint => `${leg}_${joint}_joint`));
export type Go2Rig = Map<string, Group>;

/** Unitree radians; exact USD aliases are accepted, partial/ambiguous packets are atomic rejects. */
export function applyGo2Pose(rig: Go2Rig, joints: Record<string, number>) {
  const normalized = new Map<string, number>();
  for (const [name, value] of Object.entries(joints)) {
    const key = GO2_JOINTS.includes(name) ? name : `${name}_joint`;
    if (!GO2_JOINTS.includes(key)) continue;
    if (normalized.has(key) || !Number.isFinite(value)) return false;
    normalized.set(key, value);
  }
  if (GO2_JOINTS.some(name => !normalized.has(name) || !rig.has(name))) return false;
  for (const name of GO2_JOINTS) {
    const angle = normalized.get(name)!;
    // ROS X-forward/Y-left/Z-up maps to Three Z-forward/X-left/Y-up.
    rig.get(name)!.rotation.set(name.includes('_hip_') ? 0 : angle, 0, name.includes('_hip_') ? angle : 0);
  }
  return true;
}
