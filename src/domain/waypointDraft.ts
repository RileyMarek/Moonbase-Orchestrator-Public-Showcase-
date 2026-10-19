import type { MissionSnapshot, MissionStep } from './types';

export function appendDraftWaypoint(steps:MissionStep[],x:number,y:number):MissionStep[] {
  if(![x,y].every(Number.isFinite)||steps.length>=30)return steps;
  const last=steps.at(-1);
  if(last?.kind==='walk'&&Math.hypot(last.x!-x,last.y!-y)<.02)return steps;
  return [...steps,{kind:'walk',x:Number(x.toFixed(2)),y:Number(y.toFixed(2)),tolerance:.1,timeout_sec:180,global_route:true}];
}
export function pendingWaypoints(draft:MissionStep[],mission:MissionSnapshot|undefined,running:boolean) {
  return running&&mission?mission.steps.filter(s=>s.state!=='succeeded').map(s=>s.command):draft;
}
