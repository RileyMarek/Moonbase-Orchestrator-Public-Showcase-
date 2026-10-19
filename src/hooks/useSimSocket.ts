/**
 * Author: Riley Marek
 * Project: Project Moonbase
 * File: useSimSocket.ts
 * Description: Client-side synthetic simulation telemetry provider for public showcase.
 * Date: 2026-10-18
 */
import { useEffect, useState } from "react";
import { useAppStore } from "../store";
import { sampleDemo, demoVoxelSnapshot } from "../telemetry/demoMockStream";
import {
  publishJointFrame,
  publishPoseFrame,
  setJointConnection,
} from "../telemetry/jointStream";
import { voxelStream, clearVoxelStreams } from "../telemetry/voxelStream";
import { useDemoState } from "../demo/state";

export type TelemetryStatus =
  | "connecting"
  | "waiting"
  | "live"
  | "stale"
  | "disconnected"
  | "disabled";

export function useSimSocket() {
  const appMode = useAppStore((state) => state.appMode);
  const updateRobotPosition = useAppStore((state) => state.updateRobotPosition);
  const updateRobotJoints = useAppStore((state) => state.updateRobotJoints);
  const updateRobotDynamics = useAppStore((state) => state.updateRobotDynamics);
  const [status, setStatus] = useState<TelemetryStatus>("live");
  const [error] = useState<string | null>(null);
  const [messages, setMessages] = useState(0);

  useEffect(() => {
    if (appMode !== "simulation") {
      clearVoxelStreams();
      setJointConnection("disabled");
      setStatus("disabled");
      return;
    }

    setJointConnection("waiting");
    setStatus("live");

    // Ingest obstacle course voxels for all fleet units
    voxelStream("bot-01").accept(demoVoxelSnapshot());
    voxelStream("carter-01").accept(demoVoxelSnapshot());
    voxelStream("go2-01").accept(demoVoxelSnapshot());

    let rafId: number;
    let activeTime = 0;
    let lastTick = performance.now();

    const robotStates: Record<string, { x: number; z: number; yaw: number }> = {
      "bot-01": { x: 0, z: 0, yaw: 0 },
      "carter-01": { x: -2, z: -1.6, yaw: 0 },
      "go2-01": { x: -2, z: 1.2, yaw: 0 },
    };

    function loop(now: number) {
      const dt = Math.min((now - lastTick) / 1000, 0.1);
      lastTick = now;
      const demoState = useDemoState.getState();
      const isPaused = demoState.paused;
      if (!isPaused) {
        activeTime += dt;
      }
      const elapsed = activeTime;
      const demo = sampleDemo(elapsed);
      const stamp = Date.now();
      const currentSelected = useAppStore.getState().selectedRobotId || "bot-01";
      const activeMission = demoState.mission;

      // Keep voxel streams fresh so sensorFresh never expires
      const vNow = performance.now();
      voxelStream("bot-01").receivedAt = vNow;
      voxelStream("carter-01").receivedAt = vNow;
      voxelStream("go2-01").receivedAt = vNow;

      // Handle custom mission waypoint navigation
      if (!isPaused && activeMission && activeMission.state === 'running' && activeMission.steps.length > 0) {
        const pendingIndex = activeMission.steps.findIndex(s => s.state !== 'succeeded');
        if (pendingIndex >= 0) {
          const step = activeMission.steps[pendingIndex];
          if (step.command.kind === 'walk' && Number.isFinite(step.command.x) && Number.isFinite(step.command.y)) {
            const targetThreeX = step.command.y!;
            const targetThreeZ = step.command.x!;
            const rState = robotStates[currentSelected] || robotStates["bot-01"];
            const dx = targetThreeX - rState.x;
            const dz = targetThreeZ - rState.z;
            const dist = Math.hypot(dx, dz);
            const targetYaw = Math.atan2(dx, dz);

            if (dist > 0.12) {
              const angleDiff = Math.atan2(Math.sin(targetYaw - rState.yaw), Math.cos(targetYaw - rState.yaw));
              rState.yaw += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 3.0 * dt);
              const stepDist = Math.min(dist, 0.85 * dt);
              rState.x += Math.sin(rState.yaw) * stepDist;
              rState.z += Math.cos(rState.yaw) * stepDist;
            } else {
              step.state = 'succeeded';
              if (pendingIndex === activeMission.steps.length - 1) {
                useDemoState.setState({
                  mission: {
                    ...activeMission,
                    state: 'succeeded',
                  }
                });
              }
            }
          } else {
            step.state = 'succeeded';
          }
        }
      } else if (!isPaused && (!activeMission || activeMission.state !== 'running')) {
        // Cyclic background patrol for H1 when no user mission is running
        const cycle = elapsed % 24;
        let px = 0;
        let pz = 0;
        let pyaw = 0;
        if (cycle < 8) {
          pz = (cycle / 8) * 1.9;
          px = 0;
          pyaw = 0;
        } else if (cycle < 10) {
          pz = 1.9;
          px = 0;
          pyaw = ((cycle - 8) / 2) * (Math.PI / 2);
        } else if (cycle < 18) {
          pz = 1.9;
          px = ((cycle - 10) / 8) * 2.1;
          pyaw = Math.PI / 2;
        } else {
          const back = (cycle - 18) / 6;
          pz = 1.9 * (1 - back);
          px = 2.1 * (1 - back);
          pyaw = Math.PI;
        }
        robotStates["bot-01"].x = px;
        robotStates["bot-01"].z = pz;
        robotStates["bot-01"].yaw = pyaw;
      }

      // Publish H1 Humanoid frames
      const h1State = robotStates["bot-01"];
      const qzH1 = Math.sin(h1State.yaw / 2);
      const qwH1 = Math.cos(h1State.yaw / 2);
      publishJointFrame({
        robotId: "bot-01",
        joints: demo.joints,
        velocities: demo.velocities,
        efforts: demo.efforts,
        stamp,
      });
      publishPoseFrame({
        robotId: "bot-01",
        position: [h1State.z, h1State.x, 0],
        orientation: [0, 0, qzH1, qwH1],
        stamp,
      });
      updateRobotPosition("bot-01", [h1State.x, 0, h1State.z]);
      updateRobotJoints("bot-01", demo.joints);
      updateRobotDynamics("bot-01", demo.efforts, demo.velocities);

      // Publish Go2 Quadruped frames
      const go2State = robotStates["go2-01"];
      const qzGo2 = Math.sin(go2State.yaw / 2);
      const qwGo2 = Math.cos(go2State.yaw / 2);
      const trot = Math.sin(elapsed * 6);
      const trotCos = Math.cos(elapsed * 6);
      const go2Joints: Record<string, number> = {
        FL_hip_joint: 0.05 * trotCos,
        FL_thigh_joint: 0.65 + 0.35 * trot,
        FL_calf_joint: -1.35 - 0.25 * trot,
        FR_hip_joint: -0.05 * trotCos,
        FR_thigh_joint: 0.65 - 0.35 * trot,
        FR_calf_joint: -1.35 + 0.25 * trot,
        RL_hip_joint: 0.05 * trotCos,
        RL_thigh_joint: 0.65 - 0.35 * trot,
        RL_calf_joint: -1.35 + 0.25 * trot,
        RR_hip_joint: -0.05 * trotCos,
        RR_thigh_joint: 0.65 + 0.35 * trot,
        RR_calf_joint: -1.35 - 0.25 * trot,
      };
      const go2Efforts: Record<string, number> = {};
      const go2Velocities: Record<string, number> = {};
      for (const k of Object.keys(go2Joints)) {
        go2Efforts[k] = 12.5 + 4.2 * Math.sin(elapsed * 4);
        go2Velocities[k] = 1.2 * Math.cos(elapsed * 6);
      }
      publishJointFrame({
        robotId: "go2-01",
        joints: go2Joints,
        velocities: go2Velocities,
        efforts: go2Efforts,
        stamp,
      });
      publishPoseFrame({
        robotId: "go2-01",
        position: [go2State.z, go2State.x, 0],
        orientation: [0, 0, qzGo2, qwGo2],
        stamp,
      });
      updateRobotPosition("go2-01", [go2State.x, 0, go2State.z]);
      updateRobotJoints("go2-01", go2Joints);
      updateRobotDynamics("go2-01", go2Efforts, go2Velocities);

      // Publish Carter AMR frames
      const carterState = robotStates["carter-01"];
      const qzCarter = Math.sin(carterState.yaw / 2);
      const qwCarter = Math.cos(carterState.yaw / 2);
      const carterJoints: Record<string, number> = {
        left_wheel_joint: (elapsed * 5) % (Math.PI * 2),
        right_wheel_joint: (elapsed * 5) % (Math.PI * 2),
        lidar_joint: (elapsed * 20) % (Math.PI * 2),
      };
      const carterEfforts: Record<string, number> = {
        left_wheel_joint: 8.5 + 1.5 * Math.sin(elapsed),
        right_wheel_joint: 8.5 + 1.5 * Math.cos(elapsed),
        lidar_joint: 0.5,
      };
      const carterVelocities: Record<string, number> = {
        left_wheel_joint: 5.0,
        right_wheel_joint: 5.0,
        lidar_joint: 20.0,
      };
      publishJointFrame({
        robotId: "carter-01",
        joints: carterJoints,
        velocities: carterVelocities,
        efforts: carterEfforts,
        stamp,
      });
      publishPoseFrame({
        robotId: "carter-01",
        position: [carterState.z, carterState.x, 0],
        orientation: [0, 0, qzCarter, qwCarter],
        stamp,
      });
      updateRobotPosition("carter-01", [carterState.x, 0, carterState.z]);
      updateRobotJoints("carter-01", carterJoints);
      updateRobotDynamics("carter-01", carterEfforts, carterVelocities);

      setMessages((m) => (m + 1) % 10000);
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      setJointConnection("disconnected");
    };
  }, [appMode, updateRobotPosition, updateRobotJoints, updateRobotDynamics]);

  return { status, error, messages, close: () => {} };
}
