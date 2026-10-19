import { useAppStore, type Robot } from '../store';
import { demoCourse, useDemoState } from './state';
import type { MissionStep } from '../domain/types';
import { planDemoTask, validateDemoSteps } from './planner';
import { clearanceIssue, routeIssue } from './clearance';
import { currentDemoBodies } from './fleet';
import { removeRobotFrames } from '../telemetry/jointStream';
import { removeVoxelStream } from '../telemetry/voxelStream';

/** Local UI simulator only. No transport, controller, inference, or robot dispatch. */
export async function demoAction(path: string, input: object = {}): Promise<unknown> {
  const body = input as Record<string, unknown>;
  const state = useDemoState.getState();
  if (path === '/stop' || path === '/cancel') {
    useDemoState.setState({ paused: true, blocked:null, mission: state.mission ? { ...state.mission, state: 'canceled' } : undefined });
    return { demo: true };
  }
  if (path === '/mission/pause') {
    useDemoState.setState({ paused: true, mission: state.mission ? { ...state.mission, state: 'held' } : undefined });
    return { demo: true };
  }
  if (path === '/mission/resume') {
    const fleet=currentDemoBodies(),owner=fleet.find(r=>r.id===state.missionRobotId);
    if(!state.mission||!owner)throw new Error('No remaining robot mission to resume');
    const issue=routeIssue(owner,state.mission.steps.filter(s=>s.state!=='succeeded').map(s=>s.command),fleet);
    if(issue)throw new Error(issue);
    useDemoState.setState({ paused: false, blocked:null, mission: { ...state.mission, state: 'running' } });
    return { demo: true };
  }
  if (path === '/mission/plan') {
    const robot = useAppStore.getState().robots.find(r => r.id === useAppStore.getState().selectedRobotId);
    const pose = state.motion[robot?.id || ''] || { x: robot?.position[2] || 0, y: robot?.position[0] || 0, yaw: 0, speed: 0 };
    const plan = { id: crypto.randomUUID(), objective: String(body.task || 'Demo route'),
      steps: planDemoTask(String(body.task || ''), state.bookmarks, pose), verification: 'Local demo command parser with body-clearance checks. Blocked routes require different waypoints; no VLM inference or automatic rerouting.' };
    useDemoState.setState({ plan }); return plan;
  }
  if (path === '/mission' || path === '/mission/execute-plan') {
    if (state.mission && ['running','held'].includes(state.mission.state)) throw new Error('Finish or cancel the active demo mission first');
    if (path === '/mission/execute-plan' && body.plan_id !== state.plan?.id) throw new Error('Draft the instruction again before running it');
    const steps = path === '/mission' ? body.steps as MissionStep[] : state.plan?.steps;
    if (!steps?.length) throw new Error('Add a demo sequence first');
    const validated = validateDemoSteps(steps);
    const fleet=currentDemoBodies(),owner=fleet.find(r=>r.id===useAppStore.getState().selectedRobotId);
    if(!owner)throw new Error('Select a robot before starting a mission');
    const issue=routeIssue(owner,validated,fleet);
    if(issue)throw new Error(issue);
    useDemoState.setState({ paused: false, blocked:null, missionStarted: state.time,
      missionRobotId: owner.id,
      mission: { id: String(body.id || crypto.randomUUID()), objective: state.plan?.objective,
        state: 'running', steps: validated.map(command => ({ command, state: 'pending' })) } });
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
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(id) || Object.hasOwn(Object.prototype,id) || app.robots.some(r => r.id === id) || app.robots.length >= 8) throw new Error('Choose a unique demo ID (maximum 8 agents)');
    const pose = body.initial_pose as {x:number;y:number;yaw:number};
    if (![pose?.x,pose?.y,pose?.yaw].every(Number.isFinite)) throw new Error('Spawn bot in a valid location: use finite world coordinates.');
    if(!['quadruped','humanoid','wheeled_amr'].includes(String(body.embodiment_type)))throw new Error('Choose an available demo embodiment');
    const type: Robot['type'] = body.embodiment_type === 'quadruped' ? 'quadruped' : body.embodiment_type === 'humanoid' ? 'humanoid' : 'amr';
    const issue=clearanceIssue({id,type,x:pose.x,y:pose.y},pose,pose,currentDemoBodies());
    if(issue)throw new Error(`Spawn bot in a valid location: ${issue}`);
    const generation=state.generationCounter+1;
    useDemoState.setState({motion:{...state.motion,[id]:{x:pose.x,y:pose.y,yaw:pose.yaw,speed:0}},generations:{...state.generations,[id]:generation},generationCounter:generation});
    app.addRobot({ id, type, mode: 'simulation', position: [pose.y,0,pose.x], battery: 100,
      temperature: 30, assignedTasks: ['Browser-only demo'], status: 'idle' });
    return { demo: true };
  }
  if(path==='/fleet/delete') {
    const app=useAppStore.getState(),id=String(body.robot_id||'');
    const robot=app.robots.find(r=>r.id===id&&r.mode==='simulation');
    if(!robot)throw new Error('Demo robot was already removed');
    const ownsMission=state.missionRobotId===id&&!!state.mission;
    const motion={...state.motion};delete motion[id];
    const generations={...state.generations};delete generations[id];
    useDemoState.setState({motion,generations,
      ...(ownsMission?{mission:{...state.mission!,state:'canceled'},paused:false}:{}),
      ...(state.blocked?.robotId===id?{blocked:null}:{})});
    removeRobotFrames(id);removeVoxelStream(id);
    app.removeRobot(id);
    if(app.selectedRobotId===id)useAppStore.getState().selectRobot(useAppStore.getState().robots.find(r=>r.mode==='simulation')?.id||null);
    return {demo:true,message:`Deleted ${id}.${ownsMission?' Its mission was canceled.':''}`};
  }
  if (path === '/perception/preview') {
    const preview = {
      id: crypto.randomUUID(),
      state: 'complete',
      model_id: 'molmo-7b-d-0924',
      total_sec: 0.42,
      inference_sec: 0.38,
      historical_only: false,
      points: [
        { image: [0.52, 0.65], world: [1.85, 0.45], clearance: true, reason: 'Traversable corridor floor' },
        { image: [0.68, 0.58], world: [2.10, 0.82], clearance: true, reason: 'Candidate waypoint' },
        { image: [0.35, 0.42], world: [0.95, -0.60], clearance: false, reason: 'Obstacle boundary clearance rejected' }
      ],
      motion_dispatched: false,
    };
    useDemoState.setState({ preview });
    return preview;
  }
  throw new Error('Unavailable in the public demo. No live services or model inference are connected.');
}
