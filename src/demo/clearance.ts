import type { Robot } from '../store';
import type { MissionStep } from '../domain/types';
import type { DemoPose } from './motion';
import { OBSTACLES } from '../telemetry/demoMockStream';

// Conservative circles cover the presentation models, including Carter's rear overhang.
export const BODY_RADIUS: Record<Robot['type'], number> = { humanoid: .6, quadruped: .5, amr: .65 };
export const CLEARANCE = .1;
import { DEMO_BOUNDS } from './environment';
export { DEMO_BOUNDS } from './environment';
export interface DemoBody { id: string; type: Robot['type']; x: number; y: number }
type Point = Pick<DemoPose, 'x'|'y'>;

export function segmentDistance(point: Point, from: Point, to: Point) {
  const dx=to.x-from.x,dy=to.y-from.y,length=dx*dx+dy*dy;
  const t=length ? Math.max(0,Math.min(1,((point.x-from.x)*dx+(point.y-from.y)*dy)/length)) : 0;
  return Math.hypot(point.x-from.x-t*dx,point.y-from.y-t*dy);
}

// Slab intersection against an inflated obstacle. Conservative at box corners.
function crossesBox(from: Point,to: Point,bounds: readonly number[]) {
  let enter=0,exit=1;
  for(const [start,end,min,max] of [[from.x,to.x,bounds[0],bounds[2]],[from.y,to.y,bounds[1],bounds[3]]]) {
    const delta=end-start;
    if(Math.abs(delta)<1e-12) { if(start<min||start>max)return false; }
    else { const a=(min-start)/delta,b=(max-start)/delta;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b)); }
    if(enter>exit)return false;
  }
  return true;
}

/** Checks the complete swept footprint, not only the next frame or endpoint. */
export function clearanceIssue(body: DemoBody, from: Point, to: Point, fleet: DemoBody[]): string|null {
  if(![from.x,from.y,to.x,to.y].every(Number.isFinite)) return 'Use a finite world X and Y.';
  const padding=BODY_RADIUS[body.type]+CLEARANCE;
  if([from,to].some(p=>p.x<DEMO_BOUNDS[0]+padding||p.y<DEMO_BOUNDS[1]+padding||p.x>DEMO_BOUNDS[2]-padding||p.y>DEMO_BOUNDS[3]-padding))
    return 'The robot footprint would leave the scene boundary.';
  for(const other of fleet) {
    if(other.id===body.id)continue;
    if(segmentDistance(other,from,to)<=BODY_RADIUS[body.type]+BODY_RADIUS[other.type]+CLEARANCE)
      return `Too close to ${other.id}. Leave room for both robots and ${CLEARANCE.toFixed(2)} m clearance.`;
  }
  for(const box of OBSTACLES) {
    const [x,y]=box.center,[sx,sy]=box.size;
    if(crossesBox(from,to,[x-sx/2-padding,y-sy/2-padding,x+sx/2+padding,y+sy/2+padding]))
      return `The robot footprint would intersect the ${box.id} obstacle.`;
  }
  return null;
}

export function routeIssue(body: DemoBody, steps: MissionStep[], fleet: DemoBody[]): string|null {
  let from:Point=body;
  for(const [index,step] of steps.entries()) {
    if(step.kind!=='walk')continue;
    const to={x:step.x!,y:step.y!};
    const issue=clearanceIssue(body,from,to,fleet);
    if(issue)return `Waypoint ${index+1} blocked: ${issue} Choose another waypoint or move/delete the blocking bot.`;
    from=to;
  }
  return null;
}
