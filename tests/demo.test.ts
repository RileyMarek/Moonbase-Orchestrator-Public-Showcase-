import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bone, Group } from 'three';
import { sampleDemo, demoVoxelSnapshot, LOOP_SECONDS } from '../src/telemetry/demoMockStream';
import { VoxelStream } from '../src/telemetry/voxelStream';
import { H1_JOINT_AXES, H1_JOINT_NAMES, bindH1Rig, applyH1Pose } from '../src/telemetry/h1Rig';

test('complete finite 19-joint frames remain within advertised loads across the loop', () => {
  for (let time = 0; time <= 60; time += 1 / 60) {
    const frame = sampleDemo(time);
    assert.equal(Object.keys(frame.joints).length, 19);
    assert.equal(frame.speed, 0.75);
    for (const name of H1_JOINT_NAMES) {
      assert.ok(Number.isFinite(frame.joints[name]));
      assert.ok(Number.isFinite(frame.velocities[name]));
      if (name.includes('knee')) assert.ok(frame.efforts[name] >= 20 && frame.efforts[name] <= 45);
      if (name.includes('shoulder') || name.includes('elbow')) assert.ok(frame.efforts[name] >= 5 && frame.efforts[name] <= 15);
    }
  }
});
test('gait repeats smoothly at sixty seconds and rejects invalid clock values', () => {
  assert.deepEqual(sampleDemo(LOOP_SECONDS), sampleDemo(0));
  for (const name of H1_JOINT_NAMES) assert.ok(Math.abs(sampleDemo(60 - 0.000001).joints[name] - sampleDemo(0).joints[name]) < 0.00001);
  for (const value of [-1, NaN, Infinity]) assert.throws(() => sampleDemo(value), RangeError);
});
test('synthetic snapshot survives actual MBVX decoder and rejects truncation and sequence gaps', () => {
  const bytes = demoVoxelSnapshot(), stream = new VoxelStream();
  stream.accept(bytes);
  assert.equal(stream.synchronized, true);
  assert.ok(stream.cells.size > 0 && stream.cells.size < 50000);
  assert.throws(() => stream.accept(bytes.slice(0, -1)), /bounds/);
  const delta = bytes.slice(), view = new DataView(delta.buffer);
  view.setUint8(5, 0); view.setUint32(12, 3, true);
  stream.accept(delta);
  assert.equal(stream.synchronized, false);
  assert.equal(stream.cells.size, 0);
});
test('sample animates all nineteen rig bindings and incomplete frames preserve the last pose', () => {
  const root = new Group();
  for (const [name, axis] of Object.entries(H1_JOINT_AXES)) {
    const bone = new Bone(); bone.name = name; bone.userData.rosJoint = { name, axis: [...axis] }; root.add(bone);
  }
  const rig = bindH1Rig(root);
  assert.equal(applyH1Pose(rig, sampleDemo(0.2).joints).matched, 19);
  const previous = rig.get('left_knee_joint')!.bone.quaternion.clone();
  assert.equal(applyH1Pose(rig, { left_knee_joint: 100 }).applied, false);
  assert.ok(previous.equals(rig.get('left_knee_joint')!.bone.quaternion));
});
