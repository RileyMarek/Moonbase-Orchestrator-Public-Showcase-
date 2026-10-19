import { useState } from 'react';
import { Network, Trash2 } from 'lucide-react';
import type { Robot } from '../../store';

export function FleetList({robots,locked,enabled,onFocus,send}:{
  robots:Robot[];locked:boolean;enabled:boolean;onFocus:(id:string)=>void;
  send:(path:string,body:object)=>Promise<unknown>;
}) {
  const [pending,setPending]=useState<string|null>(null),[message,setMessage]=useState(''),[error,setError]=useState('');
  async function remove(id:string) {
    setPending(id);setMessage('');setError('');
    try { const result=await send('/fleet/delete',{robot_id:id}) as {message:string};setMessage(result.message); }
    catch(cause){setError(cause instanceof Error?cause.message:'Bot could not be deleted');}
    finally{setPending(null);}
  }
  return <>
    {robots.map(robot=><div className="hud-fleet-row" key={robot.id}>
      <button className="hud-fleet-unit" aria-label={`Focus ${robot.id}`} disabled={locked} onClick={()=>onFocus(robot.id)}>
        <Network size={24}/><span><b>{robot.id}</b><small>{robot.type} · {robot.status}</small></span><span>Focus</span>
      </button>
      <button className="hud-fleet-delete" aria-label={`Delete ${robot.id}`} title="Delete from this demo; its active mission will be canceled" disabled={!enabled||pending!==null} onClick={()=>void remove(robot.id)}><Trash2 size={17}/></button>
    </div>)}
    {!robots.length&&<p>No matching bots. Deploy a bot below to add one.</p>}
    {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="op-error">{error}</p>}
  </>;
}
