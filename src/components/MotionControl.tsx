import { useState } from 'react';
import type { ControlSnapshot } from '../hooks/useRobotControl';
export function MotionControl({snapshot,send}:{snapshot:ControlSnapshot|null;send:(path:string,body?:object)=>Promise<unknown>}){
  const [kind,setKind]=useState('walk'),[x,setX]=useState('1'),[y,setY]=useState('0'),[yaw,setYaw]=useState('90'),[timeout,setTimeoutValue]=useState('60'),[message,setMessage]=useState(''),[pending,setPending]=useState(false);
  const submit=async(path:string,body:object={})=>{setPending(true);try{await send(path,body);setMessage(path==='/goal'?'Goal accepted':path==='/cancel'?'Cancellation requested':'Stop requested');}catch(e){setMessage(String(e));}finally{setPending(false);}};
  return <section className="motion-control"><h4>ROS 2 ACTION CONTROL <span>{snapshot?.ready?'READY':'NOT READY'}</span></h4>
    {!snapshot?.ready&&<p>Start the action server and Isaac with <code>-ActionControl</code>. The loop demo cannot accept goals.</p>}
    <form onSubmit={e=>{e.preventDefault();void submit('/goal',{kind,x:Number(x),y:Number(y),yaw:Number(yaw)*Math.PI/180,tolerance:kind==='walk'?.2:.15,timeout_sec:Number(timeout)});}}>
      <label>GOAL<select value={kind} onChange={e=>setKind(e.target.value)}><option value="walk">WalkTo · world XY</option><option value="turn">TurnTo · world heading</option></select></label>
      <div className="motion-fields">{kind==='walk'?<><label>X / M<input type="number" step=".1" min="-6" max="6" required value={x} onChange={e=>setX(e.target.value)}/></label><label>Y / M<input type="number" step=".1" min="-6" max="6" required value={y} onChange={e=>setY(e.target.value)}/></label></>:<label>HEADING / DEG<input type="number" min="-180" max="180" required value={yaw} onChange={e=>setYaw(e.target.value)}/></label>}<label>TIMEOUT / S<input type="number" min="1" max="180" required value={timeout} onChange={e=>setTimeoutValue(e.target.value)}/></label></div>
      <button disabled={!snapshot?.ready||snapshot.busy||snapshot.mission?.state === "running"||snapshot.mission?.state === "canceling"||pending}>SEND GOAL</button>
    </form><div className="motion-buttons"><button disabled={!(snapshot?.busy || snapshot?.mission?.state === "running" || snapshot?.mission?.state === "canceling")||pending} onClick={()=>void submit('/cancel')}>CANCEL</button><button disabled={!snapshot||pending} onClick={()=>void submit('/stop')}>STOP MOTION</button></div>
    <progress max="1" value={snapshot?.motion.progress||0}/><p role="status">{snapshot?.motion.state||'OFFLINE'} · {snapshot?.motion.message||'No action server connected'}</p>{message&&<p role="status">{message}</p>}<small>Stop commands zero velocity; the policy keeps balancing.</small>
  </section>;
}
