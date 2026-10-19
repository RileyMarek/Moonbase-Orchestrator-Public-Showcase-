/**
 * Author: Riley Marek
 * Project: Project Moonbase
 * File: foxgloveTelemetry.ts
 * Description: Self-contained public showcase telemetry types and synthetic bridge contract.
 * Date: 2026-10-18
 */

export const FOXGLOVE_PROTOCOLS = [
  "foxglove.sdk.v1",
  "foxglove.websocket.v1",
];

export interface JointSample {
  robotId: string;
  joints: Record<string, number>;
  efforts?: Record<string, number>;
  velocities?: Record<string, number>;
  stamp: number;
}

export interface PoseSample {
  robotId: string;
  position: [number, number, number];
  orientation: [number, number, number, number];
  stamp: number;
}

export interface TelemetryChannel {
  id: number;
  topic: string;
  encoding: string;
  schemaName: string;
}

export type ConnectionState =
  | "connecting"
  | "waiting"
  | "live"
  | "stale"
  | "disconnected"
  | "disabled";

export function decodeJointSample(
  robotId: string,
  message: unknown,
): JointSample {
  const msg = message as JointSample;
  return {
    robotId,
    joints: msg.joints || {},
    efforts: msg.efforts || {},
    velocities: msg.velocities || {},
    stamp: typeof msg.stamp === 'number' ? msg.stamp : Date.now(),
  };
}

export function decodePoseSample(
  robotId: string,
  message: unknown,
): PoseSample {
  const msg = message as PoseSample;
  return {
    robotId,
    position: msg.position || [0, 0, 0],
    orientation: msg.orientation || [0, 0, 0, 1],
    stamp: typeof msg.stamp === 'number' ? msg.stamp : Date.now(),
  };
}
