import { Quaternion } from 'three';
import type { PoseSample } from './foxgloveTelemetry';

// ROS X-forward/Y-left/Z-up -> Three Z-forward/X-left/Y-up.
const basis = new Quaternion(.5, .5, .5, -.5);
const inverse = basis.clone().invert();
export function worldPoseToThree(sample: PoseSample) {
  const [x, y, z] = sample.position;
  const rotation = basis.clone().multiply(new Quaternion(...sample.orientation)).multiply(inverse);
  return { position: [y, z, x] as [number, number, number], rotation };
}
