import { create } from 'zustand';
import type { MissionSnapshot, MissionStep, Course } from '../domain/types';
import type { BookmarkList } from '../hooks/usePoseBookmarks';
import { OBSTACLES } from '../telemetry/demoMockStream';
import type { DemoPose } from './motion';

export const demoCourse: Course = {
  id: 'elbow-v1', name: 'Elbow course', description: 'Synthetic public demo course',
  obstacles: OBSTACLES.map(b => ({ id: b.id, center: [...b.center], size: [...b.size] })),
  steps: [{ kind: 'observe' }, { kind: 'walk', x: 1.9, y: 0 }, { kind: 'turn', yaw: Math.PI / 2 }, { kind: 'walk', x: 1.9, y: 2.1 }],
};
export const useDemoState = create<{
  time: number; paused: boolean; courseLoaded: boolean; provider: string;
  mission: MissionSnapshot | undefined; missionStarted: number;
  missionRobotId: string; plan: {id:string;objective:string;steps:MissionStep[];verification:string}|null;
  bookmarks: BookmarkList;
  motion: Record<string, DemoPose>;
  preview?: any;
}>(() => ({
  time: 0, paused: false, courseLoaded: false, provider: 'gemini', mission: undefined,
  missionStarted: 0, missionRobotId: 'bot-01', plan: null,
  bookmarks: { revision: 'demo-1', scope: 'browser demo', items: {
    Home: { label: 'Home', pose: [0,0,0], visual_target: '', available: true, reason: '' },
    Terminal: { label: 'Terminal', pose: [1.9,2.1,0], visual_target: 'Synthetic terminal', available: true, reason: '' },
  } },
  preview: undefined,
  motion: {},
}));
