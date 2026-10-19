/** Wire contracts shared by runtime and presentation; no component imports. */
export interface MissionStep {
    kind: "observe" | "walk" | "turn" | "inspect" | "wait";
    landmark?: string | null;
    target_object?: string;
    seconds?: number;
    global_route?: boolean;
    demo_detour?: boolean;
    expected_pose?:number[];
  x?: number;
  y?: number;
  yaw?: number;
  tolerance?: number;
  timeout_sec?: number;
}
export interface Course {
  id: string;
  name: string;
  description: string;
  obstacles: {
    id: string;
    center: [number, number, number];
    size: [number, number, number];
  }[];
  steps: MissionStep[];
}
export interface MissionSnapshot {
    objective?:string;
    planning?:{provider:string;model_id:string};
  id: string | null;
  state: string;
  steps: {
    command: MissionStep;
    state: string;
    result?: { message: string; pose?: number[];remaining_m?:number;heading_error_rad?:number;frame_age_s?:number;goal_verified?:boolean;visual_verified?:boolean;visual?:{status:string;model_id?:string;inference_sec?:number;observation_id?:string} };
  }[];
}
