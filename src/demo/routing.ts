import type { MissionSnapshot, MissionStep } from '../domain/types';
import { clearanceIssue, DEMO_BOUNDS, type DemoBody } from './clearance';

type Point={x:number;y:number};
const GRID=.25;

/** Small local A* search. Every edge and smoothing shortcut uses swept clearance. */
export function findDemoPath(body:DemoBody,from:Point,to:Point,fleet:DemoBody[]):Point[] {
  const clear=(a:Point,b:Point)=>!clearanceIssue(body,a,b,fleet);
  const invalid=clearanceIssue(body,to,to,fleet)||clearanceIssue(body,from,from,fleet);
  if(invalid)throw new Error(`No safe route: ${invalid}`);
  if(clear(from,to))return [{...to}];
  const [xmin,ymin,xmax,ymax]=DEMO_BOUNDS;
  const width=Math.round((xmax-xmin)/GRID)+1,height=Math.round((ymax-ymin)/GRID)+1;
  const point=(id:number):Point=>({x:xmin+(id%width)*GRID,y:ymin+Math.floor(id/width)*GRID});
  const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
  const costs=new Map<number,number>(),parents=new Map<number,number>(),closed=new Set<number>();
  const heap:{id:number;g:number;f:number}[]=[];
  function push(id:number,g:number){
    const value={id,g,f:g+distance(point(id),to)};let i=heap.length;heap.push(value);
    while(i>0){const parent=(i-1)>>1;if(heap[parent].f<=value.f)break;heap[i]=heap[parent];i=parent;}heap[i]=value;
  }
  function pop(){
    const first=heap[0],last=heap.pop()!;
    if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(heap[child].f>=last.f)break;heap[i]=heap[child];i=child;}heap[i]=last;}
    return first;
  }
  // Connect the exact start to nearby grid nodes without snapping through a wall.
  const sx=Math.round((from.x-xmin)/GRID),sy=Math.round((from.y-ymin)/GRID);
  for(let y=sy-2;y<=sy+2;y++)for(let x=sx-2;x<=sx+2;x++){
    if(x<0||x>=width||y<0||y>=height)continue;
    const id=y*width+x,p=point(id);if(!clear(from,p))continue;
    const g=distance(from,p);costs.set(id,g);parents.set(id,-1);push(id,g);
  }
  while(heap.length){
    const current=pop();if(closed.has(current.id)||current.g!==costs.get(current.id))continue;
    closed.add(current.id);const here=point(current.id);
    if(clear(here,to)){
      const route:Point[]=[{...to}];let id=current.id;
      while(id!==-1){route.unshift(point(id));id=parents.get(id)!;}
      // Remove grid stair steps while retaining exact, checked segments.
      const smooth:Point[]=[];let origin=from,index=0;
      while(index<route.length){let end=route.length-1;while(end>index&&!clear(origin,route[end]))end--;smooth.push(route[end]);origin=route[end];index=end+1;}
      return smooth;
    }
    const x=current.id%width,y=Math.floor(current.id/width);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;
      if(nx<0||nx>=width||ny<0||ny>=height)continue;
      const id=ny*width+nx;if(closed.has(id))continue;const next=point(id);
      const g=current.g+distance(here,next);if(g>=(costs.get(id)??Infinity)||!clear(here,next))continue;
      costs.set(id,g);parents.set(id,current.id);push(id,g);
    }
  }
  throw new Error('No safe route through the available space. Move the blocking bot or choose another destination.');
}

/** Preserve requested destinations, arrival headings, waits and inspection order. */
export function routeDemoSteps(body:DemoBody,steps:MissionStep[],fleet:DemoBody[]):MissionStep[] {
  let from:Point=body;const result:MissionStep[]=[];
  for(const step of steps.filter(s=>!s.demo_detour)){
    if(step.kind!=='walk'){result.push({...step});continue;}
    const path=findDemoPath(body,from,{x:step.x!,y:step.y!},fleet);
    path.forEach((target,index)=>result.push({...step,...target,tolerance:.05,global_route:true,demo_detour:index<path.length-1}));
    from=path.at(-1)!;
    if(result.length>256)throw new Error('Route is too complex for the browser demo. Use fewer destinations.');
  }
  return result;
}

export function rerouteDemoMission(body:DemoBody,mission:MissionSnapshot,fleet:DemoBody[]):MissionSnapshot {
  const completed=mission.steps.filter(s=>s.state==='succeeded');
  const pending=mission.steps.filter(s=>s.state!=='succeeded').map(s=>s.command);
  return {...mission,state:'running',steps:[...completed,...routeDemoSteps(body,pending,fleet).map(command=>({command,state:'pending'}))]};
}
