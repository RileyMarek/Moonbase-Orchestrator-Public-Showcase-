import { Box3, Matrix4, Mesh, Object3D, SkinnedMesh, Vector3, InstancedMesh } from 'three';

export const FLOOR_Y = .02;

/** Demo poses are ground anchors, not pelvis/base-link heights. */
export function aboveFloor(value:number) { return Number.isFinite(value)?Math.max(FLOOR_Y,value):FLOOR_Y; }

/** Cache bone-local support boxes once; update only their eight corners per pose. */
export class VisualBounds {
  private meshes:Mesh[]=[];
  private supports:{mesh:Mesh;box:Box3;bone?:Object3D}[]=[];
  private matrix=new Matrix4();
  private temporary=new Box3();
  readonly box=new Box3();
  measure(root:Object3D) {
    const meshes:Mesh[]=[];root.traverse(node=>{if(node instanceof Mesh)meshes.push(node);});
    if(meshes.length!==this.meshes.length||meshes.some((mesh,i)=>mesh!==this.meshes[i])) {
      this.meshes=meshes;this.supports=[];
      for(const mesh of meshes) {
        if(mesh instanceof SkinnedMesh) {
          const positions=mesh.geometry.getAttribute('position'),indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
          const boxes=new Map<number,Box3>(),vertex=new Vector3();
          for(let i=0;i<positions.count;i++)for(let j=0;j<4;j++)if(weights.getComponent(i,j)>0) {
            const index=indices.getComponent(i,j);
            vertex.fromBufferAttribute(positions,i).applyMatrix4(mesh.bindMatrix).applyMatrix4(mesh.skeleton.boneInverses[index]);
            let box=boxes.get(index);if(!box){box=new Box3();boxes.set(index,box);}box.expandByPoint(vertex);
          }
          for(const [index,box] of boxes)this.supports.push({mesh,box,bone:mesh.skeleton.bones[index]});
        } else {
          if(mesh instanceof InstancedMesh){mesh.computeBoundingBox();this.supports.push({mesh,box:mesh.boundingBox!.clone()});}
          else {if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();this.supports.push({mesh,box:mesh.geometry.boundingBox!.clone()});}
        }
      }
    }
    root.updateWorldMatrix(true,false);root.updateMatrixWorld(true);this.box.makeEmpty();
    for(const support of this.supports) {
      if(support.bone) this.matrix.copy(support.mesh.matrixWorld).multiply((support.mesh as SkinnedMesh).bindMatrixInverse).multiply(support.bone.matrixWorld);
      else this.matrix.copy(support.mesh.matrixWorld);
      this.box.union(this.temporary.copy(support.box).applyMatrix4(this.matrix));
    }
    return this.box;
  }
}
