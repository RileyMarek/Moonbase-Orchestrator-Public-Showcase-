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

    // Ingest obstacle course voxels
    voxelStream("bot-01").accept(demoVoxelSnapshot());

    let rafId: number;
    const startTime = performance.now();

    function loop(now: number) {
      const elapsed = (now - startTime) / 1000;
      const demo = sampleDemo(elapsed);
      const stamp = Date.now();

      publishJointFrame({
        robotId: "bot-01",
        joints: demo.joints,
        velocities: demo.velocities,
        efforts: demo.efforts,
        stamp,
      });

      // Synthetic traversal through elbow-v1
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
