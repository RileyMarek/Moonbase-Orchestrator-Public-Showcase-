import { useEffect, useState } from 'react';
import type { Course, MissionSnapshot } from '../domain/types';
import { useAppStore } from '../store';
import { fleetRobots, type FleetManifest } from '../domain/fleet';
import type { WaypointProof } from '../domain/waypointProof';
import { demoAction } from '../demo/actions';
import { demoCourse, useDemoState } from '../demo/state';
import { getPoseFrame } from '../telemetry/jointStream';
import { voxelStream } from '../telemetry/voxelStream';

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
      const demoState = useDemoState.getState();
      const isPaused = demoState.paused;
      const robotMotion = demoState.motion[currentRobot];
      const speed = isPaused ? 0 : robotMotion?.speed || 0;
      const stream = voxelStream(currentRobot);
      const poseFrame = getPoseFrame(currentRobot);
      const yaw = poseFrame ? 2 * Math.atan2(poseFrame.orientation[2], poseFrame.orientation[3]) : 0;
      const pose = poseFrame ? [poseFrame.position[0], poseFrame.position[1], yaw] : [0, 0, 0];

      const mission = demoState.missionRobotId===currentRobot ? demoState.mission : undefined;
      const command = mission?.state==='running' ? mission.steps.find(s=>s.state!=='succeeded')?.command : undefined;
      const remaining = command?.kind==='walk' ? Math.hypot(command.x!-pose[0],command.y!-pose[1]) : 0;
      const nextSnapshot: ControlSnapshot = {
        robotId: currentRobot,
        ready: true,
        busy: false,
        runtimeFresh: true,
        speed_m_s: speed,
        course: demoCourse,
        pose,
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
          speed: speed,
          hz: 20.0 + 0.2 * Math.cos(now / 600),
          depth: 0.45 + 0.03 * Math.sin(now / 500),
          updatedAt: now,
          valid: true,
        },
        perception: {
          ready: true,
          frames: Math.floor(1850 + (now / 50)),
          error: '',
          age_s: 0.05,
          map: {
            voxels: stream.cells.size,
            new_voxels: 35,
            resolution_m: stream.resolution,
            saturated: false,
          },
          camera: {
            intrinsics: [240, 0, 160, 0, 240, 120, 0, 0, 1],
            world_from_optical: [0, 0, 1, 0, -1, 0, 0, 0, 0, -1, 0, 1.45, 0, 0, 0, 1],
            width: 320,
            height: 240,
          },
        },
        cloud: {
          ready: true,
          provider: demoState.provider,
          model_id: 'Local demo command parser',
          error: '',
          readiness: 'Scripted local preview; no live inference',
        },
        preview: demoState.preview,
        mission,
        navigation: {
          state: isPaused ? 'held' : 'tracking',
          controller: 'Unified_PPO_Locomotion',
          footprint_radius_m: currentRobot === 'carter-01' ? 0.45 : currentRobot === 'go2-01' ? 0.35 : 0.40,
          revocations: 0,
          hz: 20.0,
        },
        planning: {
          stationary: speed < .005,
          stationary_window_sec: 1.5,
          cloud_deadline_sec: 2.0,
          blocked: [],
        },
        motion: {
          state: isPaused ? 'held' : speed > .005 ? 'active' : 'idle',
          kind: command?.kind || 'walk',
          progress: ((now / 2000) % 1),
          remaining,
          message: isPaused ? 'Stance held · Ready' : 'Synthesizing gait trajectory',
        },
        session: {
          session_id: 'public-demo-sim',
          state: 'active',
          components: [
            { id: 'telemetry', ready: true, message: 'Synthetic 60Hz Telemetry' },
            { id: 'kinematics', ready: true, message: '19-DOF Rig Active' },
            { id: 'perception', ready: true, message: 'Synthetic demo only' },
          ],
          blockers: [],
        },
        fleet: {
          epoch: 'public-demo-epoch',
          fresh: true,
          robots: [
            { robot_id: 'bot-01', embodiment_type: 'humanoid', namespace: '/bot_01', initial_pose: [0, 0, 0], navigation_ready: true },
            { robot_id: 'carter-01', embodiment_type: 'wheeled_amr', namespace: '/carter_01', initial_pose: [-1.6, -2, 0], navigation_ready: true },
            { robot_id: 'go2-01', embodiment_type: 'quadruped', namespace: '/go2_01', initial_pose: [1.2, -2, 0], navigation_ready: true },
          ],
          catalog: {
            humanoid: { label: 'Unitree H1', asset: 'h1.glb', controller: 'Unified_PPO_Locomotion' },
            wheeled_amr: { label: 'Nova Carter', asset: null, controller: 'DiffDrive' },
            quadruped: { label: 'Unitree Go2', asset: null, controller: 'Quadruped_Trot' },
            semi_humanoid: { label: 'Manipulator AMR', asset: null, controller: null },
          },
          environment_fresh: true,
          environment: {
            id: 'elbow-v1',
            epoch: 'public-demo-epoch',
            revision: 'demo-rev-1',
            frame: 'world',
            bounds: [-2.5, -3.5, 4.5, 3.5],
            localization: 'Isaac Sim Ground Truth',
            obstacles: [
              { id: 'divider', center: [0.5, 1.3, 0.5], size: [1.2, 0.5, 1] },
              { id: 'outer', center: [3, 0.9, 0.5], size: [0.4, 1.4, 1] },
            ],
            landmarks: {
              Home: { pose: [0, 0, 0], evidence: 'Base origin' },
              Terminal: { pose: [2.1, 1.9, 0], evidence: 'Corridor inspection point' },
            },
          },
        },
        globalNavigation: {
          ready: true,
          state: isPaused ? 'idle' : 'tracking',
          localization: 'Isaac Ground Truth',
          path: mission?.state==='running' ? [pose.slice(0,2),...mission.steps.filter(s=>s.state!=='succeeded'&&s.command.kind==='walk').map(s=>[s.command.x!,s.command.y!])] : [],
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
