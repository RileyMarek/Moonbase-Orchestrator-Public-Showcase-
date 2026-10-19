import { CameraFrustum } from "./CameraFrustum";
import { useMemo, useRef } from 'react';

import { useFrame } from '@react-three/fiber';

import { Html, Line } from '@react-three/drei';

import { Color, DoubleSide, InstancedMesh, Matrix4, Vector3 } from 'three';

import { voxelStream } from '../telemetry/voxelStream';

import { getPoseFrame } from '../telemetry/jointStream';

import { worldPoseToThree } from '../telemetry/worldPose';

import { LOCAL_VOXEL_LIMIT, localVoxels, sensorFresh } from '../domain/spatialPresentation';

import { RobotSensorField } from './RobotSensorField';

import type { WaypointProof } from '../domain/waypointProof';



export function Trajectory({ points }: { points: [number, number, number][] }) {

  if (points.length < 2) return null;

  const end = points[points.length - 1];

  // Preserve planner vertices: smoothing can visually cut through obstacles.

  return <><Line points={points} color="#6ebec7" lineWidth={1.2} transparent opacity={.55} depthWrite={false}/>

    <mesh position={end} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.098, .102, 128]}/><meshBasicMaterial color="#85d5d8" transparent opacity={.6} side={DoubleSide} depthWrite={false}/></mesh></>;

}



export function SpatialOverlay({ robotId, points, proof, camera, status, speed=0, showPerception=true, showVoxels=true }: { speed?:number;showPerception?:boolean;showVoxels?:boolean;robotId: string; points: [number, number, number][]; status?: string; camera?: import('../hooks/useRobotControl').CameraGeometry | null; proof?: WaypointProof | null }) {

  const mesh = useRef<InstancedMesh>(null), revision = useRef(''), sampledAt = useRef(0);

  const matrix = useMemo(() => new Matrix4(), []), color = useMemo(() => new Color(), []), scale = useMemo(() => new Vector3(), []);

  useFrame(() => {

    const stream = voxelStream(robotId), pose = getPoseFrame(robotId), now = performance.now();

    if (!mesh.current) return;
    if (!showVoxels) { mesh.current.count=0; revision.current=""; return; }

    if (!pose || !sensorFresh(now, pose.receivedAt, stream.receivedAt, stream.synchronized)) {

      mesh.current.count = 0; revision.current = ''; return;

    }

    if (now - sampledAt.current < 100) return;

    sampledAt.current = now;

    const world = worldPoseToThree(pose), r = stream.resolution;

    const key = `${stream.revision}:${Math.round(world.position[0] / r)}:${Math.round(world.position[2] / r)}`;

    if (revision.current === key) return;

    let i = 0;

    for (const [x, y, z] of localVoxels(stream.cells.values(), r, world.position[2], world.position[0])) {

      matrix.makeTranslation((y + .5) * r, (z + .5) * r, (x + .5) * r);

      const floor = z * r < .15;

      scale.set(r * .20, r * .20, r * .20); matrix.scale(scale);

      mesh.current.setMatrixAt(i, matrix);

      color.set(floor ? '#6eaeb5' : '#db9d80'); mesh.current.setColorAt(i++, color);

    }

    mesh.current.count = i; mesh.current.instanceMatrix.needsUpdate = true;

    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;

    mesh.current.computeBoundingSphere(); revision.current = key;

  });

  const trace = proof?.trace.map(row => [row.pose[1], .027, row.pose[0]] as [number, number, number]) || [];

  const goal = proof?.target ? [proof.target[1], .026, proof.target[0]] as [number, number, number] : null;

  const origin = proof?.origin ? [proof.origin[1], .026, proof.origin[0]] as [number, number, number] : null;

  const validated = proof?.steps[3]?.state === 'passed';

  return <>{showPerception && <><RobotSensorField robotId={robotId} speed={speed} stopped={["canceled","stopped","failed"].includes(status || "")}/>{camera && <CameraFrustum camera={camera}/>}</>}

    <instancedMesh visible={showVoxels} ref={mesh} args={[undefined, undefined, LOCAL_VOXEL_LIMIT]} count={0}><sphereGeometry args={[.5, 6, 4]}/><meshBasicMaterial transparent opacity={.32} depthWrite={false}/></instancedMesh>

    <Trajectory points={points}/>

    {trace.length > 1 && <Line points={trace} color="#b9cfd3" lineWidth={.8} transparent opacity={.35} depthWrite={false}/>}

    {goal && <><mesh position={goal} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.098, .102, 128]}/><meshBasicMaterial color={validated ? '#85d5d8' : '#f94f01'} transparent opacity={.65} side={DoubleSide} depthWrite={false}/></mesh>

      <Html position={[goal[0], .19, goal[2]]} center style={{ pointerEvents: 'none', whiteSpace: 'nowrap', fontSize: 9, color: validated ? '#99dce0' : '#f94f01', background: '#07121ab0', padding: '2px 5px', borderRadius: 4 }}>{validated ? 'Waypoint · 10 cm' : 'Proposal · awaiting validation'}</Html>

      {!validated && origin && <Line points={[origin, goal]} color="#f94f01" dashed dashSize={.05} gapSize={.06} lineWidth={1} transparent opacity={.5}/>}

    </>}

  </>;

}

