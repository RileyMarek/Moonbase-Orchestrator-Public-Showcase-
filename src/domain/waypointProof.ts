export interface ProofStep {
  name: string;
  state: 'pending' | 'running' | 'passed' | 'failed';
  reason?: string;
  speed_m_s?: number;
  age_s?: number;
  error_m?: number;
  inference_sec?: number;
  total_sec?: number;
  observation_id?: string;
  validation_observation_id?: string;
  world?: number[];
  image?: number[];
  target?: number[];
}
export interface WaypointProof {
  provider?: string;
  model_id?: string;
  mock?: boolean;
  id?: string;
  state: 'idle' | 'running' | 'passed' | 'failed' | 'canceled';
  steps: ProofStep[];
  target?: number[];
  origin?: number[];
  trace: {pose: number[]; speed_m_s: number | null; at: number}[];
  motion_dispatched: boolean;
}
export const proofNames = ['Stationary', 'Fresh camera', 'Semantic proposal', 'Waypoint dispatch', 'Arrival & braking', 'Re-observation'];
export function proofMetric(step: ProofStep): string {
  if (step.reason) return step.reason;
  if (step.error_m != null) return `${(step.error_m * 100).toFixed(1)} cm error · ${step.speed_m_s?.toFixed(3)} m/s`;
  if (step.total_sec != null) return `${step.total_sec.toFixed(2)} s round trip`;
  if (step.age_s != null) return `${(step.age_s * 1000).toFixed(0)} ms age`;
  if (step.speed_m_s != null) return `${step.speed_m_s.toFixed(3)} m/s measured`;
  if (step.target) return `(${step.target.slice(0, 2).map(v => v.toFixed(2)).join(', ')}) m`;
  return step.state === 'running' ? 'Collecting evidence…' : step.state === 'passed' ? 'Verified' : 'Awaiting measurement';
}
export function proofComplete(proof?: WaypointProof | null): boolean {
  return proof?.state === 'passed' && proof.motion_dispatched === true && proof.steps.length === 6 && proof.steps.every(step => step.state === 'passed');
}
