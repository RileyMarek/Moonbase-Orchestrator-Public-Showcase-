import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Line2 } from 'three-stdlib';
import type { ScenePoint } from '../domain/sceneEvidence';
import { useAppStore } from '../store';

/** Wide antialiased strokes preserve the exact planner polyline, including sharp turns. */
export function RouteRibbon({ points, color = '#16bd8b', speed = 0, draft = false, width = 5, expiresAt = 0 }: {
  points: ScenePoint[]; color?: string; speed?: number; draft?: boolean; width?: number; expiresAt?: number;
}) {
  const flow = useRef<Line2>(null);
  const motion = useAppStore(s => s.sceneMotion);
  useFrame((_, dt) => {
    if (flow.current) {
      flow.current.visible = motion && speed > 0 && performance.now() < expiresAt;
      if (flow.current.visible) flow.current.material.dashOffset -= Math.min(dt, .05) * speed;
    }
  });
  if (points.length < 2) return null;
  return <group>
    <Line points={points} color={color} lineWidth={width + 5} transparent opacity={draft ? .06 : .12} depthWrite={false}/>
    <Line points={points} color={color} lineWidth={width} dashed={draft} dashSize={.10} gapSize={.08} transparent opacity={draft ? .65 : .94} depthWrite={false}/>
    {!draft && speed > 0 && <Line ref={flow} points={points} color="#e7f6ff" lineWidth={width * .38} dashed dashSize={.09} gapSize={.42} transparent opacity={.85} depthWrite={false}/>}
  </group>;
}

export function GroundTarget({ point, color = '#16bd8b', radius = .12 }: {point: ScenePoint; color?: string; radius?: number}) {
  return <group position={point}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[radius, radius + .013, 80]}/><meshBasicMaterial color={color} transparent opacity={.95} depthWrite={false}/></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0,-.002,0]}><circleGeometry args={[radius, 64]}/><meshBasicMaterial color={color} transparent opacity={.10} depthWrite={false}/></mesh>
    <mesh position={[0,.012,0]}><sphereGeometry args={[.022,16,12]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.3}/></mesh>
  </group>;
}
