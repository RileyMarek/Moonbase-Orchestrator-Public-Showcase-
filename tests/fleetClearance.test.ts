import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { BODY_RADIUS, CLEARANCE, clearanceIssue, routeIssue, type DemoBody } from '../src/demo/clearance';
import { advanceCheckedMission } from '../src/demo/motion';
import { demoAction } from '../src/demo/actions';
import { useDemoState } from '../src/demo/state';
import { useAppStore, type Robot } from '../src/store';
import { getPoseFrame, publishPoseFrame, removeRobotFrames } from '../src/telemetry/jointStream';
import { voxelStream, clearVoxelStreams } from '../src/telemetry/voxelStream';
import { demoVoxelSnapshot } from '../src/telemetry/demoMockStream';
import type { MissionSnapshot } from '../src/domain/types';

const robot=(id:string,type:Robot['type'],x:number,y:number):Robot=>({id,type,position:[y,0,x],mode:'simulation',battery:100,temperature:30,status:'idle',assignedTasks:[]});
const alpha:DemoBody={id:'alpha',type:'humanoid',x:-1,y:-2};
const bravo:DemoBody={id:'bravo',type:'amr',x:2,y:-2};
beforeEach(()=>{
  useAppStore.setState({robots:[robot('alpha','humanoid',-1,-2),robot('bravo','amr',2,-2)],selectedRobotId:'alpha'});
  useDemoState.setState({paused:true,mission:undefined,motion:{},blocked:null,generations:{},generationCounter:0,plan:null});
  for(const id of ['alpha','bravo','newbot'])removeRobotFrames(id);
  clearVoxelStreams();
});

