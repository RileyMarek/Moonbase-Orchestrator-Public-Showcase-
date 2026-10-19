import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, ShaderMaterial } from 'three';
import { useAppStore } from '../store';
import { getPoseFrame } from '../telemetry/jointStream';
import { voxelStream } from '../telemetry/voxelStream';
import { worldPoseToThree } from '../telemetry/worldPose';
import { SENSOR_FIELD_RADIUS_M, sensorFresh } from '../domain/spatialPresentation';

const vertexShader = `varying vec2 positionOnFloor;
void main(){positionOnFloor=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragmentShader = `uniform float time; varying vec2 positionOnFloor;
void main(){
  float r=length(positionOnFloor);
  float envelope=smoothstep(.46,.61,r)*(1.-smoothstep(.85,1.2,r));
  float angle=atan(positionOnFloor.y,positionOnFloor.x);
  float phase=r*38.-time*1.5+.18*sin(angle*6.+time*.4);
  float width=max(fwidth(phase),.055);
  float wave=1.-smoothstep(.035,.035+width,abs(sin(phase)));
  float detail=.55+.45*sin(angle*72.+r*4.);
  gl_FragColor=vec4(.29,.77,.78,envelope*wave*detail*.3);
}`;

// A decorative depth-activity field, not synthetic lidar measurements.
export function RobotSensorField({ robotId, speed=0, stopped=false }: { robotId: string; speed?:number; stopped?:boolean }) {
  const group = useRef<Group>(null), material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  const reducedMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)'), []);
  const phase=useRef(0);
  useFrame((_, delta) => {
    const pose = getPoseFrame(robotId), depth = voxelStream(robotId);
    if (!group.current) return;
    const fresh = !!pose && sensorFresh(performance.now(), pose.receivedAt, depth.receivedAt, depth.synchronized);
    group.current.visible = fresh;
    if (!fresh || !pose) return;
    const world = worldPoseToThree(pose);
    group.current.position.set(world.position[0], .018, world.position[2]);
    if (useAppStore.getState().sceneMotion && !reducedMotion.matches && !stopped) phase.current += Math.min(delta,.1) * (.45 + Math.min(Math.max(speed,0),.5)*3);
    if (material.current) material.current.uniforms.time.value = phase.current;
  });
  return <group ref={group} visible={false} name={`sensor-field-${robotId}`}><mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}>
    <planeGeometry args={[SENSOR_FIELD_RADIUS_M * 2, SENSOR_FIELD_RADIUS_M * 2]}/>
    <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} toneMapped={false}/>
  </mesh></group>;
}
