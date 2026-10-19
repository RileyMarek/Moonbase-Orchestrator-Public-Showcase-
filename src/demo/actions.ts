import { useAppStore, type Robot } from '../store';
import { demoCourse, useDemoState } from './state';
import type { MissionStep } from '../domain/types';

/** Local UI simulator only. No transport, controller, inference, or robot dispatch. */
export async function demoAction(path: string, input: object = {}): Promise<unknown> {
  const body = input as Record<string, unknown>;
  const state = useDemoState.getState();
  if (path === '/stop' || path === '/cancel') {
    useDemoState.setState({ paused: true, mission: state.mission ? { ...state.mission, state: 'canceled' } : undefined });
    return { demo: true };
  }
  if (path === '/mission/pause') {
    useDemoState.setState({ paused: true, mission: state.mission ? { ...state.mission, state: 'held' } : undefined });
    return { demo: true };
  }
  if (path === '/mission/resume') {
    useDemoState.setState({ paused: false, mission: state.mission ? { ...state.mission, state: 'running' } : undefined });
    return { demo: true };
  }
  if (path === '/mission/plan') {
    const plan = { id: crypto.randomUUID(), objective: String(body.task || 'Demo route'),
      steps: structuredClone(demoCourse.steps), verification: 'Scripted demo route. No VLM inference or obstacle avoidance is performed.' };
    useDemoState.setState({ plan }); return plan;
  }
  if (path === '/mission' || path === '/mission/execute-plan') {
    const steps = path === '/mission' ? body.steps as MissionStep[] : state.plan?.steps;
    if (!steps?.length) throw new Error('Add a demo sequence first');
    useDemoState.setState({ paused: false, missionStarted: state.time,
      missionRobotId: useAppStore.getState().selectedRobotId || 'bot-01',
      mission: { id: String(body.id || crypto.randomUUID()), objective: state.plan?.objective,
        state: 'running', steps: steps.map(command => ({ command, state: 'pending' })) } });
    return { demo: true };
  }
  if (path === '/course') { useDemoState.setState({ courseLoaded: body.loaded === true }); return { demo: true }; }
  if (path === '/brain/provider') { useDemoState.setState({ provider: String(body.provider) }); return { demo: true }; }
  if (path === '/bookmarks/save') {
    const name = String(body.name || '').trim();
    if (!name || name.length > 40 || /^(?:__proto__|constructor|prototype)$/.test(name)) throw new Error('Choose a valid location name');
    const robot = useAppStore.getState().robots.find(r => r.id === useAppStore.getState().selectedRobotId);
    const pose = body.pose as number[] | undefined || [robot?.position[2] || 0, robot?.position[0] || 0, 0];
    if (pose.length !== 3 || pose.some(v => !Number.isFinite(v))) throw new Error('Invalid demo pose');
    const bookmarks = { ...state.bookmarks, items: { ...state.bookmarks.items,
      [name]: { label: name, pose, visual_target: String(body.visual_target || ''), available: true, reason: '' } } };
    useDemoState.setState({ bookmarks }); return bookmarks;
  }
  if (path === '/fleet/spawn') {
    const app = useAppStore.getState(), id = String(body.robot_id || '');
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(id) || app.robots.some(r => r.id === id) || app.robots.length >= 8) throw new Error('Choose a unique demo ID (maximum 8 agents)');
    const pose = body.initial_pose as {x:number;y:number;yaw:number};
    if (![pose?.x,pose?.y,pose?.yaw].every(Number.isFinite)) throw new Error('Invalid demo spawn');
    const type: Robot['type'] = body.embodiment_type === 'quadruped' ? 'quadruped' : body.embodiment_type === 'humanoid' ? 'humanoid' : 'amr';
    app.addRobot({ id, type, mode: 'simulation', position: [pose.y,0,pose.x], battery: 100,
      temperature: 30, assignedTasks: ['Browser-only demo'], status: 'idle' });
    return { demo: true };
  }
  throw new Error('Unavailable in the public demo. No live services or model inference are connected.');
}
