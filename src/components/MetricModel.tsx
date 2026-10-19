import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { localModelBounds, metricScale } from '../domain/modelScale';
import type { Robot } from '../store';

/** Preserve the existing models; calibrate their reference standing envelopes once. */
export function MetricModel({type,children}:{type:Robot['type'];children:ReactNode}){
  const root=useRef<Group>(null),calibrated=useRef(false);
  useFrame(()=>{
    if(!root.current||calibrated.current)return;
    const box=localModelBounds(root.current);if(box.isEmpty())return; // H1 loads asynchronously.
    const size=box.getSize(new Vector3()),scale=metricScale(type,size);
    root.current.scale.set(...scale);
    root.current.userData.metricDimensions=[size.x*scale[0],size.y*scale[1],size.z*scale[2]];
    calibrated.current=true;
  },-2.5);
  return <group ref={root} name="metric-model">{children}</group>;
}
