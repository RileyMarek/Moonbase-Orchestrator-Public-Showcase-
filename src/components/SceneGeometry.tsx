import { Line } from "@react-three/drei";
import type { ControlSnapshot } from "../hooks/useRobotControl";

export function SceneGeometry({snapshot,showObstacles=true}:{snapshot:ControlSnapshot;showObstacles?:boolean}) {
  const scene=snapshot.fleet?.environment;
  if(!scene || !snapshot.fleet?.environment_fresh)return null;
  const [xmin,ymin,xmax,ymax]=scene.bounds;
  const boundary:[number,number,number][]=[[ymin,.015,xmin],[ymax,.015,xmin],[ymax,.015,xmax],[ymin,.015,xmax],[ymin,.015,xmin]];
  const path=snapshot.globalNavigation?.path?.map(p=>[p[1],.035,p[0]] as [number,number,number]);
  return <group>
    <Line points={boundary} color="#4b9778" transparent opacity={.3} lineWidth={1}/>
    {showObstacles && scene.obstacles.map(o=><mesh key={o.id} position={[o.center[1],o.center[2],o.center[0]]}>
      <boxGeometry args={[o.size[1],o.size[2],o.size[0]]}/><meshStandardMaterial color={o.id==="Terminal"?"#8d9eac":"#536477"} roughness={.8}/>
    </mesh>)}
    {path && path.length>1 && snapshot.globalNavigation?.ready && <Line points={path} color="#f94f01" transparent opacity={.55} lineWidth={1.2}/>}
  </group>;
}
