/**
 * Author: Riley Marek
 * Project: Project Moonbase
 * File: store.ts
 * Description: Global Zustand state store for the Moonbase frontend.
 * Date: 2026-09-08
 */

import { create } from "zustand";

export type AgentMode = "simulation" | "physical";
export type EnvironmentType = "factory" | "lunar";
export type UiTheme = "operator" | "astro";
export type ViewMode = "perspective" | "plan";

function initialTheme(): UiTheme {
  try {
    return localStorage.getItem("moonbase_ui_theme") === "astro"
      ? "astro"
      : "operator";
  } catch {
    return "operator";
  }
}

export interface Robot {
  id: string;
  type: "humanoid" | "quadruped" | "amr";
  amrVariant?: "flat" | "arm";
  mode: AgentMode;
  position: [number, number, number];
  targetPosition?: [number, number, number];
  joints?: Record<string, number>;
  efforts?: Record<string, number>;
  velocities?: Record<string, number>;
  battery: number;
  status: "idle" | "active" | "error" | "offline";
  temperature: number;
  assignedTasks: string[];
}

interface AppState {
  colorMode: 'light' | 'dark';
  sceneMotion: boolean;
  setColorMode: (mode: 'light' | 'dark') => void;
  setSceneMotion: (enabled: boolean) => void;
  uiTheme: UiTheme;
  viewMode: ViewMode;
  setUiTheme: (theme: UiTheme) => void;
  setViewMode: (mode: ViewMode) => void;
  appMode: AgentMode;
  environment: EnvironmentType;
  robots: Robot[];
  selectedRobotId: string | null;
  setAppMode: (mode: AgentMode) => void;
  setEnvironment: (env: EnvironmentType) => void;
  addRobot: (robot: Robot) => void;
  removeRobot: (id: string) => void;
  updateRobotPosition: (id: string, position: [number, number, number]) => void;
  updateRobotTarget: (
    id: string,
    targetPosition?: [number, number, number],
  ) => void;
  updateRobotJoints: (id: string, joints: Record<string, number>) => void;
  updateRobotDynamics: (
    id: string,
    efforts?: Record<string, number>,
    velocities?: Record<string, number>,
  ) => void;
  selectRobot: (id: string | null) => void;
  updateRobotStatus: (id: string, status: Robot["status"]) => void;
  addRobotTask: (id: string, task: string) => void;
  dispatchCommand: (id: string, cmd: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  colorMode: (() => { try { return localStorage.getItem('moonbase_color_mode') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } })(),
  sceneMotion: (() => { try { return localStorage.getItem('moonbase_scene_motion') !== 'off'; } catch { return true; } })(),
  setColorMode: (colorMode) => { try { localStorage.setItem('moonbase_color_mode', colorMode); } catch { /* Session preference. */ } set({colorMode}); },
  setSceneMotion: (sceneMotion) => { try { localStorage.setItem('moonbase_scene_motion', sceneMotion ? 'on' : 'off'); } catch { /* Session preference. */ } set({sceneMotion}); },
  uiTheme: initialTheme(),
  viewMode: "perspective",
  setUiTheme: (theme) => {
    try {
      localStorage.setItem("moonbase_ui_theme", theme);
    } catch {
      /* Session-only preference if storage is unavailable. */
    }
    set({ uiTheme: theme });
  },
  setViewMode: (viewMode) => set({ viewMode }),
  appMode: "simulation",
  environment: "lunar",
  robots: [
    {
      id: "bot-01",
      type: "humanoid",
      mode: "simulation",
      position: [0, 0, 0],
      battery: 100,
      status: "active",
      temperature: 30,
      assignedTasks: ["Autonomous obstacle navigation (elbow-v1)"],
    },
    {
      id: "carter-01",
      type: "amr",
      mode: "simulation",
      position: [-2, 0, -1.6],
      battery: 94,
      status: "idle",
      temperature: 28,
      assignedTasks: ["Standby / Logistics perimeter"],
    },
    {
      id: "go2-01",
      type: "quadruped",
      mode: "simulation",
      position: [-2, 0, 1.2],
      battery: 89,
      status: "idle",
      temperature: 31,
      assignedTasks: ["Standby / Terrain inspection"],
    },
  ],
  selectedRobotId: "bot-01",
  setAppMode: (mode) => set({ appMode: mode }),
  setEnvironment: (env) => set({ environment: env }),
  addRobot: (robot) => set((state) => ({ robots: [...state.robots, robot] })),
  removeRobot: (id) =>
    set((state) => ({
      robots: state.robots.filter((r) => r.id !== id),
      selectedRobotId:
        state.selectedRobotId === id ? null : state.selectedRobotId,
    })),
  updateRobotPosition: (id, position) =>
    set((state) => ({
      robots: state.robots.map((r) => (r.id === id ? { ...r, position } : r)),
    })),
  updateRobotTarget: (id, targetPosition) =>
    set((state) => ({
      robots: state.robots.map((r) =>
        r.id === id ? { ...r, targetPosition } : r,
      ),
    })),
  updateRobotJoints: (id, joints) =>
    set((state) => ({
      robots: state.robots.map((r) => (r.id === id ? { ...r, joints } : r)),
    })),
  updateRobotDynamics: (id, efforts, velocities) =>
    set((state) => ({
      robots: state.robots.map((r) =>
        r.id === id ? { ...r, efforts, velocities } : r,
      ),
    })),
  selectRobot: (id) => set({ selectedRobotId: id }),
  updateRobotStatus: (id, status) =>
    set((state) => ({
      robots: state.robots.map((r) => (r.id === id ? { ...r, status } : r)),
    })),
  addRobotTask: (id, task) =>
    set((state) => ({
      robots: state.robots.map((r) =>
        r.id === id ? { ...r, assignedTasks: [...r.assignedTasks, task] } : r,
      ),
    })),
  dispatchCommand: (id, cmd) => {
    const lowerCmd = cmd.toLowerCase();
    let target: [number, number, number] | undefined = undefined;
    let taskText = `Executing: ${cmd}`;

    // Simple NLP semantic parsing for landmarks
    if (lowerCmd.includes("conveyor")) {
      target = [10, 0, -10];
      taskText = "Navigating to conveyor belt...";
    } else if (lowerCmd.includes("shelf")) {
      target = [-15, 0, -10];
      taskText = "Navigating to factory shelf...";
    } else if (lowerCmd.includes("hut")) {
      target = [-12, 0, 15];
      taskText = "Navigating to lunar hut...";
    } else if (lowerCmd.includes("rocket")) {
      target = [18, 0, 15];
      taskText = "Navigating to rocket...";
    } else {
      // Parse coordinates if explicit, e.g., "move to 10, -5"
      const match = lowerCmd.match(/(-?\d+)\s*,\s*(-?\d+)/);
      if (match) {
        target = [parseInt(match[1]), 0, parseInt(match[2])];
        taskText = `Moving to coordinates [${target[0]}, ${target[2]}]`;
      }
    }

    if (target) {
      get().updateRobotTarget(id, target);
      get().updateRobotStatus(id, "active");
    }

    get().addRobotTask(id, taskText);
  },
}));
