import { useAppStore } from '../store';
import { getPoseFrame } from '../telemetry/jointStream';
import { useDemoState } from './state';
import type { DemoBody } from './clearance';

/** Action validation uses the animation stream rather than a lagging inspector snapshot. */
export function currentDemoBodies(): DemoBody[] {
  const motion=useDemoState.getState().motion;
  return useAppStore.getState().robots.filter(r=>r.mode==='simulation').map(robot=>{
    const frame=getPoseFrame(robot.id);
    return {id:robot.id,type:robot.type,x:frame?.position[0]??motion[robot.id]?.x??robot.position[2],y:frame?.position[1]??motion[robot.id]?.y??robot.position[0]};
  });
}
