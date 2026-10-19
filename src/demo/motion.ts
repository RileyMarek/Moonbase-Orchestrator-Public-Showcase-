import type { MissionSnapshot } from '../domain/types';
import { clearanceIssue, type DemoBody } from './clearance';
import { rerouteDemoMission } from './routing';

/** ROS world metres/radians. This is a kinematic demo, not a robot controller. */
export interface DemoPose { x: number; y: number; yaw: number; speed: number }
const angle = (value: number) => Math.atan2(Math.sin(value), Math.cos(value));

export function advanceDemoMission(pose: DemoPose, mission: MissionSnapshot, dt: number, elapsed: number, speed = .75) {
  const next = { ...pose, speed: 0 };
  if (mission.state !== 'running' || !Number.isFinite(dt) || dt <= 0)
    return { pose: next, mission, elapsed, progress: 0 };
  const index = mission.steps.findIndex(step => step.state !== 'succeeded');
  if (index < 0) return { pose: next, mission: { ...mission, state: 'succeeded' }, elapsed: 0, progress: 1 };
  const command = mission.steps[index].command;
  let done = false, progress = 0;
  const seconds = elapsed + Math.min(dt, .1);
  if (command.kind === 'walk') {
    const dx = command.x! - pose.x, dy = command.y! - pose.y, distance = Math.hypot(dx, dy);
    const heading = Math.atan2(dy, dx), turn = angle(heading - pose.yaw);
    next.yaw = angle(pose.yaw + Math.sign(turn) * Math.min(Math.abs(turn), 2.5 * dt));
    // Turn before translating so a nearby target cannot produce an endless orbit.
    const travel = Math.abs(turn) < .15 ? Math.min(distance, speed * dt) : 0;
    if (distance <= travel || distance < .001) {
      next.x = command.x!; next.y = command.y!; done = true;
    } else if (travel > 0) {
      next.x += dx / distance * travel; next.y += dy / distance * travel;
    }
    next.speed = Math.hypot(next.x-pose.x, next.y-pose.y) / dt;
    progress = done ? 1 : 0;
  } else if (command.kind === 'turn') {
    const difference = angle(command.yaw! - pose.yaw);
    next.yaw = angle(pose.yaw + Math.sign(difference) * Math.min(Math.abs(difference), 2.5 * dt));
    done = Math.abs(angle(command.yaw! - next.yaw)) < .001;
  } else {
    const duration = command.kind === 'wait' ? command.seconds ?? 1 : .6;
    done = seconds >= duration; progress = Math.min(1, seconds / Math.max(duration, .001));
  }
  const steps = mission.steps.map((step, i) => i === index ? {
    ...step, state: done ? 'succeeded' : 'running',
    ...(done ? { result: { message: 'Completed in the local kinematic demo', pose: [next.x,next.y,next.yaw] } } : {}),
  } : step);
  return { pose: next, mission: { ...mission, steps, state: steps.every(s => s.state === 'succeeded') ? 'succeeded' : 'running' }, elapsed: done ? 0 : seconds, progress };
}

export function advanceCheckedMission(pose:DemoPose,mission:MissionSnapshot,dt:number,elapsed:number,body:DemoBody,fleet:DemoBody[],speed=.75) {
  const next=advanceDemoMission(pose,mission,dt,elapsed,speed);
  const blocked=mission.state==='running'?clearanceIssue(body,pose,next.pose,fleet):null;
  if(blocked){
    try{
      const rerouted=rerouteDemoMission({...body,x:pose.x,y:pose.y},mission,fleet);
      return {...next,pose:{...pose,speed:0},mission:rerouted,elapsed:0,blocked:null,rerouted:true};
    }catch{
      return {...next,pose:{...pose,speed:0},mission:{...mission,state:'held'},elapsed,blocked,rerouted:false};
    }
  }
  return {...next,blocked:null,rerouted:false};
}
