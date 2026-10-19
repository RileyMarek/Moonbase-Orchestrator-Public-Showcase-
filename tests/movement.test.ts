import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceDemoMission, type DemoPose } from '../src/demo/motion';
import { planDemoTask, validateDemoSteps } from '../src/demo/planner';
import { useDemoState } from '../src/demo/state';
import type { MissionSnapshot } from '../src/domain/types';
import { demoVoxelSnapshot } from '../src/telemetry/demoMockStream';
import { VoxelStream } from '../src/telemetry/voxelStream';
import { localVoxels } from '../src/domain/spatialPresentation';

for (const [embodiment,speed] of [['humanoid',.75],['quadruped',.7],['carter',.6]] as const) {
  test(`${embodiment} reaches nearby, rearward and turning waypoints without orbiting or overshooting`, () => {
    let pose:DemoPose={x:0,y:0,yaw:0,speed:0}, elapsed=0;
    let mission:MissionSnapshot={id:'test',state:'running',steps:[
      {command:{kind:'walk',x:.01,y:0},state:'pending'},
      {command:{kind:'walk',x:-.4,y:-.6},state:'pending'},
      {command:{kind:'turn',yaw:Math.PI-.01},state:'pending'},
      {command:{kind:'walk',x:1,y:.8},state:'pending'},
    ]};
    for(let i=0;i<3000&&mission.state==='running';i++){
      const next=advanceDemoMission(pose,mission,1/60,elapsed,speed);
      assert.ok(Math.hypot(next.pose.x-pose.x,next.pose.y-pose.y)<=speed/60+.001);
      pose=next.pose;mission=next.mission;elapsed=next.elapsed;
    }
    assert.equal(mission.state,'succeeded');assert.equal(pose.x,1);assert.equal(pose.y,.8);
    const held=advanceDemoMission(pose,mission,.1,elapsed,speed);
    assert.equal(held.pose.x,1);assert.equal(held.pose.y,.8);assert.equal(held.pose.speed,0);
  });
}
test('held mission consumes no wait time or motion and command input is not mutated',()=>{
  const pose={x:1,y:2,yaw:0,speed:0};
  const mission:MissionSnapshot={id:'hold',state:'held',steps:[{command:{kind:'wait',seconds:2},state:'running'}]};
  const next=advanceDemoMission(pose,mission,.1,.7);
  assert.equal(next.elapsed,.7);assert.deepEqual(next.pose,pose);
  const running={...mission,state:'running'};
  assert.equal(advanceDemoMission(pose,running,.1,1.95).mission.state,'succeeded');
  assert.equal(mission.steps[0].state,'running');
});
test('local instructions resolve named poses, coordinates, relative movement and waits; unsupported text is rejected',()=>{
  const bookmarks=useDemoState.getState().bookmarks, origin={x:0,y:0,yaw:0,speed:0};
  const route=planDemoTask('Visit the Terminal, inspect it, then return Home',bookmarks,origin);
  assert.deepEqual(route.map(s=>s.kind),['walk','turn','inspect','walk','turn']);
  assert.equal(route[0].x,bookmarks.items.Terminal.pose[0]);
  assert.equal(route[3].x,0);
  assert.deepEqual(planDemoTask('move to -1, 2',bookmarks,origin),[{kind:'walk',x:-1,y:2}]);
  assert.deepEqual(planDemoTask('turn left 90 then move forward 1 m then wait 2 seconds',bookmarks,origin).map(s=>s.kind),['turn','walk','wait']);
  assert.throws(()=>planDemoTask('bring me coffee',bookmarks,origin),/Demo commands/);
  assert.throws(()=>validateDemoSteps([{kind:'walk',x:NaN,y:0}]),/finite/);
  assert.throws(()=>validateDemoSteps([{kind:'wait',seconds:-1}]),/0–60/);
});
test('synthetic occupancy supplies locally visible floor/obstacle cells around every fleet spawn',()=>{
  const stream=new VoxelStream();stream.accept(demoVoxelSnapshot());
  for(const [x,y] of [[0,0],[-1.6,-2],[1.2,-2]])
    assert.ok(localVoxels(stream.cells.values(),stream.resolution,x,y).length>100);
});
