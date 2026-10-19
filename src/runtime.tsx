import { type ReactNode } from "react";
import { RuntimeContext } from "./hooks/useMoonbaseRuntime";
import { useSimSocket } from "./hooks/useSimSocket";
import { useRobotControl } from "./hooks/useRobotControl";
import { useMissionController } from "./hooks/useMissionController";
import { useAppStore } from "./store";

function useRuntimeOwner() {
  const enabled = useAppStore((s) => s.appMode === "simulation");
  const telemetry = useSimSocket();
  const control = useRobotControl(enabled);
  const mission = useMissionController(control.snapshot, control.send, enabled);
  return { telemetry, control, mission };
}
export function RuntimeProvider({ children }: { children: ReactNode }) {
  const value = useRuntimeOwner();
  return (
    <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
  );
}
