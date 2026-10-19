import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { getPoseFrame } from '../telemetry/jointStream';
import { worldPoseToThree } from '../telemetry/worldPose';
/** Soft visual grounding only; it does not assert physical foot contact. */
export function RobotGrounding({robotId}:{robotId:string}) {
  const group=useRef<Group>(null);
  useFrame(()=>{const pose=getPoseFrame(robotId);if(!group.current)return;group.current.visible=!!pose;if(pose){const p=worldPoseToThree(pose).position;group.current.position.set(p[0],.003,p[2]);}});
  return <group ref={group}><mesh rotation={[-Math.PI/2,0,0]} raycast={()=>{}}><planeGeometry args={[1.5,1.5]}/><shaderMaterial transparent depthWrite={false} toneMapped={false}
    vertexShader="varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}"
    fragmentShader="varying vec2 p;void main(){float a=exp(-dot(p,p)*7.)*.36;gl_FragColor=vec4(0.,0.,0.,a);}"/></mesh></group>;
}
