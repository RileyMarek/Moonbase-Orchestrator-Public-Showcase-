import type { Robot } from '../store';
export type Embodiment = 'wheeled_amr' | 'semi_humanoid' | 'quadruped' | 'humanoid';
export interface FleetUnit {robot_id:string;embodiment_type:Embodiment;namespace:string;initial_pose:number[];navigation_ready:boolean;message?:string}
export interface FleetManifest {epoch:string;fresh:boolean;robots:FleetUnit[];catalog:Record<Embodiment,{label:string;asset:string|null;controller:string|null}>}
export interface SceneEnvironment {id:string;epoch:string;revision:string;frame:string;bounds:number[];localization:string;obstacles:{id:string;center:number[];size:number[]}[];landmarks:Record<string,{pose:number[];evidence:string}>}
export interface FleetManifest {environment?:SceneEnvironment;environment_fresh?:boolean}
export function fleetRobots(manifest:FleetManifest, previous:Robot[]):Robot[] {
  if (!manifest || !Array.isArray(manifest.robots) || manifest.robots.length>16) throw new Error('Invalid fleet manifest');
  const physical=previous.filter(r=>r.mode==='physical');
  const ids=new Set<string>();
  const units=manifest.robots.map(unit=>{
    if(!/^[A-Za-z][A-Za-z0-9_]{0,47}$/.test(unit.robot_id)||!['wheeled_amr','semi_humanoid','quadruped','humanoid'].includes(unit.embodiment_type)||unit.initial_pose.length!==3||unit.initial_pose.some(n=>!Number.isFinite(n)))throw new Error('Invalid fleet unit');
    const id=unit.robot_id.replace(/^bot_/,'bot-');if(ids.has(id))throw new Error('Duplicate fleet ID');ids.add(id);
    const old=previous.find(r=>r.id===id&&r.mode==='simulation');
    return {...old,id,type:unit.embodiment_type==='wheeled_amr'||unit.embodiment_type==='semi_humanoid'?'amr':unit.embodiment_type,amrVariant:unit.embodiment_type==='semi_humanoid'?'arm':'flat',mode:'simulation',position:old?.position||[unit.initial_pose[1],0,unit.initial_pose[0]],battery:old?.battery||0,temperature:old?.temperature||0,status:manifest.fresh?'idle':'offline',assignedTasks:[unit.message||'Discovered in Isaac Sim']} as Robot;
  });
  return [...physical,...units];
}
