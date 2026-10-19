import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Raycaster, Vector2 } from 'three';
import { pickedFloorPoint } from '../domain/floorPicking';

/** DOM pointer picking ignores decorative meshes and rejects orbit drags. */
export function FloorPicker({enabled,owner,bounds,onPick,onError}:{enabled:boolean;owner:string;bounds:readonly number[];onPick:(x:number,y:number)=>void;onError:(message:string)=>void}) {
  const {gl,camera}=useThree(),latest=useRef({enabled,owner,bounds,onPick,onError});
  latest.current={enabled,owner,bounds,onPick,onError};
  const down=useRef<{id:number;x:number;y:number;owner:string}|null>(null);
  useEffect(()=>{
    const canvas=gl.domElement,raycaster=new Raycaster(),pointer=new Vector2();
    let suppressClick=false;
    const start=(event:PointerEvent)=>{suppressClick=false;down.current=latest.current.enabled&&event.button===0?{id:event.pointerId,x:event.clientX,y:event.clientY,owner:latest.current.owner}:null;};
    const finish=(event:PointerEvent)=>{
      const press=down.current,current=latest.current;down.current=null;
      if(!press||!current.enabled||press.id!==event.pointerId||press.owner!==current.owner||Math.hypot(event.clientX-press.x,event.clientY-press.y)>5)return;
      suppressClick=true;
      const rect=canvas.getBoundingClientRect();
      pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);
      const point=pickedFloorPoint(raycaster.ray,current.bounds);
      if(point)current.onPick(...point);else current.onError('Choose a floor point inside the scene boundary.');
    };
    const cancel=()=>{down.current=null;};
    // A successful pin ends drafting before the browser dispatches click. Consume
    // that click so the robot mesh underneath cannot select itself/close the form.
    const click=(event:MouseEvent)=>{if(suppressClick){suppressClick=false;event.stopImmediatePropagation();}};
    canvas.addEventListener('pointerdown',start,true);canvas.addEventListener('pointerup',finish,true);canvas.addEventListener('pointercancel',cancel,true);canvas.addEventListener('click',click,true);
    return()=>{canvas.removeEventListener('pointerdown',start,true);canvas.removeEventListener('pointerup',finish,true);canvas.removeEventListener('pointercancel',cancel,true);canvas.removeEventListener('click',click,true);down.current=null;};
  },[gl,camera]);
  return null;
}
