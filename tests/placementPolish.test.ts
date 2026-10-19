import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, BoxGeometry, Group, Mesh, Ray, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { aboveFloor, FLOOR_Y, VisualBounds } from '../src/demo/grounding';
import { bindH1Rig, applyH1Pose } from '../src/telemetry/h1Rig';
import { sampleDemo } from '../src/telemetry/demoMockStream';
import { BODY_RADIUS } from '../src/demo/clearance';
import { pickedFloorPoint } from '../src/domain/floorPicking';
import { appendDraftWaypoint, pendingWaypoints } from '../src/domain/waypointDraft';
import { demoAction } from '../src/demo/actions';
import { useDemoState } from '../src/demo/state';
import type { MissionSnapshot } from '../src/domain/types';

test('hard floor recovery clamps submerged and invalid anchors without changing valid heights',()=>{
  assert.equal(aboveFloor(-10),FLOOR_Y);assert.equal(aboveFloor(NaN),FLOOR_Y);assert.equal(aboveFloor(.8),.8);
  const actor=new Group(),visual=new Group();actor.add(visual);visual.add(new Mesh(new BoxGeometry(.4,1,.4)));
  actor.position.y=aboveFloor(-10);const support=new VisualBounds();
  const box=support.measure(visual);visual.position.y+=Math.max(0,FLOOR_Y-box.min.y);
  assert.ok(support.measure(visual).min.y>=FLOOR_Y-1e-8);
});
test('the real H1 keeps its standing anchor and stays above floor through the complete demo gait',async()=>{
  const bytes=await readFile('public/models/h1/h1.glb');
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const model=gltf.scene,anchor=model.getObjectByName('Unitree_H1')!;
  assert.ok(anchor.position.y>1,'H1 needs its built-in 1.04 m standing offset');
  model.scale.setScalar(.92);const actor=new Group(),visual=new Group();actor.position.y=FLOOR_Y;actor.add(visual);visual.add(model);
  const rig=bindH1Rig(model),support=new VisualBounds();let radius=0;
  for(let i=0;i<24;i++){
    applyH1Pose(rig,sampleDemo(i/24/1.2).joints);visual.position.y=0;
    const box=support.measure(visual);
    radius=Math.max(radius,...[box.min.x,box.max.x].flatMap(x=>[box.min.z,box.max.z].map(z=>Math.hypot(x,z))));
    visual.position.y+=Math.max(0,FLOOR_Y-box.min.y);
    assert.ok(support.measure(visual).min.y>=FLOOR_Y-1e-7);
  }
  // Conservative body circles must also cover animated feet and arms, not only the torso.
  assert.ok(radius<=BODY_RADIUS.humanoid,`H1 visual gait envelope is ${radius.toFixed(3)} m; body radius is ${BODY_RADIUS.humanoid}`);
  const conservative=support.measure(visual).clone(),actual=new Box3().setFromObject(visual,true);
  assert.ok(conservative.min.y<=actual.min.y+1e-6);
});
test('floor picking projects 2D and perspective rays independently of scene meshes',()=>{
  const bounds=[-2.5,-3.5,4.5,3.5];
  assert.deepEqual(pickedFloorPoint(new Ray(new Vector3(1,10,2),new Vector3(0,-1,0)),bounds),[2,1]);
  const point=pickedFloorPoint(new Ray(new Vector3(2,3,4),new Vector3(-1,-3,-2).normalize()),bounds)!;
  assert.ok(Math.abs(point[0]-2)<.02&&Math.abs(point[1]-1)<.02);
  assert.equal(pickedFloorPoint(new Ray(new Vector3(20,10,20),new Vector3(0,-1,0)),bounds),null);
  assert.equal(pickedFloorPoint(new Ray(new Vector3(0,1,0),new Vector3(0,1,0)),bounds),null);
});
test('drafts deduplicate a double click and completed waypoints leave the rendered route',()=>{
  const draft=appendDraftWaypoint([],1,0);assert.equal(appendDraftWaypoint(draft,1.001,0),draft);
  const mission:MissionSnapshot={id:'route',state:'running',steps:[{command:draft[0],state:'succeeded'},{command:{kind:'walk',x:2,y:0},state:'running'}]};
  assert.deepEqual(pendingWaypoints([],mission,true),[{kind:'walk',x:2,y:0}]);
  assert.deepEqual(pendingWaypoints([],{...mission,state:'succeeded'},false),[]);
});
test('locations have one case-insensitive identity and deleting them clears stale plans',async()=>{
  const initial=useDemoState.getState();
  try{
    useDemoState.setState({bookmarks:{items:{},revision:'empty',scope:'test'},plan:null});
    await demoAction('/bookmarks/save',{name:'Terminal',pose:[1.9,2.1,0]});
    await demoAction('/bookmarks/save',{name:'terminal',pose:[1.9,2.2,.5]});
    assert.equal(Object.keys(useDemoState.getState().bookmarks.items).length,1);
    assert.equal(useDemoState.getState().bookmarks.items.Terminal.pose[1],2.2);
    useDemoState.setState({plan:{id:'old',objective:'Terminal',steps:[],verification:'demo'}});
    await demoAction('/bookmarks/delete',{name:'Terminal'});
    assert.deepEqual(useDemoState.getState().bookmarks.items,{});assert.equal(useDemoState.getState().plan,null);
    await assert.rejects(demoAction('/bookmarks/save',{name:'Outside',pose:[20,0,0]}),/boundary/);
  }finally{useDemoState.setState(initial);}
});
