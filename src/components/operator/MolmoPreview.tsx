import { useState } from "react";
import { ACTION_URL, type ControlSnapshot } from "../../hooks/useRobotControl";

export function MolmoPreview({ snapshot, send, enabled, initialTask }: {
  snapshot: ControlSnapshot | null;
  send: (path: string, body?: object) => Promise<unknown>;
  enabled: boolean;
  initialTask?: string;
}) {
  const [task, setTask] = useState(initialTask?.trim() || "Point to ONE next visible traversable floor passage around the L-course divider. Avoid obstacles and the robot body.");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const preview = snapshot?.preview;
  const ready = enabled && snapshot?.ready && snapshot.perception?.age_s != null && snapshot.perception.age_s < 10 && snapshot.cloud?.ready
    && !snapshot.busy && snapshot.mission?.state !== "running" && preview?.state !== "running";
  async function inspect() {
    setPending(true); setError("");
    try { await send("/perception/preview", { task }); }
    catch (e) { setError(e instanceof Error ? e.message : "Preview unavailable"); }
    finally { setPending(false); }
  }
  return <section className="op-panel op-padding" aria-label="Semantic visual preview">
    <h2>Visual proposal inspection</h2>
    <p className="op-muted">Camera → {snapshot?.cloud?.provider || 'semantic brain'} → depth → local clearance. No motion dispatched.</p>
    <p className={snapshot?.planning?.stationary ? "op-live" : "op-warning"}>
      {!snapshot?.ready ? "Awaiting live robot telemetry" : snapshot.planning?.stationary ? "Stationary: proposals can be checked against fresh depth" : "Robot is moving: cloud results are inspection only"}
    </p>
    <label>Preview objective<input aria-label="Preview objective" value={task} maxLength={1000} onChange={e => setTask(e.target.value)} /></label>
    <button className="op-primary" disabled={!ready || pending || !task.trim()} onClick={() => void inspect()}>
      {preview?.state === "running" ? "Inspecting image…" : "Inspect proposal"}
    </button>
    {!snapshot?.cloud?.ready && <p className="op-muted">{snapshot?.cloud?.error || "Waiting for private cloud connection."}</p>}
    {(error || preview?.error) && <p role="alert" className="op-error">{error || `Preview failed: ${preview?.error}. Check camera freshness and cloud connectivity.`}</p>}
    {preview?.state === "complete" && <>
      <div className="op-preview-image">
        <img src={`${ACTION_URL}/preview.png?id=${encodeURIComponent(preview.id)}&robot_id=${encodeURIComponent(snapshot?.robotId || '')}`} alt="Captured onboard image used for this semantic proposal" />
        {preview.points?.map((p, i) => <span key={i} className={`op-preview-point ${p.clearance ? "clear" : "blocked"}`} style={{left: `${p.image[0]*100}%`, top: `${p.image[1]*100}%`}}>{i+1}</span>)}
      </div>
      <p>{preview.model_id} · {preview.total_sec?.toFixed(2)} s round trip · {preview.historical_only ? "inspection only" : "fresh depth checked"}</p>
      {!preview.points?.length && <p>No visible passage proposed.</p>}
      <ol>{preview.points?.map((p, i) => <li key={i}>{p.clearance ? "Clearance passed at inspection" : "Rejected"}{p.world && ` · world (${p.world.map(v => v.toFixed(2)).join(", ")}) m`}{p.reason && ` · ${p.reason}`}</li>)}</ol>
      <p className="op-muted">Inspection results expire for control; execution always requires a new observation and qualified stopping.</p>
    </>}
  </section>;
}
