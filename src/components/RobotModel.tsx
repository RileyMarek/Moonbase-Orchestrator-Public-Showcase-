import { aboveFloor, FLOOR_Y, VisualBounds } from '../demo/grounding';
import { MetricModel } from './MetricModel';
/**

 * Author: Riley Marek

 * Project: Project Moonbase

 * File: RobotModel.tsx

 * Description: Renders composed 3D meshes for different robot types matching logo redesign. Implements physical pathfinding.

 * Date: 2026-09-08

 */



import React, { useMemo, useRef } from 'react';

import type { ThreeEvent } from '@react-three/fiber';

import { H1Model } from './H1Model';

import { CarterModel } from './CarterModel';

import { Go2Model } from './Go2Model';

import { getPoseFrame } from '../telemetry/jointStream';

import { worldPoseToThree } from '../telemetry/worldPose';



import { useFrame } from '@react-three/fiber';

import { Group, Vector3 } from 'three';

import { Html } from '@react-three/drei';



import { useAppStore } from '../store';

import type { Robot } from '../store';



/**

 * Name: AMRModel

 * Description: AMR base matching the logo (tank treads, domed cab, offroad build).

 */

const AMRModel: React.FC<{ color: string; variant?: 'flat' | 'arm' }> = ({ color, variant }) => (

  variant !== 'arm' ? <CarterModel color={color}/> : <group position={[0, 0.6, 0]}>

    {/* Base Chassis */}

    <mesh position={[0, 0, 0]}>

      <boxGeometry args={[1.0, 0.4, 1.6]} />

      <meshStandardMaterial color="#475569" />

    </mesh>

    

    {/* Tank Treads */}

    {[-1, 1].map((x) => (

      <mesh key={`tread-${x}`} position={[x * 0.6, -0.2, 0]}>

        {/* Elongated flattened cylinder for treads */}

        <boxGeometry args={[0.3, 0.4, 2.0]} />

        <meshStandardMaterial color="#111827" />

      </mesh>

    ))}

    

    {/* Domed Cab / Engine block */}

    <mesh position={[0, 0.4, -0.4]}>

      <sphereGeometry args={[0.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />

      <meshStandardMaterial color={color} />

    </mesh>

    <mesh position={[0, 0.4, -0.4]}>

      <cylinderGeometry args={[0.4, 0.4, 0.2]} />

      <meshStandardMaterial color="#0d9488" transparent opacity={0.8} />

    </mesh>



    {/* Variants */}

    {variant === 'arm' ? (

      <group position={[0, 0.2, 0.4]}>

        {/* Base link */}

        <mesh position={[0, 0.2, 0]}>

          <cylinderGeometry args={[0.2, 0.2, 0.4]} />

          <meshStandardMaterial color="#ccc" />

        </mesh>

        {/* Arm link 1 */}

        <mesh position={[0, 0.7, 0]} rotation={[Math.PI / 6, 0, 0]}>

          <boxGeometry args={[0.15, 0.8, 0.15]} />

          <meshStandardMaterial color="#ea580c" />

        </mesh>

        {/* Cargo Crate */}

        <mesh position={[0, 1.2, 0.4]}>

          <boxGeometry args={[0.6, 0.6, 0.6]} />

          <meshStandardMaterial color="#b45309" />

        </mesh>

      </group>

    ) : (

      <>

        {/* Flat Cargo Bed */}

        <mesh position={[0, 0.25, 0.4]}>

          <boxGeometry args={[0.9, 0.1, 1.0]} />

          <meshStandardMaterial color="#334155" />

        </mesh>

      </>

    )}

  </group>

);



/**

 * Name: RobotModel

 * Description: Renders the 3D composed mesh and handles pathfinding interpolation movement.

 */

export const RobotModel: React.FC<{ robot: Robot; onFocus?:()=>void;selectable?:boolean }> = ({ robot, onFocus,selectable=true }) => {

  const groupRef = useRef<Group>(null);
  const visualRef=useRef<Group>(null);
  const labelRef=useRef<HTMLDivElement>(null);
  const support=useMemo(()=>new VisualBounds(),[]);

  const selectedRobotId = useAppStore((state) => state.selectedRobotId);

  const selectRobot = useAppStore((state) => state.selectRobot);

  const updateRobotPosition = useAppStore((state) => state.updateRobotPosition);

  const updateRobotStatus = useAppStore((state) => state.updateRobotStatus);

  const updateRobotTarget = useAppStore((state) => state.updateRobotTarget);



  const isSelected = selectedRobotId === robot.id;



  // Pathfinding and animation loop

  useFrame((state) => {

    if (!groupRef.current) return;

    const pose = robot.mode === 'simulation' ? getPoseFrame(robot.id) : undefined;

    if (pose && performance.now()-pose.receivedAt < 2000) {

      const world = worldPoseToThree(pose);

      groupRef.current.position.set(...world.position);

      groupRef.current.quaternion.copy(world.rotation);

      return;

    }

    if(useAppStore.getState().uiTheme==='operator')return;

    if (robot.type === 'quadruped') return;

    // A measured joint pose must not be obscured by synthetic walking/bobbing.

    if (robot.type === 'humanoid') {

      groupRef.current.position.y = robot.position[1];

      if (robot.id === 'bot-01' || robot.joints) return;

    }



    if (robot.targetPosition && robot.status === 'active') {

      const targetVec = new Vector3(...robot.targetPosition);

      const currentPos = groupRef.current.position;

      

      // Calculate distance to target

      const distance = currentPos.distanceTo(targetVec);

      

      if (distance > 0.1) {

        // Look at target

        groupRef.current.lookAt(targetVec);

        // Move towards target

        const speed = 0.05; // Base speed

        currentPos.lerp(targetVec, speed);

        

        // Add bobbing motion while walking

        if (robot.type !== 'humanoid') groupRef.current.position.y = (robot.position[1] || 0) + Math.abs(Math.sin(state.clock.elapsedTime * 8)) * 0.1;

      } else {

        // Arrived at destination

        groupRef.current.position.copy(targetVec);

        updateRobotPosition(robot.id, [targetVec.x, targetVec.y, targetVec.z]);

        updateRobotTarget(robot.id, undefined);

        updateRobotStatus(robot.id, 'idle');

      }

    } else if (robot.type !== 'humanoid') {

      // Idle bobbing

      groupRef.current.position.y = (robot.position[1] || 0) + Math.sin(state.clock.elapsedTime * 2) * 0.05;

    }

  }, -3);



  // Hard floor recovery: malformed/negative heights are reset and the posed mesh is lifted above the floor.
  useFrame(()=>{
    if(!groupRef.current||!visualRef.current)return;
    groupRef.current.position.y=aboveFloor(groupRef.current.position.y);
    visualRef.current.position.y=0;
    const bounds=support.measure(visualRef.current);
    if(Number.isFinite(bounds.min.y)){
      const lift=Math.max(0,FLOOR_Y-bounds.min.y);visualRef.current.position.y+=lift;
      if(labelRef.current)labelRef.current.dataset.groundMinY=String(bounds.min.y+lift);
      const dimensions=visualRef.current.getObjectByName('metric-model')?.userData.metricDimensions;
      if(labelRef.current&&dimensions)labelRef.current.dataset.modelDimensions=JSON.stringify(dimensions);
    }
  },-1);

  /**

   * Name: handleClick

   * Description: Click event handler that selects this robot in the global store.

   */

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if(!selectable)return;
    selectRobot(robot.id);
    onFocus?.();
  };

  // Color mapping based on status and selection
  const baseColor = robot.type === 'humanoid' ? '#8b5cf6' : '#e5e7eb';
  const finalColor = robot.status === 'error' ? '#ef4444' : isSelected ? '#06b6d4' : baseColor;

  return (
    <group ref={groupRef} position={[robot.position[0],aboveFloor(robot.position[1]),robot.position[2]]} onClick={handleClick} name={`robot-${robot.id}`}>
      <mesh
        position={[0, robot.type === 'humanoid' ? 0.9 : robot.type === 'amr' ? 0.4 : 0.35, 0]}
      >
        <cylinderGeometry
          args={[
            robot.type === 'humanoid' ? 0.55 : robot.type === 'amr' ? 0.75 : 0.55,
            robot.type === 'humanoid' ? 0.55 : robot.type === 'amr' ? 0.75 : 0.55,
            robot.type === 'humanoid' ? 1.85 : robot.type === 'amr' ? 0.85 : 0.75,
            16,
          ]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={visualRef} name={`robot-visual-${robot.id}`}>
      <MetricModel type={robot.type}>
      {robot.type === 'humanoid' && <H1Model robotId={robot.id} selected={isSelected} enabled={robot.mode === 'simulation'} />}

      {robot.type === 'quadruped' && <Go2Model robotId={robot.id} color={isSelected ? '#4b9e78' : '#a7b8ae'} />}

      {robot.type === 'amr' && <AMRModel color={finalColor} variant={robot.amrVariant} />}
      </MetricModel>
      </group>

      

      <Html position={[0, robot.type === 'humanoid' ? (robot.position[1] > .5 ? 1.3 : 2.4) : robot.type === 'amr' ? .76 : .32, 0]} center zIndexRange={[4, 0]}>

        <div ref={labelRef} data-robot-id={robot.id} className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap bg-gray-900/60 ${isSelected ? 'text-cyan-200' : 'text-slate-300'}`}>

          {robot.id}

        </div>

      </Html>

    </group>

  );

};

