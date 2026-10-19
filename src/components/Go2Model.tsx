import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Group } from 'three';
import { GO2_LEGS, applyGo2Pose } from '../telemetry/go2Rig';
import { getJointFrame, getPoseFrame } from '../telemetry/jointStream';

const shell = '#bfc5c5';
const graphite = '#20292c';

function Motor({ side }: { side: number }) {
  return <group rotation={[0, 0, Math.PI / 2]}>
    <mesh castShadow><cylinderGeometry args={[.043, .043, .041, 32]}/><meshStandardMaterial color={graphite} roughness={.48} metalness={.45}/></mesh>
    <mesh position={[0, side * .022, 0]}><cylinderGeometry args={[.031, .031, .003, 32]}/><meshStandardMaterial color={shell} roughness={.4} metalness={.6}/></mesh>
  </group>;
}

/** Lightweight Go2 silhouette, with Unitree URDF joint origins and 0.213 m leg links.
 * Procedural presentation geometry, not a replacement for the simulator's collision asset.
 */
export function Go2Model({ robotId, color }: { robotId: string; color: string }) {
  const root = useRef<Group>(null);
  const rig = useRef(new Map<string, Group>());
  const sequence = useRef(-1);
  useFrame(() => {
    if (!root.current) return;
    // Odom is the base-link height. Registry-only previews use a neutral standing height.
    root.current.position.y = .32;
    const frame = getJointFrame(robotId);
    if (frame && performance.now() - frame.receivedAt < 2000 && frame.sequence !== sequence.current) {
      applyGo2Pose(rig.current, frame.joints);
      sequence.current = frame.sequence;
    }
  }, -2);
  const bind = (name: string) => (node: Group | null) => {
    if (node) rig.current.set(name, node); else rig.current.delete(name);
  };
  return <group ref={root} position={[0, .32, 0]}>
    <RoundedBox args={[.15, .115, .43]} radius={.033} smoothness={4} castShadow><meshStandardMaterial color={shell} roughness={.42} metalness={.35}/></RoundedBox>
    <RoundedBox args={[.126, .028, .34]} position={[0, .064, -.015]} radius={.012} smoothness={3}><meshStandardMaterial color={graphite} roughness={.5}/></RoundedBox>
    <mesh position={[0, .081, -.11]}><boxGeometry args={[.044, .002, .065]}/><meshStandardMaterial color={color} roughness={.55}/></mesh>
    {[-1, 1].map(side => <group key={side} position={[side * .077, .009, -.035]}>
      {Array.from({length: 8}, (_, i) => <mesh key={i} position={[0, 0, i * .013]}><boxGeometry args={[.002, .026, .003]}/><meshStandardMaterial color={graphite}/></mesh>)}
    </group>)}
    <RoundedBox args={[.12, .092, .11]} position={[0, -.006, .245]} radius={.025} smoothness={4} castShadow><meshStandardMaterial color={graphite} metalness={.3} roughness={.35}/></RoundedBox>
    <mesh position={[0, .014, .299]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.027, .027, .009, 40]}/><meshStandardMaterial color="#080f13" roughness={.15} metalness={.75}/></mesh>
    <mesh position={[0, -.04, .286]}><sphereGeometry args={[.031, 32, 16]}/><meshStandardMaterial color="#10191c" roughness={.24} metalness={.5}/></mesh>
    {GO2_LEGS.map(leg => {
      const side = leg.endsWith('L') ? 1 : -1;
      const front = leg.startsWith('F');
      return <group key={leg} position={[side * .0465, 0, front ? .1934 : -.1934]} ref={bind(`${leg}_hip_joint`)} rotation={[0, 0, side * .1]}>
        <mesh position={[side * .043, 0, 0]}><boxGeometry args={[.086, .033, .036]}/><meshStandardMaterial color={graphite} roughness={.5} metalness={.4}/></mesh>
        <group position={[side * .0955, 0, 0]} ref={bind(`${leg}_thigh_joint`)} rotation={[front ? .8 : 1, 0, 0]}>
          <Motor side={side}/>
          <RoundedBox args={[.025, .213, .035]} position={[0, -.1065, 0]} radius={.011} smoothness={3} castShadow><meshStandardMaterial color={shell} roughness={.4} metalness={.4}/></RoundedBox>
          <group position={[0, -.213, 0]} ref={bind(`${leg}_calf_joint`)} rotation={[-1.5, 0, 0]}>
            <Motor side={side}/>
            <mesh position={[0, -.099, 0]} castShadow><cylinderGeometry args={[.012, .009, .198, 16]}/><meshStandardMaterial color={graphite} roughness={.42} metalness={.5}/></mesh>
            <mesh position={[0, -.213, 0]} castShadow><sphereGeometry args={[.022, 24, 16]}/><meshStandardMaterial color="#111718" roughness={.93}/></mesh>
          </group>
        </group>
      </group>;
    })}
  </group>;
}
