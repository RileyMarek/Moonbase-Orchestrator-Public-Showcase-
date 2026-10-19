import { useAppStore } from '../store';
import { useDemoState } from '../demo/state';
import { appendDraftWaypoint } from '../domain/waypointDraft';
import { useEffect, useState } from "react";
import type { ControlSnapshot } from "./useRobotControl";
import type { MissionStep } from "../domain/types";
import { nextSequenceId, sequenceBlocker } from "../telemetry/sequenceGate";
import { shouldResumeMission } from "../telemetry/missionRecovery";

export const commandDefaults = (kind: MissionStep["kind"]): MissionStep =>
  kind === "observe"
    ? { kind }
    : kind === "walk"
      ? { kind, x: 1.9, y: 0, tolerance: 0.2, timeout_sec: 120 }
      : { kind, yaw: 0, tolerance: 0.15, timeout_sec: 90 };

/** One owner for drafts and dispatch; presentation switches never recreate it. */
export function useMissionController(
  snapshot: ControlSnapshot | null,
  send: (path: string, body?: object) => Promise<unknown>,
  enabled: boolean,
) {
  const owner=useAppStore(s=>s.selectedRobotId)||'';
  const roster=useAppStore(s=>s.robots.map(r=>r.id).join('|'));
  const locationsRevision=useDemoState(s=>s.bookmarks.revision);
  const [drafts,setDrafts]=useState<Record<string,MissionStep[]>>({});
  const steps=drafts[owner]||[];
  const [plan, setPlan] = useState<{id:string;objective:string;steps:MissionStep[];verification:string;session_id?:string}|null>(null);
  const [oneWaypoint, setOneWaypoint] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [request, setRequest] = useState<{
    id: string;
    steps: MissionStep[];
    course_id?: string;
  } | null>(null);
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [mode, setMode] = useState<"manual" | "agent">("agent"),
    [goal, setGoal] = useState("");
  const mission = snapshot?.mission;
  const held = mission?.state === "held";
  const running =
    ["running", "canceling", "holding", "held"].includes(mission?.state || "");
  const agentActive =
    !!snapshot?.agent &&
    ["observing", "inference", "validating", "executing", "settling"].includes(
      snapshot.agent.state,
    );
  const locked =
    !!running || agentActive || pending || !!snapshot?.scenePending;
  const ready = enabled && !!snapshot?.ready;
  const runBlocked = sequenceBlocker(
    snapshot,
    enabled,
    pending,
    steps.length,
    courseId,
  );
  const canRun = !runBlocked && !agentActive && !held;
  function edit(next: MissionStep[]) {
    setDrafts(previous=>({...previous,[owner]:next}));
    setRequest(null);
    setError("");
  }
  function appendWaypoint(x:number,y:number) {
    setDrafts(previous=>({...previous,[owner]:appendDraftWaypoint(previous[owner]||[],x,y)}));
    setRequest(null);setError('');
  }
  useEffect(()=>{setPlan(null);setRequest(null);setError('');},[owner,locationsRevision]);
  useEffect(()=>{const ids=new Set(roster.split('|'));setDrafts(previous=>Object.fromEntries(Object.entries(previous).filter(([id])=>ids.has(id))));},[roster]);
  async function perform(path: string, body: object = {}) {
    setPending(true);
    setError("");
    try {
      await send(path, body);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      return false;
    } finally {
      setPending(false);
    }
  }
  async function changeCourse(loaded: boolean) {
    if (
      !ready ||
      locked ||
      snapshot?.busy ||
      !snapshot?.runtime.scene_control ||
      (loaded && !snapshot.courseCatalog)
    )
      return;
    if (await perform("/course", { loaded })) {
      setCourseId(loaded ? snapshot!.courseCatalog!.id : null);
      edit(loaded ? structuredClone(snapshot!.courseCatalog!.steps) : []);
    }
  }
  async function start() {
    if (!canRun) return false;
    const body = {
      id: nextSequenceId(request?.id, mission, () => crypto.randomUUID()),
      steps,
      ...(courseId ? { course_id: courseId } : {}),
    };
    setRequest(body);
    const accepted=await perform("/mission", body);
    if(accepted)setDrafts(previous=>({...previous,[owner]:[]}));
    return accepted;
  }
  async function startAgent() {
    if (!enabled || pending || !goal.trim())
      return false;
    return draftMission();
  }
  async function draftMission() {
    setPending(true); setError(""); setPlan(null);
    try {
      const result = await send("/mission/plan", {task:goal});
      setPlan({...result as {id:string;objective:string;steps:MissionStep[];verification:string;session_id?:string},session_id:snapshot?.session?.session_id});
      return true;
    } catch(e) {setError(e instanceof Error?e.message:"Mission planning failed");return false;}
    finally {setPending(false);}
  }
  async function halt(path: "/cancel" | "/stop") {
    if (!enabled) return false;
    return perform(path);
  }
  return {
    oneWaypoint,
    setOneWaypoint,
    steps,
    courseId,
    request,
    pending,
    error,
    clearError: () => setError(""),
    mode,
    setMode,
    goal,
    setGoal,
    mission,
    running,
    agentActive,
    locked,
    ready,
    runBlocked,
    canRun,
    edit,
    appendWaypoint,
    changeCourse,
    start,
    held,
    pause: () => perform("/mission/pause"),
    resume: () => perform("/mission/resume", { id: mission?.id }),
    startAgent,
    plan,
    draftMission,
    dispatchGoal: async () => {
      if (!enabled || pending || running || agentActive || !goal.trim()) return false;
      setPending(true); setError("");
      try {
        if (shouldResumeMission(mission, goal)) {
          await send("/mission/resume", {id:mission?.id});
          setPlan(null);
          return true;
        }
        const draft = plan?.objective === goal && plan.session_id===snapshot?.session?.session_id ? plan : {...await send("/mission/plan", {task:goal}) as NonNullable<typeof plan>,session_id:snapshot?.session?.session_id};
        setPlan(draft);
        await send("/mission/execute-plan", {plan_id:draft.id});
        setPlan(null);
        return true;
      } catch(e) {setError(e instanceof Error?e.message:"Mission could not start");return false;}
      finally {setPending(false);}
    },
    executePlan: async () => {
      if (!plan || plan.objective !== goal) return false;
      const ok = await perform("/mission/execute-plan", {plan_id:plan.id});
      if(ok){setPlan(null);}
      return ok;
    },
    halt,
  };
}
export type MissionController = ReturnType<typeof useMissionController>;
