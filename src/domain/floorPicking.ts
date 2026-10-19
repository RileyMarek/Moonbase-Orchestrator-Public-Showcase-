import { Plane, Ray, Vector3 } from 'three';

const floor=new Plane(new Vector3(0,1,0),-.02);
export function pickedFloorPoint(ray:Ray,bounds:readonly number[]):[number,number]|null {
  const hit=ray.intersectPlane(floor,new Vector3());
  if(!hit||!Number.isFinite(hit.x)||!Number.isFinite(hit.z))return null;
  return hit.z>=bounds[0]&&hit.x>=bounds[1]&&hit.z<=bounds[2]&&hit.x<=bounds[3]?[hit.z,hit.x]:null;
}
