import { RobotGrounding } from "./RobotGrounding";

import { SpatialFloor } from "./SpatialFloor";

import { SpatialOverlay } from "./SpatialOverlay";

import { NavigationOverlay } from "./NavigationOverlay";

import { SceneGeometry } from "./SceneGeometry";

import type { ControlSnapshot } from "../hooks/useRobotControl";

import { ObstacleCourse } from "./ObstacleCourse";

import type { Course } from "./MissionControl";

/**

 * Author: Riley Marek

 * Project: Project Moonbase

 * File: Viewport3D.tsx

 * Description: Main 3D WebGL viewport rendering the environment and robot fleet. Adheres to strict physical/simulation mode constraints.

 * Date: 2026-09-08

 */



import React, { useRef, useEffect, useState } from 'react';



import { Canvas, useFrame, useThree } from '@react-three/fiber';

import { OrbitControls, Grid, OrthographicCamera, PerspectiveCamera, Line, Html } from '@react-three/drei';

import type { MissionStep } from './MissionControl';

import { Vector3, DoubleSide } from 'three';

import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';



import { useAppStore } from '../store';

import { getPoseFrame } from '../telemetry/jointStream';

import { worldPoseToThree } from '../telemetry/worldPose';

import { RenderGuard } from './RenderGuard';

import { RobotModel } from './RobotModel';

import { LunarHut, Rocket, FactoryShelf, ConveyorBelt } from './EnvironmentModels';



function ContextLossObserver(){

  const gl=useThree(s=>s.gl);

  useEffect(()=>{

    const canvas=gl.domElement;

    const lost=()=>window.dispatchEvent(new Event('astro-context-lost'));

    canvas.addEventListener('webglcontextlost',lost);

    return()=>canvas.removeEventListener('webglcontextlost',lost);

  },[gl]);

  return null;

}



/**

 * Name: CameraController

 * Description: Sub-component responsible for interpolating the camera position toward the currently selected robot.

 */

function robotFocusOffset(robotId: string | null) {

  return useAppStore.getState().robots.find(r => r.id === robotId)?.type === 'quadruped'

    ? new Vector3(1.1, .6, 1.4) : new Vector3(2.8, 1.3, 3.6);

}



