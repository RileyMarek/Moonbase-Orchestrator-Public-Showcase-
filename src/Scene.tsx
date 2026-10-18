import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Bone, Group, Mesh, MeshStandardMaterial, BoxGeometry, Vector3, Object3D } from 'three';
import { H1_JOINT_AXES, bindH1Rig, applyH1Pose } from './telemetry/h1Rig';
import { useDemo, voxels } from './store';
import { OBSTACLES } from './telemetry/demoMockStream';

// Original procedural geometry; no proprietary robot meshes or policy weights.
function makeHumanoid() {
  const root = new Group();
  const metal = new MeshStandardMaterial({ color: '#a2bbc4', metalness: 0.75, roughness: 0.3 });
  const accent = new MeshStandardMaterial({ color: '#4cfcdf', emissive: '#0b7469', metalness: 0.4, roughness: 0.25 });
  function box(parent: Object3D, size: [number, number, number], position: [number, number, number], cyan = false) {
    const mesh = new Mesh(new BoxGeometry(...size), cyan ? accent : metal);
    mesh.position.set(...position); mesh.castShadow = true; parent.add(mesh);
  }
  function joint(parent: Object3D, name: string, position: [number, number, number]) {
    const bone = new Bone(); bone.name = name; bone.position.set(...position);
    // The H1 contract uses ROS axes; rotate the local axis into the Y-up view.
    bone.userData.rosJoint = { name, axis: [...H1_JOINT_AXES[name]] };
    parent.add(bone); return bone;
  }
  const torso = joint(root, 'torso_joint', [0, 0.95, 0]);
  box(torso, [0.37, 0.43, 0.22], [0, 0.24, 0]);
  box(torso, [0.27, 0.055, 0.235], [0, 0.34, 0], true);
  box(torso, [0.21, 0.22, 0.19], [0, 0.6, 0]);
  box(torso, [0.22, 0.045, 0.02], [0, 0.62, -0.1], true);
  for (const [side, sign] of [['left', -1], ['right', 1]] as const) {
    const yaw = joint(root, `${side}_hip_yaw_joint`, [sign * 0.12, 0.94, 0]);
    const roll = joint(yaw, `${side}_hip_roll_joint`, [0, 0, 0]);
    const hip = joint(roll, `${side}_hip_pitch_joint`, [0, 0, 0]);
    box(hip, [0.14, 0.38, 0.16], [0, -0.2, 0]);
    const knee = joint(hip, `${side}_knee_joint`, [0, -0.4, 0]);
    box(knee, [0.15, 0.095, 0.17], [0, 0, 0], true);
    box(knee, [0.105, 0.37, 0.12], [0, -0.2, 0]);
    const ankle = joint(knee, `${side}_ankle_joint`, [0, -0.4, 0]);
    box(ankle, [0.15, 0.07, 0.28], [0, -0.06, -0.055]);
    const shoulder = joint(torso, `${side}_shoulder_pitch_joint`, [sign * 0.25, 0.4, 0]);
    const shoulderRoll = joint(shoulder, `${side}_shoulder_roll_joint`, [0, 0, 0]);
    const shoulderYaw = joint(shoulderRoll, `${side}_shoulder_yaw_joint`, [0, 0, 0]);
    box(shoulderYaw, [0.105, 0.25, 0.115], [0, -0.14, 0]);
    const elbow = joint(shoulderYaw, `${side}_elbow_joint`, [0, -0.28, 0]);
    box(elbow, [0.08, 0.25, 0.1], [0, -0.13, 0]);
  }
  const rig = bindH1Rig(root);
  for (const binding of rig.values()) {
    const { x, y, z } = binding.axis;
    binding.axis.set(y, z, x);
  }
  return { root, rig };
}

