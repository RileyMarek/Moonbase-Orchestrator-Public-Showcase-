import { Line } from '@react-three/drei';
import type { CameraGeometry } from '../hooks/useRobotControl';
/** Optical rays use the observed calibration and world transform, never a guessed FOV. */
export function CameraFrustum({camera}:{camera:CameraGeometry}) {
  const k=camera.intrinsics,m=camera.world_from_optical;
  if(k.length!==9||m.length!==16||!k.every(Number.isFinite)||!m.every(Number.isFinite)||k[0]<=0||k[4]<=0)return null;
  const transform=(x:number,y:number,z:number):[number,number,number]=>[m[4]*x+m[5]*y+m[6]*z+m[7],m[8]*x+m[9]*y+m[10]*z+m[11],m[0]*x+m[1]*y+m[2]*z+m[3]];
  const origin=transform(0,0,0),depth=.75;
  const corners=[[0,0],[camera.width,0],[camera.width,camera.height],[0,camera.height]].map(([u,v])=>transform((u-k[2])*depth/k[0],(v-k[5])*depth/k[4],depth));
  return <group>{corners.map((corner,i)=><Line key={i} points={[origin,corner]} color="#6aa9b0" transparent opacity={.22} lineWidth={.7}/>)}<Line points={[...corners,corners[0]]} color="#6aa9b0" transparent opacity={.25} lineWidth={.7}/></group>;
}
