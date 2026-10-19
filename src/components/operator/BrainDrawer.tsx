import { useState } from "react";
import { ACTION_URL } from "../../hooks/useRobotControl";
import { useMoonbaseRuntime } from "../../hooks/useMoonbaseRuntime";
import { useAppStore } from "../../store";

export function BrainDrawer() {
  const {
    control: { snapshot },
  } = useMoonbaseRuntime();
  const robot = useAppStore((s) =>
    s.robots.find((r) => r.id === s.selectedRobotId),
  );
  const [profile, setProfile] = useState(() => {
    try {
      return (
        JSON.parse(
          localStorage.getItem(`astro.config.${robot?.id}`) || "null",
        ) || {
          brain: "None",
          policy: robot?.type === "humanoid" ? "H1 Flat Terrain" : "Unassigned",
        }
      );
    } catch {
      return { brain: "None", policy: "Unassigned" };
    }
  });
  const [failedFrame, setFailedFrame] = useState<number | null>(null);
  const frame = snapshot?.perception?.frames || 0;
  function save(key: "brain" | "policy", value: string) {
    const next = { ...profile, [key]: value };
    setProfile(next);
    try {
      localStorage.setItem(`astro.config.${robot?.id}`, JSON.stringify(next));
    } catch {
      /* Preference remains available this session. */
    }
  }
  return (
    <div className="op-brain-body">
      <p className="op-muted">
        High-level perception and low-level control ·{" "}
        {robot?.id || "No unit selected"}
      </p>
      <dl className="op-readings">
        <div>
          <dt>Cloud model</dt>
          <dd>{snapshot?.cloud?.model_id || "Not reported"}</dd>
        </div>
        <div>
          <dt>Connection</dt>
          <dd className={snapshot?.cloud?.ready ? "op-live" : "op-warning"}>
            {snapshot?.cloud?.ready ? "Ready" : "Unavailable"}
          </dd>
        </div>
        <div>
          <dt>Inference latency</dt>
          <dd>{snapshot?.preview?.inference_sec != null ? `${snapshot.preview.inference_sec.toFixed(2)} s (last inspection)` : "Not reported"}</dd>
        </div>
        <div>
          <dt>Live policy</dt>
          <dd>{snapshot?.runtime.policy || "Not reported"}</dd>
        </div>
        <div>
          <dt>Action service</dt>
          <dd>{ACTION_URL}</dd>
        </div>
      </dl>
      {snapshot?.cloud?.error && (
        <p role="status" className="op-warning">
          {snapshot.cloud.error}
        </p>
      )}
      <p className="op-muted">
        The private inference endpoint is configured in middleware. Credentials
        stay outside the browser.
      </p>
      <h3>Onboard camera</h3>
      {snapshot?.perception?.age_s != null && snapshot.perception.age_s < 10 && failedFrame !== frame ? (
        <img
          className="op-camera"
          key={frame}
          src={`${ACTION_URL}/camera.png?frame=${frame}&robot_id=${encodeURIComponent(snapshot.robotId)}`}
          onError={() => setFailedFrame(frame)}
          alt="Latest onboard camera image; display freshness is separate from control readiness"
        />
      ) : (
        <div className="op-camera-empty">
          {snapshot?.perception?.error ||
            "No synchronized camera frame available."}
        </div>
      )}
      <p className="op-muted">
        {snapshot?.perception?.frames || 0} frames received. Model annotations
        and token history are not exposed by the current API.
      </p>
      <h3>Unit test profiles</h3>
      <label>
        Brain profile
        <select
          value={profile.brain}
          onChange={(e) => save("brain", e.target.value)}
        >
          <option>None</option>
          <option>Molmo-7B / planned</option>
        </select>
      </label>
      <label>
        Policy profile
        <select
          value={profile.policy}
          onChange={(e) => save("policy", e.target.value)}
        >
          <option>Unassigned</option>
          {robot?.type === "humanoid" && <option>H1 Flat Terrain</option>}
          {robot?.type === "quadruped" && (
            <option>Quadruped Gait / planned</option>
          )}
        </select>
      </label>
      <p className="op-muted">
        Profiles are saved preferences. Loading or swapping a running model
        requires its backend deployment.
      </p>
    </div>
  );
}
