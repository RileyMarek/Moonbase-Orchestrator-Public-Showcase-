import { useEffect, useState } from 'react';
import type { Course, MissionSnapshot } from '../domain/types';
import { useAppStore } from '../store';
import { fleetRobots, type FleetManifest } from '../domain/fleet';
import type { WaypointProof } from '../domain/waypointProof';
import { demoAction } from '../demo/actions';
import { demoCourse, useDemoState } from '../demo/state';

export const ACTION_URL = '';

export interface CameraGeometry { intrinsics: number[]; world_from_optical: number[]; width: number; height: number; }
export interface NavigationState { state: string; controller?: string; hz?: number; measured_hz?: number | null; revocations?: number; partial_route?: boolean; reason?: string; target?: number[] | null; path?: number[][]; trace?: number[][]; preview?: number[][]; lookahead?: number[]; velocity?: number[]; occupied?: number[][]; footprint_radius_m?: number; sensor_age_s?: number; tick_ms?: number; blocked_seconds?: number; }
export interface BrainState { ready: boolean; disabled?: boolean; dev_mode?: boolean; provider?: string; model_id?: string; error: string; readiness?: string; fallback?: string; }
export interface EmbodimentProfile { label: string; capabilities: string[]; body_radius_m: number; overhead_clearance_m: number; mobility_notes: string; }
export interface VisualPreview {
  id: string; state: string; error?: string; model_id?: string; total_sec?: number; inference_sec?: number; historical_only?: boolean;
  points?: { image: number[]; world?: number[]; local_goal?: number[]; clearance: boolean; reason?: string; }[];
  motion_dispatched: false;
}
export interface AgentContext {
  historical?: boolean; history_error?: string;
  objective?: string; provider?: string; model_id?: string; inference_sec?: number;
  source_age_s?: number; source_observation_id?: string; destination_age_s?: number; destination_observation_id?: string;
  arrival_error_m?: number; finished_at?: number; proposal_points?: { x: number; y: number; }[];
  goal_verified?: boolean; goal_progress?: { kind?: string; remaining_m?: number; requested_distance_m?: number; target?: number[]; verified: boolean; verification: string; };
  state: string; message: string; steps: number; target?: number[];
  task_id?: string; retries?: number;
  recent?: { kind: string; reason?: string; target?: number[]; observation_id?: string; }[];
  spatial?: { frame: string; resolution_m: number; max_age_s: number; floor_cells: number; occupied_cells: number; nearby: [number, number, string][]; authority: string; };
}

export interface ControlSnapshot {
  navigation?: NavigationState; embodiment?: EmbodimentProfile; speed_m_s?: number | null; waypoint_demo?: WaypointProof | null;
  fleet?: FleetManifest; planning?: { stationary: boolean; stationary_window_sec: number; cloud_deadline_sec: number; blocked: string[]; };
  preview?: VisualPreview; perception?: { ready: boolean; frames: number; join_latency_s?: number | null; error: string; age_s?: number | null; map?: { voxels: number; new_voxels: number; resolution_m: number; saturated: boolean; }; camera?: CameraGeometry | null; };
  cloud?: BrainState; agentReady?: boolean; agent?: AgentContext; courseCatalog?: Course; scenePending?: boolean; course?: Course | null;
  mission?: MissionSnapshot; robotId: string; ready: boolean; busy: boolean; runtimeFresh: boolean;
  runtime: { policy_state?: string; embodiment_type?: string; upright?: boolean; policy?: string; brain?: string | null; control_mode?: string; scene_control?: boolean; stop_controller_qualified?: boolean; hold?: { verified: boolean; seconds: number; max_displacement_m: number; }; };
  pose?: number[]; motion: { state: string; kind?: string; progress: number; remaining?: number; elapsed?: number; timeout_sec?: number; message: string; };
  displayTelemetry?: { speed?: number; hz?: number; depth?: number; updatedAt: number; valid?: boolean; };
  receivedAt?: number;
  session?: { session_id: string; state: string; scene_epoch?: string; components: { id: string; ready: boolean; message: string; }[]; blockers: string[]; };
  globalNavigation?: { ready: boolean; state: string; reason?: string; path?: number[][]; localization: string; };
}

export function useRobotControl(enabled: boolean) {
  const selectedId = useAppStore(s => s.selectedRobotId);
  const demo = useDemoState();
  const [snapshot, setSnapshot] = useState<ControlSnapshot | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSnapshot(null);
      return;
    }

    const timer = setInterval(() => {
      const now = performance.now();
      const currentRobot = selectedId || 'bot-01';
      const isPaused = useDemoState.getState().paused;

      const nextSnapshot: ControlSnapshot = {
        robotId: currentRobot,
        ready: true,
        busy: !isPaused,
        runtimeFresh: true,
        speed_m_s: isPaused ? 0 : 0.75,
        course: demoCourse,
        runtime: {
          policy_state: isPaused ? 'STOPPED' : 'ACTIVE',
          embodiment_type: currentRobot === 'carter-01' ? 'amr' : currentRobot === 'go2-01' ? 'quadruped' : 'humanoid',
          upright: true,
          policy: 'Unified_PPO_Locomotion',
          control_mode: 'simulation',
          scene_control: true,
          stop_controller_qualified: true,
        },
        displayTelemetry: {
          speed: isPaused ? 0 : 0.75,
          hz: 20.0,
          depth: 0.45,
          updatedAt: now,
          valid: true,
        },
        perception: {
          ready: true,
          frames: 1850,
          error: '',
          age_s: 0.1,
        },
        motion: {
          state: isPaused ? 'held' : 'active',
          kind: 'walk',
          progress: 0.72,
          message: isPaused ? 'Stance held · Ready' : 'Synthesizing gait trajectory',
        },
        session: {
          session_id: 'public-demo-sim',
          state: 'active',
          components: [
            { id: 'telemetry', ready: true, message: 'Synthetic 60Hz Telemetry' },
            { id: 'kinematics', ready: true, message: '19-DOF Rig Active' },
          ],
          blockers: [],
        },
      };

      setSnapshot(nextSnapshot);
    }, 250);

    return () => clearInterval(timer);
  }, [enabled, selectedId]);

  async function send(path: string, body: object = {}) {
    return demoAction(path, body);
  }

  return { snapshot: enabled ? snapshot : null, error: enabled ? '' : 'Simulation only', send };
}
