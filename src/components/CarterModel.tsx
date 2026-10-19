import { useLayoutEffect, useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';

// ROS +X is forward (+Z here). Visual geometry never defines collision clearance.
function Wheel({ side }: { side: number }) {
  const tread = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const matrix = new Matrix4(), rotation = new Quaternion();
    for (let i = 0; i < 48; i++) {
      const angle = i * Math.PI * 2 / 48;
      rotation.setFromAxisAngle(new Vector3(1, 0, 0), -angle);
      matrix.compose(new Vector3(0, Math.cos(angle) * .138, Math.sin(angle) * .138), rotation, new Vector3(1, 1, 1));
      tread.current?.setMatrixAt(i, matrix);
    }
    if (tread.current) tread.current.instanceMatrix.needsUpdate = true;
  }, []);
  return <group position={[side * .29, .14, 0]}>
    <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.139, .139, .085, 64]}/><meshStandardMaterial color="#191e22" roughness={.9}/></mesh>
    <instancedMesh ref={tread} args={[undefined, undefined, 48]}><boxGeometry args={[.087, .004, .009]}/><meshStandardMaterial color="#30363a" roughness={.95}/></instancedMesh>
    <mesh position={[side * .047, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.105, .105, .012, 64]}/><meshStandardMaterial color="#b9c0c5" metalness={.65} roughness={.32}/></mesh>
    <mesh position={[side * .055, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.088, .0025, 8, 64]}/><meshStandardMaterial color="#7c858d" metalness={.7} roughness={.4}/></mesh>
  </group>;
}

function Vent({ side }: { side: number }) {
  const holes = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const matrix = new Matrix4();
    for (let row = 0; row < 9; row++) for (let col = 0; col < 10; col++) {
      matrix.makeTranslation(side * .264, .295 + row * .009, -.275 + col * .009);
      holes.current?.setMatrixAt(row * 10 + col, matrix);
    }
    if (holes.current) holes.current.instanceMatrix.needsUpdate = true;
  }, [side]);
  return <instancedMesh ref={holes} args={[undefined, undefined, 90]}><sphereGeometry args={[.0027, 6, 4]}/><meshStandardMaterial color="#283237" roughness={.9}/></instancedMesh>;
}

export function CarterModel({ color }: { color: string }) {
  return <group>
    <RoundedBox args={[.51, .105, .66]} radius={.012} smoothness={3} position={[0, .195, -.15]}><meshStandardMaterial color="#252d32" roughness={.7} metalness={.25}/></RoundedBox>
    <RoundedBox args={[.525, .19, .68]} radius={.008} smoothness={3} position={[0, .34, -.15]}><meshStandardMaterial color="#dce2e5" roughness={.42} metalness={.18}/></RoundedBox>
    <RoundedBox args={[.51, .015, .66]} radius={.004} smoothness={2} position={[0, .445, -.15]}><meshStandardMaterial color="#edf0f1" roughness={.45}/></RoundedBox>
    <mesh position={[0, .48, -.15]} rotation={[0, Math.PI / 4, 0]}><cylinderGeometry args={[.15, .235, .062, 4]}/><meshStandardMaterial color="#dfe5e8" roughness={.4} metalness={.15}/></mesh>
    <mesh position={[0, .528, -.15]}><cylinderGeometry args={[.064, .067, .033, 64]}/><meshStandardMaterial color="#919da3" metalness={.7} roughness={.3}/></mesh>
    <mesh position={[0, .575, -.15]}><cylinderGeometry args={[.061, .061, .067, 64]}/><meshStandardMaterial color="#151d21" metalness={.4} roughness={.25}/></mesh>
    <mesh position={[0, .611, -.15]}><cylinderGeometry args={[.063, .063, .005, 64]}/><meshStandardMaterial color="#c0c8cc" metalness={.7} roughness={.25}/></mesh>
    <Wheel side={-1}/><Wheel side={1}/>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * .17, .11, -.47]}><boxGeometry args={[.022, .13, .09]}/><meshStandardMaterial color="#707b82" metalness={.6} roughness={.45}/></mesh>
      <mesh position={[side * .17, .072, -.47]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.07, .07, .04, 40]}/><meshStandardMaterial color="#262c30" roughness={.85}/></mesh>
      <RoundedBox position={[side * .19, .464, .055]} args={[.073, .025, .049]} radius={.006} smoothness={2}><meshStandardMaterial color="#172025" roughness={.35}/></RoundedBox>
      <mesh position={[side * .264, .354, -.045]}><boxGeometry args={[.003, .032, .16]}/><meshStandardMaterial color="#17262c" metalness={.35} roughness={.25}/></mesh>
      <Vent side={side}/>
      <mesh position={[side * .19, .393, .193]}><sphereGeometry args={[.004, 12, 8]}/><meshStandardMaterial color="#535e64" metalness={.6}/></mesh>
    </group>)}
    <RoundedBox position={[0, .349, .193]} args={[.32, .035, .006]} radius={.003} smoothness={2}><meshStandardMaterial color="#122027" roughness={.25} metalness={.4}/></RoundedBox>
    <mesh position={[.112, .35, .199]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.008, .008, .006, 24]}/><meshStandardMaterial color="#183342" metalness={.6} roughness={.2}/></mesh>
    <mesh position={[-.12, .274, .194]}><boxGeometry args={[.055, .003, .003]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.15}/></mesh>
  </group>;
}
