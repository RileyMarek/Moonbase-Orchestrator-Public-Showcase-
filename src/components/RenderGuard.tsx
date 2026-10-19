import { Component, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
function Failure({retry,detail}:{retry:()=>void;detail:string}) {
  return <div className="render-failure" role="alert"><strong>3D RENDERER UNAVAILABLE</strong><p>ROS telemetry is separate from the browser’s graphics renderer.</p><p>The browser could not initialize WebGL. Update and relaunch the browser, then retry.</p><p>In Chrome, check chrome://gpu for WebGL 2 status. Graphics acceleration can be enabled while a driver or browser issue still prevents rendering.</p><small>{detail}</small><button onClick={retry}>RETRY 3D VIEW</button></div>;
}
class Boundary extends Component<{children:ReactNode;retry:()=>void},{error:string|null}> {
  state={error:null as string|null};
  static getDerivedStateFromError(error:Error){return {error:error.message};}
  render(){return this.state.error?<Failure detail={this.state.error} retry={this.props.retry}/>:this.props.children;}
}
export function RenderGuard({children}:{children:ReactNode}) {
  const [attempt,setAttempt]=useState(0),[error,setError]=useState('');
  useEffect(()=>{
    // Let the real renderer allocate its one context. A throwaway WebGL probe
    // consumes another GPU context on every mount and hot reload.
    const rejection=(event:PromiseRejectionEvent)=>{const message=String(event.reason?.message??event.reason);if(/WebGL|context.*lost/i.test(message)){setError(message);event.preventDefault();}};
    const lost=()=>setError('Graphics context lost. Free GPU resources, then retry.');
    window.addEventListener('unhandledrejection',rejection);window.addEventListener('astro-context-lost',lost);
    return()=>{window.removeEventListener('unhandledrejection',rejection);window.removeEventListener('astro-context-lost',lost);};
  },[attempt]);
  const retry=()=>{setError('');setAttempt(v=>v+1);};
  if(error)return <Failure retry={retry} detail={error}/>;
  return <Boundary key={attempt} retry={retry}>{children}</Boundary>;
}
