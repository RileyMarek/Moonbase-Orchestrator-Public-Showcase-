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

    function loop(now: number) {
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      const isPaused = useDemoState.getState().paused;
      if (!isPaused) {
        activeTime += dt;
      }
      const elapsed = activeTime;
      const demo = sampleDemo(elapsed);
      const stamp = Date.now();

      publishJointFrame({
        robotId: "bot-01",
        joints: demo.joints,
        velocities: demo.velocities,
        efforts: demo.efforts,
        stamp,
      });

      // Synthetic traversal through elbow-v1 for H1
      const cycle = elapsed % 24;
      let x = 0;
      let y = 0;
      let yaw = 0;
      if (cycle < 8) {
        x = (cycle / 8) * 1.9;
        y = 0;
        yaw = 0;
      } else if (cycle < 10) {
        x = 1.9;
        y = 0;
        yaw = ((cycle - 8) / 2) * (Math.PI / 2);
      } else if (cycle < 18) {
        x = 1.9;
        y = ((cycle - 10) / 8) * 2.1;
        yaw = Math.PI / 2;
      } else {
        const back = (cycle - 18) / 6;
        x = 1.9 * (1 - back);
        y = 2.1 * (1 - back);
        yaw = Math.PI;
      }

      const qz = Math.sin(yaw / 2);
      const qw = Math.cos(yaw / 2);

      publishPoseFrame({
        robotId: "bot-01",
        position: [x, y, 0],
        orientation: [0, 0, qz, qw],
        stamp,
      });

      updateRobotJoints("bot-01", demo.joints);
      updateRobotDynamics("bot-01", demo.efforts, demo.velocities);

      // Synthesize Go2 quadruped kinematics
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
      updateRobotJoints("go2-01", go2Joints);
      updateRobotDynamics("go2-01", go2Efforts, go2Velocities);
      publishJointFrame({
        robotId: "go2-01",
        joints: go2Joints,
        velocities: go2Velocities,
        efforts: go2Efforts,
        stamp,
      });
      publishPoseFrame({
        robotId: "go2-01",
        position: [-2, 0, 1.2],
        orientation: [0, 0, 0, 1],
        stamp,
      });

      // Synthesize Carter AMR drive wheels
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
      updateRobotJoints("carter-01", carterJoints);
      updateRobotDynamics("carter-01", carterEfforts, carterVelocities);
      publishJointFrame({
        robotId: "carter-01",
        joints: carterJoints,
        velocities: carterVelocities,
        efforts: carterEfforts,
        stamp,
      });
      publishPoseFrame({
        robotId: "carter-01",
        position: [-2, 0, -1.6],
        orientation: [0, 0, 0, 1],
        stamp,
      });

      setMessages((m) => (m + 1) % 10000);
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      setJointConnection("disconnected");
    };
  }, [appMode, updateRobotJoints, updateRobotDynamics]);

  return { status, error, messages, close: () => {} };
}