test('swept footprints reject a robot between two otherwise clear endpoints',()=>{
  const target={x:3.6,y:-2};
  assert.equal(clearanceIssue(alpha,alpha,alpha,[alpha,bravo]),null);
  assert.equal(clearanceIssue(alpha,target,target,[alpha,bravo]),null);
  assert.match(clearanceIssue(alpha,alpha,target,[alpha,bravo])!,/bravo/);
});
test('body size, clearance, self exclusion, finite coordinates, and scene bounds are enforced',()=>{
  const a={...alpha,x:0},b={...bravo,x:1.34};
  assert.match(clearanceIssue(a,a,a,[a,b])!,/bravo/);
  assert.equal(clearanceIssue(a,a,a,[a,{...b,type:'humanoid'}]),null);
  assert.equal(clearanceIssue(a,a,a,[a]),null);
  assert.match(clearanceIssue(a,a,{x:NaN,y:0},[])!,/finite/);
  assert.match(clearanceIssue(a,a,{x:4.5,y:0},[])!,/boundary/);
  assert.equal(BODY_RADIUS.amr>BODY_RADIUS.humanoid,true);assert.ok(CLEARANCE>0);
});
test('clear endpoints do not permit a route through an obstacle',()=>{
  const start={...alpha,x:0,y:0},end={x:0,y:2.5};
  assert.equal(clearanceIssue(start,start,start,[]),null);
  assert.equal(clearanceIssue(start,end,end,[]),null);
  assert.match(clearanceIssue(start,start,end,[])!,/divider/);
  assert.match(routeIssue(start,[{kind:'walk',...end}],[])!,/Waypoint 1 blocked/);
});
test('a robot inserted during motion holds the mission before footprints touch',()=>{
  let pose={x:-1,y:-2,yaw:0,speed:0},elapsed=0;
  let mission:MissionSnapshot={id:'dynamic',state:'running',steps:[{command:{kind:'walk',x:1,y:-2},state:'pending'}]};
  const obstacle={...bravo,x:.5};let blocked:string|null=null;
  for(let i=0;i<100&&!blocked;i++){
    const next=advanceCheckedMission(pose,mission,.1,elapsed,{...alpha,...pose},[{...alpha,...pose},obstacle]);
    pose=next.pose;mission=next.mission;elapsed=next.elapsed;blocked=next.blocked;
  }
  assert.match(blocked!,/bravo/);assert.equal(mission.state,'held');assert.equal(pose.speed,0);
  assert.ok(Math.hypot(pose.x-obstacle.x,pose.y-obstacle.y)>BODY_RADIUS.humanoid+BODY_RADIUS.amr+CLEARANCE);
});
test('spawn rejection names the blocking robot and leaves the fleet unchanged',async()=>{
  await assert.rejects(demoAction('/fleet/spawn',{robot_id:'newbot',embodiment_type:'quadruped',initial_pose:{x:-1,y:-2,yaw:0}}),/Spawn bot in a valid location:.*alpha/);
  assert.equal(useAppStore.getState().robots.length,2);
  await assert.rejects(demoAction('/fleet/spawn',{robot_id:'newbot',embodiment_type:'quadruped',initial_pose:{x:.5,y:1.3,yaw:0}}),/obstacle/);
  await assert.rejects(demoAction('/fleet/spawn',{robot_id:'newbot',embodiment_type:'humanoid',initial_pose:{x:20,y:0,yaw:0}}),/boundary/);
});
test('a valid spawn records pose, heading, and a fresh entity generation',async()=>{
  await demoAction('/fleet/spawn',{robot_id:'newbot',embodiment_type:'quadruped',initial_pose:{x:0,y:0,yaw:.7}});
  assert.equal(useAppStore.getState().robots.length,3);
  assert.deepEqual(useDemoState.getState().motion.newbot,{x:0,y:0,yaw:.7,speed:0});
  assert.equal(useDemoState.getState().generations.newbot,1);
});
test('prototype-key IDs cannot corrupt the motion and generation maps',async()=>{
  await assert.rejects(demoAction('/fleet/spawn',{robot_id:'constructor',embodiment_type:'quadruped',initial_pose:{x:0,y:0,yaw:0}}),/unique demo ID/);
  assert.equal(useAppStore.getState().robots.length,2);
});
test('dispatch checks the whole route and does not create a blocked mission',async()=>{
  await assert.rejects(demoAction('/mission',{steps:[{kind:'walk',x:3.6,y:-2}]}),/bravo/);
  assert.equal(useDemoState.getState().mission,undefined);
  await demoAction('/mission',{steps:[{kind:'walk',x:0,y:-2}]});
  assert.equal(useDemoState.getState().mission?.state,'running');
});
test('deleting a mission owner cancels it, selects a remaining bot, and clears telemetry',async()=>{
  await demoAction('/mission',{steps:[{kind:'walk',x:0,y:-2}]});
  publishPoseFrame({robotId:'alpha',position:[-1,-2,0],orientation:[0,0,0,1],stamp:0});
  voxelStream('alpha').accept(demoVoxelSnapshot());
  useDemoState.setState({motion:{alpha:{x:-1,y:-2,yaw:0,speed:0}}});
  await demoAction('/fleet/delete',{robot_id:'alpha'});
  assert.equal(useDemoState.getState().mission?.state,'canceled');
  assert.equal(useAppStore.getState().selectedRobotId,'bravo');
  assert.equal(getPoseFrame('alpha'),undefined);assert.equal(voxelStream('alpha').synchronized,false);
  assert.equal(useDemoState.getState().motion.alpha,undefined);
});
test('delete another robot preserves a held mission and resume rechecks clearance',async()=>{
  const mission:MissionSnapshot={id:'held',state:'held',steps:[{command:{kind:'walk',x:3.6,y:-2},state:'running'}]};
  useDemoState.setState({mission,missionRobotId:'alpha',paused:true,blocked:{robotId:'alpha',message:'bravo blocks route'}});
  await assert.rejects(demoAction('/mission/resume'),/bravo/);
  assert.equal(useDemoState.getState().paused,true);
  await demoAction('/fleet/delete',{robot_id:'bravo'});
  assert.equal(useDemoState.getState().mission?.state,'held');
  await demoAction('/mission/resume');
  assert.equal(useDemoState.getState().mission?.state,'running');assert.equal(useDemoState.getState().blocked,null);
});
test('the last bot can be deleted and the same ID can be redeployed without stale poses',async()=>{
  await demoAction('/fleet/delete',{robot_id:'alpha'});await demoAction('/fleet/delete',{robot_id:'bravo'});
  assert.equal(useAppStore.getState().robots.length,0);assert.equal(useAppStore.getState().selectedRobotId,null);
  await demoAction('/fleet/spawn',{robot_id:'alpha',embodiment_type:'humanoid',initial_pose:{x:0,y:-1.8,yaw:.6}});
  assert.equal(useDemoState.getState().generations.alpha,1);assert.equal(useDemoState.getState().motion.alpha.x,0);
});
