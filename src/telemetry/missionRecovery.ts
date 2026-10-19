import type { MissionSnapshot } from '../domain/types';

/** Repeating Go retries the saved destination; canceled runs require a new plan. */
export function shouldResumeMission(mission: MissionSnapshot | undefined, objective: string): boolean {
  return !!mission?.id && !!objective.trim() && mission.objective?.trim() === objective.trim()
    && ['failed', 'interrupted'].includes(mission.state);
}
