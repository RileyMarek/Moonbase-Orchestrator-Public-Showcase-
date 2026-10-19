import { useEffect, useMemo } from 'react';
import { ShaderMaterial, DoubleSide } from 'three';
/** Analytic anti-aliased floor dots; one draw call, no texture or particle grid. */
export function SpatialFloor({light}:{light:boolean}) {
  const material=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,
    uniforms:{ink:{value:light ? .08 : .12}},
    vertexShader:'varying vec2 floorPoint; void main(){floorPoint=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float ink; varying vec2 floorPoint; void main(){vec2 p=mod(floorPoint+.25,.5)-.25;float d=length(p);float aa=max(fwidth(d),.001);float dot=1.-smoothstep(.008,.008+aa,d);float fade=1.-smoothstep(8.,22.,length(floorPoint)); gl_FragColor=vec4(.48,.60,.64,dot*fade*ink);}'
  }),[light]);
  useEffect(()=>()=>material.dispose(),[material]);
  return <mesh rotation={[-Math.PI/2,0,0]} position={[0,.006,0]}><planeGeometry args={[100,100]}/><primitive object={material} attach="material"/></mesh>;
}
