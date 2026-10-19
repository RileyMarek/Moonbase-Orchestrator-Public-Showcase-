import {test} from 'node:test';
import assert from 'node:assert/strict';
import { findDemoPath,routeDemoSteps } from '../src/demo/routing';
import { clearanceIssue,routeIssue,type DemoBody,DEMO_BOUNDS } from '../src/demo/clearance';
import { advanceCheckedMission,type DemoPose } from '../src/demo/motion';
import { planDemoTask,validateDemoSteps } from '../src/demo/planner';
import { useDemoState } from '../src/demo/state';
import type { MissionSnapshot } from '../src/domain/types';
import { Group,Mesh,BoxGeometry,Vector3 } from 'three';
import { localModelBounds,metricScale } from '../src/domain/modelScale';

for(const type of ['humanoid','quadruped','amr'] as const)test(`${type} routes Terminal then Home with collision-free swept segments`,()=>{
  const body:DemoBody={id:'test',type,x:0,y:0};
  const fleet=[body,{id:'other',type:'amr' as const,x:1.9,y:0}];
  const requested=planDemoTask('Go to terminal, then go home',useDemoState.getState().bookmarks,{...body,yaw:0,speed:0});
  const routed=routeDemoSteps(body,requested,fleet);
  assert.equal(routeIssue(body,routed,fleet),null);
  assert.ok(routed.some(s=>s.demo_detour));
  assert.deepEqual(routed.filter(s=>!s.demo_detour),requested.map(s=>s.kind==='walk'?{...s,tolerance:.05,global_route:true,demo_detour:false}:s));
  let pose:DemoPose={...body,yaw:0,speed:0},elapsed=0;
  let mission:MissionSnapshot={id:'round-trip',state:'running',steps:routed.map(command=>({command,state:'pending'}))};
  for(let i=0;i<4000&&mission.state==='running';i++){
    const result=advanceCheckedMission(pose,mission,.05,elapsed,{...body,...pose},fleet);
    assert.equal(result.blocked,null);pose=result.pose;mission=result.mission;elapsed=result.elapsed;
  }
  assert.equal(mission.state,'succeeded');assert.ok(Math.hypot(pose.x,pose.y)<.001);
});

test('a newly appearing bot triggers a detour without advancing into it',()=>{
  const body:DemoBody={id:'moving',type:'humanoid',x:-1,y:-3},blocker:DemoBody={id:'blocker',type:'amr',x:.5,y:-3};
  let pose:DemoPose={...body,yaw:0,speed:0},elapsed=0,rerouted=false;
  let mission:MissionSnapshot={id:'dynamic',state:'running',steps:[{command:{kind:'walk',x:4,y:-3},state:'pending'}]};
  for(let i=0;i<2000&&mission.state==='running';i++){
    const result=advanceCheckedMission(pose,mission,.05,elapsed,{...body,...pose},[body,blocker]);
    assert.equal(result.blocked,null);assert.equal(clearanceIssue(body,pose,result.pose,[body,blocker]),null);
    rerouted ||= result.rerouted;pose=result.pose;mission=result.mission;elapsed=result.elapsed;
  }
  assert.ok(rerouted);assert.equal(mission.state,'succeeded');assert.equal(pose.x,4);
});

test('occupied goals, solid walls and invalid bounds cannot be routed through',()=>{
  const body:DemoBody={id:'test',type:'humanoid',x:0,y:0};
  assert.throws(()=>findDemoPath(body,body,{x:.5,y:1.3},[]),/obstacle/);
  assert.throws(()=>findDemoPath(body,body,{x:12,y:0},[]),/boundary/);
  assert.throws(()=>findDemoPath(body,body,{x:NaN,y:0},[]),/finite/);
  const trapped={...body,x:-6.8,y:0};
  const cage=[-1.4,0,1.4].map((y,i)=>({id:`wall${i}`,type:'amr' as const,x:-5.45,y}));
  cage.push({id:'top',type:'amr',x:-6.8,y:1.4},{id:'bottom',type:'amr',x:-6.8,y:-1.4});
  assert.throws(()=>findDemoPath(trapped,trapped,{x:5,y:0},cage),/No safe route/);
});

test('expanded boundary accepts distant destinations but retains footprint clearance',()=>{
  assert.deepEqual(DEMO_BOUNDS,[-8,-8,12,8]);
  assert.equal(validateDemoSteps([{kind:'walk',x:10,y:6}]).length,1);
  const body:DemoBody={id:'test',type:'amr',x:0,y:-3};
  assert.equal(routeIssue(body,routeDemoSteps(body,[{kind:'walk',x:10,y:6}],[]),[]),null);
});

test('model calibration uses local dimensions even at a rotated world pose',()=>{
  const actor=new Group(),root=new Group();actor.position.set(10,2,-5);actor.rotation.y=.7;actor.add(root);
  root.add(new Mesh(new BoxGeometry(.6,.8,1)));
  const size=localModelBounds(root).getSize(new Vector3());assert.ok(size.distanceTo(new Vector3(.6,.8,1))<1e-6);
  const scale=metricScale('amr',size);assert.ok(Math.abs(size.x*scale[0]-.5)<1e-8);assert.ok(Math.abs(size.y*scale[1]-.556)<1e-8);assert.ok(Math.abs(size.z*scale[2]-.722)<1e-8);
});