const CameraController = ({overview=false,overviewPanel=false}:{overview?:boolean;overviewPanel?:boolean}) => {

  const controlsRef = useRef<OrbitControlsImpl>(null);

  const selectedRobotId = useAppStore(state => state.selectedRobotId);

  const planView = useAppStore(state => state.viewMode === 'plan' && state.uiTheme === 'operator');

  const { camera, gl } = useThree();

  const targetPos = useRef(new Vector3(0, 0, 0));

  const cameraGoal = useRef(new Vector3(20, 15, 20));

  const tracked = useRef(new Vector3());

  const tracking = useRef(false);

  const focusTransition = useRef(false);

  useEffect(() => {

    const robot = useAppStore.getState().robots.find(r => r.id === selectedRobotId);

    if (robot) {

      targetPos.current.set(robot.position[0], robot.position[1] + (robot.type === 'humanoid' ? 1 : .7), robot.position[2]);

      cameraGoal.current.copy(targetPos.current).add(planView ? new Vector3(0,30,0) : robotFocusOffset(selectedRobotId));

    } else {

      targetPos.current.set(0, 0, 0);

      cameraGoal.current.set(planView?0:20,planView?30:15,planView?0:20);

    }

    if(overview){

      const units=useAppStore.getState().robots.filter(r=>r.mode===useAppStore.getState().appMode);

      const points=units.map(r=>{const p=getPoseFrame(r.id);return p?worldPoseToThree(p).position:r.position;});

      if(points.length){

        const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]);

        targetPos.current.set((Math.min(...xs)+Math.max(...xs))/2,-.8,(Math.min(...zs)+Math.max(...zs))/2);

        const span=Math.max(8,Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs));

        if(overviewPanel)targetPos.current.add(new Vector3(-.765*span*.34,0,.644*span*.34));
        cameraGoal.current.copy(targetPos.current).add(new Vector3(span*.75,span*1.2,span*.9));

      }

    }

    tracking.current = false;

    focusTransition.current = true;

  }, [selectedRobotId,planView,camera,overview,overviewPanel]);

  useFrame((_,delta) => {

    if (!controlsRef.current) return;

    const pose=!overview&&selectedRobotId?getPoseFrame(selectedRobotId):undefined;

    if(pose){

      const world=worldPoseToThree(pose);

      const next=new Vector3(...world.position).add(new Vector3(0,.15,0));

      if(!tracking.current){

        if(focusTransition.current) cameraGoal.current.copy(next).add(planView ? new Vector3(0,30,0) : robotFocusOffset(selectedRobotId));

        else {

          camera.position.add(next.clone().sub(controlsRef.current.target));

          controlsRef.current.target.copy(next);

        }

      } else {

        const movement=next.clone().sub(tracked.current);

        camera.position.add(movement);

        controlsRef.current.target.add(movement);

        cameraGoal.current.add(movement);

      }

      tracked.current.copy(next);

      tracking.current=true;

      targetPos.current.copy(next);

    }

    if (!focusTransition.current) { controlsRef.current.update(); return; }

    const alpha = 1 - Math.exp(-delta * 7);

    controlsRef.current.target.lerp(targetPos.current, alpha);

    camera.position.lerp(cameraGoal.current, alpha);

    controlsRef.current.update();

    if (camera.position.distanceTo(cameraGoal.current) < .01) focusTransition.current = false;

  });



  useEffect(() => {
    const level = () => planView
      ? 100 * Math.log(camera.zoom / 5) / Math.log(30)
      : 100 * (1 - Math.log(Math.max(1, camera.position.distanceTo(controlsRef.current?.target || targetPos.current))) / Math.log(35));
    const publish = () => window.dispatchEvent(new CustomEvent('moonbase-zoom-changed', {detail: Math.max(0, Math.min(100, level()))}));
    const apply = (value: number) => {
      const controls = controlsRef.current;
      if (!controls || !Number.isFinite(value)) return;
      focusTransition.current = false;
      const fraction = Math.max(0, Math.min(100, value)) / 100;
      if (planView) {
        camera.zoom = 5 * Math.pow(30, fraction);
        camera.updateProjectionMatrix();
      } else {
        const direction = camera.position.clone().sub(controls.target);
        if (direction.lengthSq() < .0001) direction.set(1, 1, 1);
        camera.position.copy(controls.target).add(direction.normalize().multiplyScalar(Math.pow(35, 1 - fraction)));
      }
      controls.update();
      publish();
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 200 : 1);
      apply(level() - Math.max(-3, Math.min(3, pixels * .035)));
    };
    const request = (event: Event) => apply((event as CustomEvent<number>).detail);
    gl.domElement.addEventListener('wheel', wheel, {passive: false});
    window.addEventListener('moonbase-zoom-request', request);
    const controls = controlsRef.current;
    controls?.addEventListener('change', publish);
    publish();
    return () => {
      gl.domElement.removeEventListener('wheel', wheel);
      window.removeEventListener('moonbase-zoom-request', request);
      controls?.removeEventListener('change', publish);
    };
  }, [camera, gl, planView]);
  return <OrbitControls key={planView?'plan':'perspective'} ref={controlsRef} enableRotate={!planView} enableZoom={false} enableDamping={false} minZoom={5} maxZoom={150} onStart={() => { focusTransition.current = false; }} makeDefault minDistance={1} maxDistance={35} />;

};



/**

 * Name: OperationBoundary

 * Description: Visualizes the 50x50 operation space.

 */

