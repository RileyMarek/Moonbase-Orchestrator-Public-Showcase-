import { Component, Suspense, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { Quaternion, SkinnedMesh } from 'three';
import { applyH1Pose, bindH1Rig } from '../telemetry/h1Rig';
import { getJointFrame, getJointFreshness, getPoseFrame, getPoseFreshness } from '../telemetry/jointStream';

function resolveModelUrl(relativePath: string): string {
  if (typeof window === 'undefined') return relativePath;
  const base = import.meta.env.BASE_URL || './';
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return new URL(relativePath, base.endsWith('/') ? base : base + '/').href;
  }
  const docBase = document.baseURI || window.location.href;
  const path = docBase.split('?')[0].split('#')[0];
  const dir = path.endsWith('/') ? path : path.substring(0, path.lastIndexOf('/') + 1);
  return new URL(relativePath.replace(/^\.?\//, ''), dir).href;
}

export const H1_MODEL_PATH = resolveModelUrl('models/h1/h1.glb');
useGLTF.preload(H1_MODEL_PATH);

function RiggedH1({ robotId, selected, enabled }: { robotId:string; selected:boolean; enabled:boolean }) {
  const { scene } = useGLTF(H1_MODEL_PATH);
  const model = useMemo(()=>{
    const result=clone(scene);
    result.traverse(node=>{if(node instanceof SkinnedMesh){node.frustumCulled=false;node.castShadow=true;node.receiveShadow=true;}});
    return result;
  },[scene]);
  const root = useMemo(()=>model.getObjectByName('Unitree_H1') || model,[model]);
  const neutralHeight = useMemo(()=>root.position?.y ?? 0,[root]);
  const hasWorld = useRef(false);
  const rig=useMemo(()=>bindH1Rig(model),[model]);
  const lastSequence=useRef(-1);
  const lastUi=useRef(0);
  const elbowRotation=useRef(new Quaternion());
  const applied=useRef({matched:0,valid:false,unknown:0,stamp:0});
  const [diagnostic,setDiagnostic]=useState({state:'waiting',matched:0,unknown:0,stamp:0,elbow:0,world:'waiting',xyz:'—',worldPlaced:false});
  useFrame(()=>{
    const now=performance.now();
    const pose=enabled?getPoseFrame(robotId):undefined;
    if(pose) hasWorld.current=true;
    root.position.setY(neutralHeight);
    const frame=enabled?getJointFrame(robotId):undefined;
    if(frame && frame.sequence !== lastSequence.current){
      const result=applyH1Pose(rig,frame.joints);
      applied.current={matched:result.matched,valid:result.applied,unknown:result.unknown.length,stamp:frame.stamp};
      lastSequence.current=frame.sequence;
    }
    if(now-lastUi.current>250){
      lastUi.current=now;
      const freshness=enabled?getJointFreshness(robotId,now):'disabled';
      const state=freshness==='live'&&!applied.current.valid?'incomplete':freshness;
      const binding=rig.get('left_elbow_joint')!;
      const rotation=elbowRotation.current.copy(binding.rest).invert().multiply(binding.bone.quaternion);
      const elbow=2*Math.atan2(rotation.x*binding.axis.x+rotation.y*binding.axis.y+rotation.z*binding.axis.z,rotation.w);
      const world=enabled?getPoseFreshness(robotId,now):'disabled';
      const xyz=pose?pose.position.map(v=>v.toFixed(2)).join(' / '):'—';
      setDiagnostic(previous=>previous.worldPlaced===hasWorld.current&&previous.world===world&&previous.xyz===xyz&&previous.state===state&&previous.matched===applied.current.matched&&previous.unknown===applied.current.unknown&&previous.stamp===applied.current.stamp?previous:{state,matched:applied.current.matched,unknown:applied.current.unknown,stamp:applied.current.stamp,elbow,world,xyz,worldPlaced:hasWorld.current});
    }
  }, -2);
  return <>
    <primitive object={model} dispose={null}/>
    {selected&&<Html position={[0,diagnostic.worldPlaced?1.05:2.08,0]} center zIndexRange={[5,0]}>
      <div className="h1-pose-status" data-testid="h1-pose-status" data-world-state={diagnostic.world} data-world-xyz={diagnostic.xyz} data-state={diagnostic.state} data-matched={diagnostic.matched} data-stamp={diagnostic.stamp} data-left-elbow-rad={diagnostic.elbow}>
        <strong>UNITREE H1 / {diagnostic.state.toUpperCase()}</strong>
        <span>{diagnostic.matched}/19 JOINTS · WORLD {diagnostic.world.toUpperCase()}{diagnostic.unknown>0?` · ${diagnostic.unknown} UNMAPPED`:''}</span>
        <span>ROS XYZ / {diagnostic.xyz} M</span>
        {diagnostic.matched===19&&<span>L ELBOW / {diagnostic.elbow.toFixed(3)} RAD</span>}
      </div>
    </Html>}
  </>;
}

class ModelBoundary extends Component<{children:ReactNode},{error:string|null}> {
  state:{error:string|null}={error:null};
  static getDerivedStateFromError(error:Error){return {error:error.message};}
  render(){return this.state.error?<Html position={[0,1.5,0]} center><div className="h1-model-error" role="alert">H1 MODEL UNAVAILABLE<small>{this.state.error}</small><button onClick={()=>{useGLTF.clear(H1_MODEL_PATH);this.setState({error:null});}}>Retry model</button></div></Html>:this.props.children;}
}

export function H1Model(props:{robotId:string;selected:boolean;enabled:boolean}) {
  return <ModelBoundary><Suspense fallback={<Html position={[0,1.5,0]} center><div className="h1-pose-status">LOADING UNITREE H1…</div></Html>}><RiggedH1 {...props}/></Suspense></ModelBoundary>;
}
