/** Author: Riley Marek. Project: Moonbase. Date: 2026-09-29.
 * Render the exact static collision-box geometry advertised by Isaac's course. */
import { RoundedBox } from '@react-three/drei';
import type { Course } from './MissionControl';
import { useAppStore } from '../store';

export function ObstacleCourse({course}: {course: Course}) {
  const light = useAppStore(s=>s.colorMode==='light');
  return <group>
    {course.obstacles.map(o=><RoundedBox key={o.id} position={[o.center[1],o.center[2],o.center[0]]} args={[o.size[1],o.size[2],o.size[0]]} radius={Math.min(.015,...o.size.map(n=>n/8))} smoothness={3} castShadow receiveShadow><meshStandardMaterial color={light?'#e4eaee':'#637887'} roughness={.62} metalness={.1}/></RoundedBox>)}
  </group>;
}