const OperationBoundary = () => (

  <mesh position={[0, 12.5, 0]}>

    <boxGeometry args={[50, 25, 50]} />

    <meshBasicMaterial color="#06b6d4" wireframe transparent opacity={0.15} side={DoubleSide} />

  </mesh>

);



/**

 * Name: Viewport3D

 * Description: Main 3D WebGL viewport rendering the environment and robot fleet. Adheres to strict physical/simulation mode constraints.

 */

export const Viewport3D: React.FC<{course?: Course | null;presentation?:'astro'|'operator';steps?:MissionStep[];spatial?:ControlSnapshot|null;selectionEnabled?:boolean;overviewPanel?:boolean;onRobotFocus?:()=>void;overview?:boolean;showPerception?:boolean;showVoxels?:boolean;drafting?:boolean;onDraft?:(x:number,y:number)=>void;locations?:{name:string;pose:number[]}[]}> = ({course,presentation='astro',steps=[],spatial,onRobotFocus,selectionEnabled=true,overviewPanel=false,overview=false,showPerception=true,showVoxels=true,drafting=false,onDraft,locations=[]}) => {

  const viewportRef = useRef<HTMLDivElement>(null);

  const [rendering, setRendering] = useState(true);

  useEffect(() => {

    const element = viewportRef.current;

    if (!element) return;

    let intersects = true;

    const refresh = () => setRendering(intersects && document.visibilityState === 'visible');

    const observer = new IntersectionObserver(entries => {

      intersects = entries[0]?.isIntersecting ?? false;

      refresh();

    });

    observer.observe(element);

    document.addEventListener('visibilitychange', refresh);

    return () => {

      observer.disconnect();

      document.removeEventListener('visibilitychange', refresh);

    };

  }, []);

  const robots = useAppStore(state => state.robots);

  const appMode = useAppStore(state => state.appMode);

  const environment = useAppStore(state => state.environment);

  const planView=useAppStore(state=>state.viewMode==='plan'&&state.uiTheme==='operator');

  const draftedPoints=steps.filter(step=>step.kind==='walk'&&Number.isFinite(step.x)&&Number.isFinite(step.y)).map(step=>[step.y!,0.03,step.x!] as [number,number,number]);



  const selectedRobotId=useAppStore(s=>s.selectedRobotId);

  const origin=spatial?.pose ? [spatial.pose[1],.03,spatial.pose[0]] as [number,number,number] : selectedRobotId && getPoseFrame(selectedRobotId) ? worldPoseToThree(getPoseFrame(selectedRobotId)!).position : null;

  const waypoints=origin&&draftedPoints.length?[origin,...draftedPoints]:draftedPoints;

  const colorMode=useAppStore(s=>s.colorMode);

  const activeRobots = robots.filter(r => r.mode === appMode);



  return (

    <div ref={viewportRef} className="robot-viewport" data-rendering={rendering}><RenderGuard>

      <Canvas frameloop={rendering ? 'always' : 'never'} dpr={[1,1.5]} gl={{antialias:true,powerPreference:"high-performance"}} camera={{ position: [2.8, 2.3, 3.6], fov: 45 }} >

        <ContextLossObserver/>

        {presentation==='operator'&&<><color attach="background" args={[colorMode==='light'?'#dce3e8':'#111318']}/><fog attach="fog" args={[colorMode==='light'?'#dce3e8':'#111318',planView?80:8,planView?150:28]}/></>}

        {drafting && onDraft && <mesh rotation={[-Math.PI/2,0,0]} position={[0,.012,0]} onClick={event=>{event.stopPropagation();const b=spatial?.fleet?.environment?.bounds || [-6,-6,6,6];if(event.point.z>=b[0]&&event.point.x>=b[1]&&event.point.z<=b[2]&&event.point.x<=b[3])onDraft(event.point.z,event.point.x)}}><planeGeometry args={[200,200]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>}

        {planView?<OrthographicCamera makeDefault position={[0,30,0]} up={[0,0,-1]} zoom={80} near={0.01} far={150}/>:<PerspectiveCamera makeDefault position={[2.8,2.3,3.6]} fov={45}/>}

        

        {course ? <><ambientLight intensity={.8}/><directionalLight position={[3,6,4]} intensity={2}/><Grid infiniteGrid fadeDistance={30}/><ObstacleCourse course={course}/></> : presentation==='operator' ? <><ambientLight intensity={1}/><directionalLight position={[3,6,4]} intensity={2}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.01,0]}><planeGeometry args={[100,100]}/><meshStandardMaterial color={colorMode==='light'?'#dce3e8':'#111318'} roughness={.9}/></mesh></> : environment === 'lunar' ? (

          <>

            <ambientLight intensity={0.8} />

            <directionalLight position={[-4, 6, -5]} intensity={1.5} color="#d4e5ff" />

            <directionalLight position={[20, 15, 10]} intensity={2.5} castShadow />

            {/* Lunar Surface */}

            {appMode === 'simulation' && (

              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>

                <planeGeometry args={[100, 100, 64, 64]} />

                <meshStandardMaterial color="#666666" roughness={0.9} />

              </mesh>

            )}

            {appMode === 'simulation' && <LunarHut position={[-12, 0, 15]} />}

            {appMode === 'simulation' && <Rocket position={[18, 0, 15]} />}

          </>

        ) : (

          <>

            <ambientLight intensity={0.8} />

            <directionalLight position={[0, 20, 0]} intensity={1} />

            {/* Factory Floor */}

            {appMode === 'simulation' && (

              <Grid infiniteGrid fadeDistance={80} sectionColor="#444" cellColor="#222" />

            )}

            {appMode === 'simulation' && <FactoryShelf position={[-15, 0, -10]} />}

            {appMode === 'simulation' && <ConveyorBelt position={[10, 0, -10]} />}

          </>

        )}



        {appMode === 'simulation' && presentation==='astro' && <OperationBoundary />}

        {presentation==='operator'&&<SpatialFloor light={colorMode==='light'}/>}

        {presentation==='operator'&&locations.map(location=><group key={location.name} position={[location.pose[1],.025,location.pose[0]]}><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.075,.095,32]}/><meshBasicMaterial color="#69d7b1"/></mesh><Html position={[0,.25,0]} center style={{pointerEvents:'none'}}><span className="hud-location-pin">{location.name}</span></Html></group>)}
        {presentation==='operator'&&waypoints.length>1&&<Line points={waypoints} color="#38bdf8" lineWidth={2} dashed dashSize={0.12} gapSize={0.08}/>}

        {presentation==='operator'&&waypoints.map((point,i)=><mesh key={i} position={point} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.055,0.08,24]}/><meshBasicMaterial color="#38bdf8"/></mesh>)}

        

        {presentation==='operator'&&appMode==='simulation'&&spatial&&<><SpatialOverlay speed={spatial.speed_m_s || 0} showPerception={showPerception} showVoxels={showVoxels} key={spatial.robotId} robotId={spatial.robotId} proof={spatial.waypoint_demo} status={spatial.motion.state} camera={spatial.perception?.ready?spatial.perception.camera:null} points={[]}/><NavigationOverlay snapshot={spatial}/></>}

        {presentation==='operator'&&appMode==='simulation'&&spatial&&<SceneGeometry snapshot={spatial} showObstacles={showVoxels}/>}

        <CameraController overview={overview} overviewPanel={overviewPanel}/>

        

        {/* Render Fleet */}

        {activeRobots.map((robot) => (

          <React.Fragment key={robot.id}>{presentation==='operator'&&<RobotGrounding robotId={robot.id}/>}<RobotModel robot={robot} selectable={selectionEnabled} onFocus={onRobotFocus}/></React.Fragment>

        ))}

      </Canvas></RenderGuard>

    </div>

  );

};



