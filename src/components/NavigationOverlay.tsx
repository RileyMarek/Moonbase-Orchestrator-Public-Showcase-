import { Html, Line } from '@react-three/drei';
import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Group, InstancedMesh, Matrix4 } from 'three';
import type { ControlSnapshot } from '../hooks/useRobotControl';

const point = (p: number[], height = 0.07): [number, number, number] => [p[1], height, p[0]];

function OccupiedCells({cells}: {cells:number[][]}) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new Matrix4();
    const valid = cells.filter(p => p.length >= 2 && p.slice(0, 2).every(Number.isFinite)).slice(0, 512);
    mesh.current.count = valid.length;
    valid.forEach((p, i) => mesh.current!.setMatrixAt(i, matrix.makeTranslation(p[1], .035, p[0])));
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [cells]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, 512]}><boxGeometry args={[.07, .025, .07]}/><meshBasicMaterial color="#f06d68" transparent opacity={.24}/></instancedMesh>;
}

export function NavigationOverlay({ snapshot }: { snapshot: ControlSnapshot }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    if (group.current) group.current.visible = !!snapshot.runtimeFresh && snapshot.receivedAt != null && performance.now() - snapshot.receivedAt < 1000;
  });
  const nav = snapshot.navigation;
  if (!nav || !snapshot.runtimeFresh || snapshot.receivedAt == null) return null;
  const pose = snapshot.pose;
  const path = nav.path?.map(p => point(p)) || [];
  const trace = nav.trace?.map(p => point(p, .09)) || [];
  const held = ['holding','held'].includes(snapshot.mission?.state || '');
  const status = held ? snapshot.mission!.state : snapshot.motion.state === 'succeeded' ? 'arrived' : nav.state;
  const preview = held ? [] : nav.preview?.map(p => point(p, .11)) || [];
  return <group ref={group}>
    {pose && nav.state === 'blocked' && <Html position={point(pose, .92)} center style={{pointerEvents:'none',whiteSpace:'nowrap',fontSize:9,color:'#ffad9d',background:'#081a22d0',padding:'3px 6px',borderRadius:4}}>
      {nav.state.toUpperCase()} · {nav.measured_hz != null ? `${nav.measured_hz.toFixed(1)} Hz measured` : 'rate unmeasured'}
      {nav.partial_route && ' · OBSERVING CORRIDOR'}
    </Html>}
    {path.length > 1 && <Line points={path} color="#32d7c5" lineWidth={1.4} transparent opacity={.65} dashed dashSize={.10} gapSize={.04} depthTest={true} depthWrite={false} renderOrder={20} />}
    {trace.length > 1 && <Line points={trace} color="#effffa" lineWidth={1} transparent opacity={.35} depthTest={true} depthWrite={false} renderOrder={21} />}
    {preview.length > 1 && <Line points={preview} color="#87dfff" lineWidth={1.6} transparent opacity={.65} depthTest={true} depthWrite={false} renderOrder={22} />}
    {nav.occupied && <OccupiedCells cells={nav.occupied}/>}
    {pose && <mesh position={point(pose)} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[(nav.footprint_radius_m || .75) - .003, nav.footprint_radius_m || .75, 128]} /><meshBasicMaterial color={nav.state === 'blocked' ? '#ff8878' : '#55e8d2'} transparent opacity={.22} side={DoubleSide} depthWrite={false} /></mesh>}
    {nav.target && <><mesh position={point(nav.target)} rotation={[-Math.PI / 2, 0, 0]} renderOrder={23}><ringGeometry args={[.098, .102, 128]} /><meshBasicMaterial color="#65f0d3" depthTest={true} depthWrite={false}/></mesh><Html position={point(nav.target, .22)} center style={{pointerEvents:'none',whiteSpace:'nowrap',fontSize:9,color:'#b5fff0',background:'#081a22e8',padding:'3px 5px',border:'1px solid #245f66',borderRadius:6,transform:'translateY(-10px)'}}>ROS GOAL · {status}</Html></>}
    {nav.lookahead && <mesh position={point(nav.lookahead, .14)}><sphereGeometry args={[.016, 20, 12]} /><meshBasicMaterial color="#93e9ff" /></mesh>}
  </group>;
}
