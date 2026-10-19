import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { BookmarkList } from '../../hooks/usePoseBookmarks';

export function PoseBookmarks({data,pin,onPin,onSaved,onGo,send,enabled,error,onRefresh,choosing=false}: {
  data:BookmarkList;pin:number[]|null;onPin:()=>void;onSaved:(data:BookmarkList)=>void;
  onGo:(name:string)=>void;send:(path:string,body?:object)=>Promise<unknown>;enabled:boolean;error:string;onRefresh:()=>void;
  choosing?:boolean;
}) {
  const [name,setName]=useState('');
  const [target,setTarget]=useState('');
  const [heading,setHeading]=useState('0');
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState('');
  async function remove(name:string){
    setPending(true);setMessage('');
    try{const result=await send('/bookmarks/delete',{name}) as BookmarkList;onSaved(result);setMessage(`Deleted ${name}`);}
    catch(error){setMessage(error instanceof Error?error.message:'Location could not be deleted');}
    finally{setPending(false);}
  }
  async function save(current:boolean){
    setPending(true);setMessage('');
    try{
      const pose=current?undefined:pin?[pin[0],pin[1],Number(heading)*Math.PI/180]:undefined;
      const result=await send('/bookmarks/save',{name,visual_target:target,...(pose?{pose}:{})}) as BookmarkList;
      onSaved(result);setMessage(`Saved ${name.trim()}`);setName('');
    }catch(e){setMessage(e instanceof Error?e.message:'Location could not be saved');}
    finally{setPending(false);}
  }
  return <section className="hud-bookmarks" aria-label="Pose bookmarks">
    <p>Save a pose and camera heading. Use its name in Mission control.</p>
    <label>Location name<input aria-label="Location name" value={name} maxLength={40} placeholder="Staging Area" onChange={e=>setName(e.target.value)}/></label>
    <label>Visual target <small>optional · required for inspection</small><input aria-label="Visual target" value={target} maxLength={120} placeholder="The shelf beside the charging dock" onChange={e=>setTarget(e.target.value)}/></label>
    <div className="hud-bookmark-actions"><button disabled={!enabled||pending||!name.trim()} onClick={()=>void save(true)}>Save current pose</button><button disabled={!enabled||pending} onClick={onPin}>Drop a pin</button></div>
    {choosing&&<p role="status">Click the floor outside this panel to choose the location. Esc cancels.</p>}
    {pin&&<div className="hud-pin-editor"><span>Pin · X {pin[0].toFixed(2)} / Y {pin[1].toFixed(2)} m</span><label>Camera heading · degrees<input type="number" aria-label="Bookmark heading" value={heading} min="-180" max="180" onChange={e=>setHeading(e.target.value)}/></label><button disabled={!enabled||pending||!name.trim()||!Number.isFinite(Number(heading))} onClick={()=>void save(false)}>Save pin</button></div>}
    {message&&<p role="status">{message}</p>}{error&&<p role="status">{error}</p>}
    <div className="hud-bookmark-list">{Object.entries(data.items).map(([key,item])=>
      <div className="hud-bookmark-row" key={key}>
        <button disabled={!enabled||pending||!item.available} title={item.reason || 'Prepare instruction; Go dispatches it'} onClick={()=>onGo(key)}>
          <span><b>{item.label}</b><small>{item.pose.slice(0,2).map(v=>v.toFixed(2)).join(' / ')} m · {Math.round(item.pose[2]*180/Math.PI)}°{item.visual_target?` · ${item.visual_target}`:''}</small></span><span>{item.available?'Use →':'Unavailable'}</span>
        </button>
        <button className="hud-fleet-delete" aria-label={`Delete location ${key}`} title="Delete location" disabled={!enabled||pending} onClick={()=>void remove(key)}><Trash2 size={15}/></button>
      </div>
    )}</div>
    {!Object.keys(data.items).length&&<p>No saved locations in this environment yet.</p>}
    <button className="hud-bookmarks-refresh" onClick={onRefresh}>Refresh locations</button>
  </section>;
}
