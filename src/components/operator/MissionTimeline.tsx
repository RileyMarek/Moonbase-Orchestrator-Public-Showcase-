import { useState } from "react";
import { Check, Circle, LoaderCircle, Plus, Square, X } from "lucide-react";
import { useMoonbaseRuntime } from "../../hooks/useMoonbaseRuntime";
import { commandDefaults } from "../../hooks/useMissionController";
import type { MissionStep } from "../../domain/types";
import { commandStatus, describeCommand } from "../../telemetry/missionView";

export function MissionTimeline() {
  const {
    mission: m,
    control: { snapshot },
  } = useMoonbaseRuntime();
  const [tab, setTab] = useState<"draft" | "run">(m.mission?.objective ? "run" : "draft");
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<MissionStep>(commandDefaults("observe"));
  const resumable = ["interrupted", "failed", "canceled", "held"].includes(m.mission?.state || "");
  const runView = m.running || tab === "run";
  const rows = runView
    ? m.mission?.steps || []
    : m.steps.map((command) => ({
        command,
        state: "pending",
        result: undefined,
      }));
  function open(index: number | null) {
    setEditing(index);
    setDraft(
      index === null ? commandDefaults("observe") : { ...m.steps[index] },
    );
    setAdding(true);
  }
  const active = snapshot?.motion;
  return (
    <section className="op-mission op-panel" aria-label="Mission pipeline">
      <header>
        <div>
          <h2>Mission pipeline</h2>
          {runView && m.mission?.objective && <p>{m.mission.objective}</p>}
          {runView && m.mission?.planning && <small>{m.mission.planning.provider} · {m.mission.planning.model_id}</small>}
          <span>
            {m.running
              ? "Executing"
              : runView
                ? `Last run · ${m.mission?.state || "none"}`
                : `${m.steps.length} commands in draft`}
          </span>
        </div>
        <div className="op-segment">
          <button
            aria-pressed={!runView}
            disabled={m.running}
            onClick={() => setTab("draft")}
          >
            Draft
          </button>
          <button
            aria-pressed={runView}
            disabled={!m.mission?.id}
            onClick={() => setTab("run")}
          >
            Last run
          </button>
        </div>
      </header>
      <ol className="op-timeline" data-testid="mission-result">
        {rows.map((row, i) => {
          const status = commandStatus(row.state),
            Icon =
              status === "completed"
                ? Check
                : status === "running"
                  ? LoaderCircle
                  : status === "stopped"
                    ? Square
                    : Circle;
          return (
            <li key={i} className={`op-step ${status}`}>
              <div className="op-step-top">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <Icon size={13} />
                <b>
                  {row.command.kind === "walk"
                    ? "Walk to"
                    : row.command.kind === "turn"
                      ? "Turn to"
                      : row.command.kind === "inspect" ? "Inspect camera" : row.command.kind === "wait" ? "Wait" : "Observe"}
                </b>
              </div>
              <p>{describeCommand(row.command)}</p>
              <small>
                {status}
                {status === "running" && active
                  ? ` · ${Math.round(active.progress * 100)}%${typeof active.elapsed === "number" && row.command.timeout_sec ? ` · ${Math.max(0, (active.timeout_sec || row.command.timeout_sec) - active.elapsed).toFixed(0)}s left` : ""}`
                  : ""}
              </small>
              {row.result && (
                <p title={row.result.message} className="op-result">
                  {row.result.message}
                </p>
              )}
              {row.result?.goal_verified && <small>{((row.result.remaining_m||0)*100).toFixed(1)} cm · {(row.result.heading_error_rad||0).toFixed(3)} rad · {Math.round((row.result.frame_age_s||0)*1000)} ms frame</small>}
              {row.result?.visual&&<small title={row.result.visual.model_id} className={row.result.visual_verified?'op-live':'op-muted'}>{row.result.visual_verified?'VISUALLY VERIFIED':'UNVERIFIED'} · {row.result.visual.inference_sec?.toFixed(2)}s</small>}
              {!runView && (
                <div className="op-step-edit">
                  <button
                    disabled={m.locked}
                    onClick={() => open(i)}
                    aria-label={`Edit step ${i + 1}`}
                  >
                    Edit
                  </button>
                  <button
                    disabled={m.locked || i === 0}
                    aria-label={`Move step ${i + 1} up`}
                    onClick={() => {
                      const next = [...m.steps];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      m.edit(next);
                    }}
                  >
                    ←
                  </button>
                  <button
                    disabled={m.locked || i === m.steps.length - 1}
                    aria-label={`Move step ${i + 1} down`}
                    onClick={() => {
                      const next = [...m.steps];
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      m.edit(next);
                    }}
                  >
                    →
                  </button>
                  <button
                    disabled={m.locked}
                    aria-label={`Remove step ${i + 1}`}
                    onClick={() => m.edit(m.steps.filter((_, j) => j !== i))}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {!runView && (
          <li>
            <button
              className="op-add-step"
              disabled={m.locked || m.steps.length >= 30}
              onClick={() => open(null)}
            >
              <Plus size={16} /> Add command
            </button>
          </li>
        )}
        {runView && !rows.length && (
          <li className="op-empty">No recorded run.</li>
        )}
      </ol>
      {adding && (
        <form
          className="op-command-editor"
          onSubmit={(e) => {
            e.preventDefault();
            m.edit(
              editing === null
                ? [...m.steps, draft]
                : m.steps.map((step, i) => (i === editing ? draft : step)),
            );
            setAdding(false);
            setTab("draft");
          }}
        >
          <label>
            Primitive
            <select
              aria-label="Command type"
              value={draft.kind}
              onChange={(e) =>
                setDraft(commandDefaults(e.target.value as MissionStep["kind"]))
              }
            >
              <option value="observe">Observe fresh pose</option>
              <option value="walk">Walk to waypoint</option>
              <option value="turn">Turn to heading</option>
            </select>
          </label>
          {draft.kind === "walk" &&
            (["x", "y"] as const).map((axis) => (
              <label key={axis}>
                World {axis.toUpperCase()} · m
                <input
                  aria-label={`Target ${axis.toUpperCase()}`}
                  type="number"
                  required
                  min={-6}
                  max={6}
                  step="0.1"
                  value={draft[axis]}
                  onChange={(e) =>
                    setDraft({ ...draft, [axis]: e.target.valueAsNumber })
                  }
                />
              </label>
            ))}
          {draft.kind === "turn" && (
            <label>
              Heading · degrees
              <input
                aria-label="Target heading"
                required
                type="number"
                min={-180}
                max={180}
                step={1}
                value={Math.round(((draft.yaw || 0) * 180) / Math.PI)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    yaw: (e.target.valueAsNumber * Math.PI) / 180,
                  })
                }
              />
            </label>
          )}
          {draft.kind !== "observe" && (
            <label>
              Timeout · s
              <input
                aria-label="Command timeout"
                required
                type="number"
                min={1}
                max={180}
                value={draft.timeout_sec}
                onChange={(e) =>
                  setDraft({ ...draft, timeout_sec: e.target.valueAsNumber })
                }
              />
            </label>
          )}
          <button type="submit" className="op-primary" disabled={m.locked}>
            Save command
          </button>
          <button type="button" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </form>
      )}
      <footer>
        <span>
          {m.runBlocked || "World XY in metres · headings in degrees"}
        </span>
        <div>
          {resumable && (
            <button disabled={!m.ready || (m.locked && !m.held) || m.pending || !!snapshot?.busy || !snapshot?.planning?.stationary || !snapshot?.runtime.stop_controller_qualified}
              title="Resume remaining commands after checking the current scene and stationary hold"
              onClick={() => void m.resume()}>Resume remaining steps</button>
          )}
          <button
            disabled={(!m.running && !m.agentActive) || m.pending}
            onClick={() => void m.halt("/cancel")}
          >
            Cancel run
          </button>
          <button
            className="op-primary"
            title={m.runBlocked || "Start a new execution"}
            disabled={!m.canRun}
            onClick={() =>
              void m.start().then((ok) => {
                if (ok) setTab("run");
              })
            }
          >
            Run sequence
          </button>
        </div>
      </footer>
    </section>
  );
}
