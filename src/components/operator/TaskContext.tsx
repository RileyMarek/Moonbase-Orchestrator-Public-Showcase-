import { ACTION_URL, type AgentContext } from "../../hooks/useRobotControl";

export function TaskContext({ agent, robotId }: { agent?: AgentContext; robotId?:string }) {
  const cells = agent?.spatial?.nearby || [];
  return (
    <section className="op-task-context op-panel" aria-label="Agent task context">
      <header><div><h2>Semantic command execution</h2><span>{agent?.provider || 'Selected brain'} · {agent?.model_id || 'waiting for proposal'}</span></div><b className={agent?.state==='succeeded'?'op-live':'op-active'}>{agent?.state || 'idle'}</b></header>
      {agent?.objective && <p className="op-command-objective">“{agent.objective}”</p>}
      {agent?.historical && <p className="op-muted">Recorded result from a previous backend session. Motion and geometry require new live observations.</p>}
      {agent?.goal_progress && <p className={agent.goal_verified ? 'op-live' : 'op-muted'} aria-label="User objective verification">
        {agent.goal_verified ? 'USER GOAL VERIFIED' : 'USER GOAL PENDING'}
        {agent.goal_progress.remaining_m != null && ` · ${(agent.goal_progress.remaining_m * 100).toFixed(1)} cm remaining`}
        {` · ${agent.steps || 0} waypoint${agent.steps === 1 ? '' : 's'}`}
      </p>}
      {agent?.finished_at && <p className="op-muted">Completed {new Date(agent.finished_at*1000).toLocaleTimeString()} · measured results from this command</p>}
      <div className="op-command-results" aria-label="Measured semantic command results">
        <div><span>INFERENCE</span><b>{agent?.inference_sec!=null?`${agent.inference_sec.toFixed(2)} s`:'—'}</b></div>
        <div><span>SOURCE AGE</span><b>{agent?.source_age_s!=null?`${(agent.source_age_s*1000).toFixed(0)} ms`:'—'}</b></div>
        <div><span>ARRIVAL ERROR</span><b>{agent?.arrival_error_m!=null?`${(agent.arrival_error_m*100).toFixed(2)} cm`:'—'}</b></div>
        <div><span>DESTINATION AGE</span><b>{agent?.destination_age_s!=null?`${(agent.destination_age_s*1000).toFixed(0)} ms`:'—'}</b></div>
      </div>
      {agent?.task_id && agent.source_observation_id && <div className="op-command-frames">
        <figure><div className="op-preview-image"><img src={`${ACTION_URL}/agent/frame.png?id=${encodeURIComponent(agent.task_id)}&robot_id=${encodeURIComponent(robotId || '')}&observation_id=${encodeURIComponent(agent.source_observation_id)}`} alt="Source camera frame used for this semantic command"/>{agent.proposal_points?.slice(0,4).map((point,i)=><span key={i} className="op-preview-point" style={{left:`${point.x*100}%`,top:`${point.y*100}%`}}>{i+1}</span>)}</div><figcaption>MODEL SOURCE · {agent.source_observation_id.slice(-18)}</figcaption></figure>
        {agent.destination_observation_id && <figure><img src={`${ACTION_URL}/agent/frame.png?id=${encodeURIComponent(agent.task_id)}&phase=destination&robot_id=${encodeURIComponent(robotId || '')}&observation_id=${encodeURIComponent(agent.destination_observation_id)}`} alt="New destination camera frame captured after arrival and braking"/><figcaption>AFTER BRAKING · {agent.destination_observation_id.slice(-18)}</figcaption></figure>}
      </div>}
      <details><summary>Spatial reasoning and action journal</summary>
      <dl className="op-readings">
        <div><dt>Task</dt><dd>{agent?.task_id?.slice(0, 8) || "None"}</dd></div>
        <div><dt>Actions / retries</dt><dd>{agent?.steps || 0} / {agent?.retries || 0}</dd></div>
        <div><dt>Observed cells</dt><dd>{agent?.spatial ? `${agent.spatial.floor_cells} floor · ${agent.spatial.occupied_cells} occupied` : "No current map"}</dd></div>
      </dl>
      {cells.length > 0 && <div className="op-evidence-cells" aria-label="Nearby observed world cells">
        {cells.map(([x,y,kind]) => <span key={`${x},${y}`} className={kind === "occupied" ? "op-warning" : "op-live"}>{kind} ({x.toFixed(2)}, {y.toFixed(2)}) m</span>)}
      </div>}
      <ol className="op-task-events">
        {agent?.recent?.map((event,i) => <li key={i}><b>{event.kind}</b><span>{event.reason || (event.target ? `World XY ${event.target.map(v=>v.toFixed(2)).join(", ")} m` : event.observation_id?.slice(-24) || "")}</span></li>)}
      </ol>
      <p className="op-muted">Geometry expires after 10 s. Unknown space remains unknown. Memory supports proposals; current local clearance authorizes motion.</p>
      </details>
      <p className="op-muted">{agent?.message || 'Enter a natural-language instruction above to begin.'}</p>
    </section>
  );
}
