import type { ControlSnapshot } from '../hooks/useRobotControl';

/** A finished run may be repeated; unknown HTTP outcomes retain their retry ID. */
export function nextSequenceId(requestId: string | undefined, mission: ControlSnapshot['mission'], freshId: () => string): string {
  const finished = mission && !['idle', 'running', 'canceling'].includes(mission.state);
  return requestId && !(mission?.id === requestId && finished) ? requestId : freshId();
}

export function sequenceBlocker(snapshot: ControlSnapshot | null, enabled: boolean, pending: boolean, count: number, courseId: string | null): string {
  if (!enabled) return 'Switch to Simulation to command Isaac.';
  if (!snapshot) return 'Action server offline. Start the ROS action service.';
  if (!snapshot.runtimeFresh) return 'Isaac telemetry is stale. Start or resume Isaac with -ActionControl.';
  if (!snapshot.ready) return 'Robot is not ready for action control. Check Isaac control mode and ROS odometry.';
  if (pending) return 'Waiting for the action server to acknowledge the request.';
  if (['observing','inference','validating','executing'].includes(snapshot.agent?.state || '')) return 'Agent owns the robot. Cancel the agent task before running a manual sequence.';
  if (['running', 'canceling'].includes(snapshot.mission?.state || '')) return 'Wait for the current sequence to finish, or cancel it.';
  if (snapshot.scenePending) return 'Waiting for the obstacle course change to finish.';
  if (snapshot.busy) return 'Robot is executing another action. Wait or stop motion.';
  if (!count) return 'Add a command or load a course to create a sequence.';
  if (courseId && snapshot.course?.id !== courseId) return 'Reload the obstacle course required by this draft.';
  return '';
}
