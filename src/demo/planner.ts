import type { MissionStep } from '../domain/types';
import type { BookmarkList } from '../hooks/usePoseBookmarks';
import type { DemoPose } from './motion';

export function validateDemoSteps(steps: MissionStep[]) {
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > 32) throw new Error('Use 1–32 demo steps');
  for (const step of steps) {
    if (!['walk','turn','observe','inspect','wait'].includes(step.kind)) throw new Error('Unsupported demo step');
    if (step.kind === 'walk' && (![step.x,step.y].every(Number.isFinite) || Math.abs(step.x!) > 7 || Math.abs(step.y!) > 7)) throw new Error('Demo waypoints must be finite and inside ±7 m');
    if (step.kind === 'turn' && !Number.isFinite(step.yaw)) throw new Error('Use a finite heading');
    if (step.kind === 'wait' && (!Number.isFinite(step.seconds) || step.seconds! < 0 || step.seconds! > 60)) throw new Error('Wait for 0–60 seconds');
  }
  return structuredClone(steps);
}

/** Deliberately small command grammar. No language model, service, or hidden fallback. */
export function planDemoTask(task: string, bookmarks: BookmarkList, start: DemoPose): MissionStep[] {
  const steps: MissionStep[] = [], cursor = { ...start };
  for (const clause of task.toLowerCase().split(/\s*(?:\bthen\b|\band\b|;|,\s*(?=[a-z]))\s*/).filter(Boolean)) {
    const coordinates = clause.match(/(?:go|move|walk|navigate)(?:\s+to)?\s*\(?(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)?/);
    const relative = clause.match(/(?:move|walk|go)\s+(forward|back(?:ward)?|left|right)\s+(\d+(?:\.\d+)?)\s*(?:m|meters?|metres?)\b/);
    const turn = clause.match(/turn\s+(left|right)\s+(\d+(?:\.\d+)?)\s*(?:degrees?|deg)?/);
    const wait = clause.match(/wait\s+(\d+(?:\.\d+)?)\s*(?:s|seconds?)\b/);
    const location = Object.entries(bookmarks.items).find(([key, value]) => value.available && [key,value.label].some(name => {
      const escaped = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      return new RegExp(`\\b${escaped}\\b`).test(clause);
    }));
    if (coordinates) {
      cursor.yaw=Math.atan2(Number(coordinates[2])-cursor.y,Number(coordinates[1])-cursor.x);
      cursor.x=Number(coordinates[1]); cursor.y=Number(coordinates[2]);
      steps.push({kind:'walk',x:cursor.x,y:cursor.y});
    } else if (relative) {
      const offset = relative[1].startsWith('back') ? Math.PI : relative[1] === 'left' ? Math.PI/2 : relative[1] === 'right' ? -Math.PI/2 : 0;
      cursor.x+=Math.cos(cursor.yaw+offset)*Number(relative[2]);cursor.y+=Math.sin(cursor.yaw+offset)*Number(relative[2]);
      cursor.yaw+=offset;
      steps.push({kind:'walk',x:cursor.x,y:cursor.y});
    } else if (turn) {
      cursor.yaw+=(turn[1]==='left'?1:-1)*Number(turn[2])*Math.PI/180;
      steps.push({kind:'turn',yaw:cursor.yaw});
    } else if (wait) steps.push({kind:'wait',seconds:Number(wait[1])});
    else if (/\binspect\b/.test(clause)) steps.push({kind:'inspect',landmark:location?.[0] || 'demo camera'});
    else if (/\bobserve\b/.test(clause)) steps.push({kind:'observe'});
    else if (location && /\b(?:go|visit|return|walk|move|navigate)\b/.test(clause)) {
      [cursor.x,cursor.y,cursor.yaw]=location[1].pose;
      steps.push({kind:'walk',x:cursor.x,y:cursor.y},{kind:'turn',yaw:cursor.yaw});
    } else throw new Error('Demo commands: “go to Terminal then return Home”, “move to 1, 2”, or “move forward 1 m”. No live AI is connected.');
  }
  return validateDemoSteps(steps);
}