function Humanoid() {
  const { root, rig } = useMemo(makeHumanoid, []);
  useFrame(() => applyH1Pose(rig, useDemo.getState().frame.joints));
  return <primitive object={root} />;
}
function Ripples() {
  const group = useRef<Group>(null);
  useFrame(() => {
    const { time, speed } = useDemo.getState().frame;
    group.current?.children.forEach((ring, i) => {
      const progress = ((time * speed * 0.45 + i / 4) % 1);
      ring.scale.setScalar(0.5 + progress * 3.2);
      ((ring as Mesh).material as MeshStandardMaterial).opacity = (1 - progress) * 0.5;
    });
  });
  return <group ref={group}>{[0, 1, 2, 3].map(i => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}><ringGeometry args={[0.99, 1, 96]} /><meshBasicMaterial color="#4df6dc" transparent depthWrite={false} /></mesh>)}</group>;
}
function Occupancy() {
  const positions = useMemo(() => new Float32Array([...voxels.cells.values()].flatMap(([x, y, z]) => [y * voxels.resolution, z * voxels.resolution, x * voxels.resolution])), []);
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#5fffe1" size={0.035} transparent opacity={0.65} /></points>;
}
function World() {
  const showVoxels = useDemo(s => s.showVoxels), plan = useDemo(s => s.plan);
  const selected = useDemo(s => s.selected);
  const orbit = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  useFrame(({ camera }) => {
    const target = plan ? new Vector3(5, 10, 5) : new Vector3(4.4, 3.1, 5.6);
    // Initial perspective is set by Canvas. Camera mode buttons deliberately reset the orbit.
    if (camera.userData.plan !== plan) {
      camera.position.copy(target); orbit.current?.target.set(0.7, 0.7, 0.7);
      orbit.current?.update(); camera.userData.plan = plan;
    }
  });
  return <>
    <color attach="background" args={['#0a141b']} />
    <fog attach="fog" args={['#0a141b', 12, 27]} />
    <ambientLight intensity={1.3} /><directionalLight position={[3, 7, 5]} intensity={3} castShadow />
    <Grid args={[40, 40]} cellSize={0.5} sectionSize={2} cellColor="#1b3b43" sectionColor="#2b555b" fadeDistance={18} position={[0, -0.01, 0]} />
    <Humanoid /><Ripples />
    {OBSTACLES.map(b => <mesh key={b.id} position={[b.center[1], b.center[2], b.center[0]]}><boxGeometry args={[b.size[1], b.size[2], b.size[0]]} /><meshStandardMaterial color="#ba7340" transparent opacity={showVoxels ? 0.3 : 0.85} /></mesh>)}
    {showVoxels && <Occupancy />}
    <group position={[-2, 0.3, -1.6]}><mesh><boxGeometry args={[0.6, 0.5, 0.85]} /><meshStandardMaterial color={selected === 'carter-01' ? '#4df6dc' : '#56646d'} /></mesh>{[-0.32, 0.32].flatMap(x => [-0.25, 0.25].map(z => <mesh key={`${x}${z}`} position={[x, -0.14, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.16, 0.16, 0.1, 16]} /><meshStandardMaterial color="#111c24" /></mesh>))}</group>
    <group position={[-2, 0.48, 0.1]}><mesh><boxGeometry args={[0.3, 0.2, 0.55]} /><meshStandardMaterial color={selected === 'go2-01' ? '#4df6dc' : '#56646d'} /></mesh>{[-0.2, 0.2].flatMap(x => [-0.2, 0.2].map(z => <mesh key={`${x}${z}`} position={[x, -0.2, z]}><boxGeometry args={[0.06, 0.4, 0.06]} /><meshStandardMaterial color="#87969e" /></mesh>))}</group>
    <OrbitControls ref={orbit} makeDefault minDistance={2.5} maxDistance={16} maxPolarAngle={Math.PI / 2.03} target={[0.7, 0.7, 0.7]} />
  </>;
}
export function Scene() {
  return <Canvas camera={{ position: [4.4, 3.1, 5.6], fov: 43 }} dpr={[1, 1.5]} gl={{ antialias: true }} fallback={<p>WebGL is required for the interactive twin. The telemetry panel remains available.</p>}><World /></Canvas>;
}
