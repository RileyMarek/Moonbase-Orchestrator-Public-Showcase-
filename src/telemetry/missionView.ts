/** Author: Riley Marek. Project: Moonbase. Date: 2026-09-29.
 * Normalize ROS states and world-frame labels for the command graph. */
import type { MissionStep } from '../domain/types';
export function commandStatus(state:string):'completed'|'pending'|'running'|'stopped'{
  if(state==='succeeded')return 'completed';
  if(state==='running'||state==='executing')return 'running';
  if(['canceled','canceling','stopped','failed','aborted','timed_out','skipped'].includes(state))return 'stopped';
  return 'pending';
}
export function describeCommand(command:MissionStep):string{
  if(command.kind==='observe')return command.expected_pose?'Verify final pose and camera':'Fresh world pose';
  if(command.kind==='inspect')return `Verify ${command.target_object || command.landmark || 'visual target'}${command.landmark?` · ${command.landmark}`:''}`;
  if(command.kind==='wait')return `Wait ${command.seconds}s`;
  if(command.kind==='walk')return `Target ${command.x?.toFixed(1)}, ${command.y?.toFixed(1)} m`;
  return `Heading ${Math.round((command.yaw||0)*180/Math.PI)}°`;
}
