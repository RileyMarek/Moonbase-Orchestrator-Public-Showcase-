import { Bone, Object3D, Quaternion, Vector3 } from 'three';

export const H1_JOINT_AXES: Record<string, readonly [number, number, number]> = {
  left_hip_yaw_joint:[0,0,1], left_hip_roll_joint:[1,0,0], left_hip_pitch_joint:[0,1,0],
  left_knee_joint:[0,1,0], left_ankle_joint:[0,1,0],
  right_hip_yaw_joint:[0,0,1], right_hip_roll_joint:[1,0,0], right_hip_pitch_joint:[0,1,0],
  right_knee_joint:[0,1,0], right_ankle_joint:[0,1,0], torso_joint:[0,0,1],
  left_shoulder_pitch_joint:[0,1,0], left_shoulder_roll_joint:[1,0,0], left_shoulder_yaw_joint:[0,0,1], left_elbow_joint:[0,1,0],
  right_shoulder_pitch_joint:[0,1,0], right_shoulder_roll_joint:[1,0,0], right_shoulder_yaw_joint:[0,0,1], right_elbow_joint:[0,1,0],
};
export const H1_JOINT_NAMES = Object.keys(H1_JOINT_AXES);
export interface JointBinding { bone: Bone; axis: Vector3; rest: Quaternion; }
export type H1Rig = Map<string, JointBinding>;

/** Validate names/axes up front. A GLB that looks right is not sufficient for telemetry. */
export function bindH1Rig(scene: Object3D): H1Rig {
  const bindings: H1Rig = new Map();
  scene.traverse(node=>{
    const axis = H1_JOINT_AXES[node.name];
    if (!axis) return;
    if (!(node instanceof Bone)) throw new Error(`${node.name} is not a GLB bone`);
    if (bindings.has(node.name)) throw new Error(`Duplicate H1 bone: ${node.name}`);
    const metadata = node.userData.rosJoint;
    if (metadata?.name !== node.name || !Array.isArray(metadata?.axis) ||
        metadata.axis.length !== 3 || metadata.axis.some((v:number,i:number)=>v !== axis[i])) {
      throw new Error(`Invalid ROS axis metadata: ${node.name}`);
    }
    bindings.set(node.name,{bone:node,axis:new Vector3(...axis),rest:node.quaternion.clone()});
  });
  const missing = H1_JOINT_NAMES.filter(name=>!bindings.has(name));
  if(missing.length) throw new Error(`H1 rig is missing ${missing.join(', ')}`);
  return bindings;
}

const delta = new Quaternion();
/** Absolute radians, applied in each joint's local rest frame. Never accumulate rotations. */
export function applyH1Pose(rig: H1Rig, joints: Record<string,number>) {
  // Isaac's current policy asset omits the _joint suffix; the Unitree URDF uses it.
  // Accept those exact 19 aliases, and reject ambiguous duplicate spellings.
  const normalized: Record<string,number> = {};
  for (const [name,value] of Object.entries(joints)) {
    const canonical = H1_JOINT_NAMES.includes(name) ? name : H1_JOINT_NAMES.find(n=>n === `${name}_joint`);
    if (canonical) {
      if (Object.hasOwn(normalized,canonical)) return {applied:false,matched:0,missing:H1_JOINT_NAMES,unknown:['ambiguous joint aliases']};
      normalized[canonical]=value;
    }
  }
  const missing = H1_JOINT_NAMES.filter(name=>!Object.hasOwn(normalized,name) || !Number.isFinite(normalized[name]));
  const unknown = Object.keys(joints).filter(name=>!Object.hasOwn(H1_JOINT_AXES,name) && !Object.hasOwn(H1_JOINT_AXES,`${name}_joint`));
  // Partial frames freeze the last complete pose instead of mixing timestamps across limbs.
  if(missing.length) return {applied:false,matched:19-missing.length,missing,unknown};
  for(const [name,binding] of rig) {
    binding.bone.quaternion.copy(binding.rest).multiply(delta.setFromAxisAngle(binding.axis,normalized[name]));
  }
  return {applied:true,matched:19,missing,unknown};
}
