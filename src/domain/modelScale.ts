import { Box3, InstancedMesh, Matrix4, Mesh, Object3D, Vector3 } from 'three';
import type { Robot } from '../store';

// Reference standing dimensions in metres: Three X=width, Y=height, Z=length.
// Unitree H1/Go2 product specifications; Segway Nova Carter P1 manual v1.0.
export const MODEL_DIMENSIONS:Record<Robot['type'],{height:number;width?:number;length?:number}>={
  humanoid:{height:1.805},quadruped:{length:.70,width:.31,height:.40},amr:{length:.722,width:.50,height:.556},
};

/** Exact local mesh bounds, independent of the robot's world yaw/translation. Run once. */
export function localModelBounds(root:Object3D){
  root.updateWorldMatrix(true,true);
  root.updateMatrixWorld(true);
  const inverse=new Matrix4().copy(root.matrixWorld).invert(),matrix=new Matrix4(),instance=new Matrix4(),vertex=new Vector3(),box=new Box3();
  root.traverse(node=>{
    if(!(node instanceof Mesh))return;
    const positions=node.geometry.getAttribute('position');if(!positions)return;
    const count=node instanceof InstancedMesh?node.count:1;
    for(let n=0;n<count;n++){
      matrix.copy(inverse).multiply(node.matrixWorld);
      if(node instanceof InstancedMesh){node.getMatrixAt(n,instance);matrix.multiply(instance);}
      for(let i=0;i<positions.count;i++){node.getVertexPosition(i,vertex);box.expandByPoint(vertex.applyMatrix4(matrix));}
    }
  });
  return box;
}

export function metricScale(type:Robot['type'],size:Vector3):[number,number,number]{
  if(![size.x,size.y,size.z].every(v=>Number.isFinite(v)&&v>0))throw new Error('Cannot calibrate an empty robot model');
  const target=MODEL_DIMENSIONS[type];
  if(type==='humanoid'){const scale=target.height/size.y;return [scale,scale,scale];}
  return [target.width!/size.x,target.height/size.y,target.length!/size.z];
}
