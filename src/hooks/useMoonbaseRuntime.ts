import { createContext, useContext } from "react";
import type { useSimSocket } from "./useSimSocket";
import type { useRobotControl } from "./useRobotControl";
import type { useMissionController } from "./useMissionController";

export type MoonbaseRuntime = {
  telemetry: ReturnType<typeof useSimSocket>;
  control: ReturnType<typeof useRobotControl>;
  mission: ReturnType<typeof useMissionController>;
};
export const RuntimeContext = createContext<MoonbaseRuntime | null>(null);
export function useMoonbaseRuntime() {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("Moonbase runtime provider missing");
  return value;
}
