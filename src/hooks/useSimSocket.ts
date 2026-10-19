import { FLOOR_Y } from '../demo/grounding';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { sampleDemo, demoVoxelSnapshot } from '../telemetry/demoMockStream';
import { publishJointFrame, publishPoseFrame, setJointConnection, removeRobotFrames } from '../telemetry/jointStream';
import { voxelStream, clearVoxelStreams, removeVoxelStream } from '../telemetry/voxelStream';
import { useDemoState } from '../demo/state';
import { advanceCheckedMission, type DemoPose } from '../demo/motion';
import type { MissionSnapshot } from '../domain/types';

export type TelemetryStatus = 'connecting'|'waiting'|'live'|'stale'|'disconnected'|'disabled';

export function useSimSocket() {
  const appMode=useAppStore(s=>s.appMode);
  const [messages,setMessages]=useState(0);
  useEffect(()=>{
    if(appMode!=='simulation'){clearVoxelStreams();setJointConnection('disabled');return;}
    setJointConnection('waiting');
    const poses:Record<string,DemoPose>={...useDemoState.getState().motion};
    const voxelBytes=demoVoxelSnapshot(), neutral=sampleDemo(0);
    const heldJoints:Record<string,Record<string,number>>={};
    const generations:Record<string,number>={};
    let raf=0, last=performance.now(), lastUI=-Infinity, time=useDemoState.getState().time;
    let missionId:string|null=null, stepElapsed=0;
    // Preserve the initial H1 showcase patrol until the visitor issues a mission.
    let patrol:MissionSnapshot={id:'patrol',state:'running',steps:[
      {command:{kind:'walk',x:1.9,y:0},state:'pending'},
      {command:{kind:'walk',x:1.9,y:2.1},state:'pending'},
      {command:{kind:'walk',x:1.9,y:0},state:'pending'},
      {command:{kind:'walk',x:0,y:0},state:'pending'},
    ]};
    let patrolElapsed=0,patrolEnabled=true;
    function tick(now:number){
      const dt=Math.min(Math.max((now-last)/1000,0),.1);last=now;
      const state=useDemoState.getState(), app=useAppStore.getState();
      if(!state.paused)time+=dt;
      const robots=app.robots.filter(r=>r.mode==='simulation');
      for(const id of Object.keys(poses))if(!robots.some(r=>r.id===id)){
        if(id==='bot-01')patrolEnabled=false;
        delete poses[id];delete heldJoints[id];delete generations[id];removeRobotFrames(id);removeVoxelStream(id);
      }
      for(const robot of robots){
        const generation=state.generations[robot.id]||0;
        if(generations[robot.id]!==generation){
          if(robot.id==='bot-01'&&generations[robot.id]!==undefined)patrolEnabled=false;
          poses[robot.id]=state.motion[robot.id]||{x:robot.position[2],y:robot.position[0],yaw:0,speed:0};
          delete heldJoints[robot.id];generations[robot.id]=generation;
        }
        poses[robot.id]={...poses[robot.id],speed:0};
      }
      const bodies=robots.map(r=>({id:r.id,type:r.type,x:poses[r.id].x,y:poses[r.id].y}));
      let nextMission=state.mission;
      if(nextMission?.id!==missionId){missionId=nextMission?.id || null;stepElapsed=0;}
      const owner=robots.find(r=>r.id===state.missionRobotId);
      if(!state.paused && nextMission?.state==='running' && owner){
        const previous=nextMission;
        const result=advanceCheckedMission(poses[owner.id],nextMission,dt,stepElapsed,bodies.find(b=>b.id===owner.id)!,bodies,owner.type==='amr'?.6:owner.type==='quadruped'?.7:.75);
        poses[owner.id]=result.pose;stepElapsed=result.elapsed;nextMission=result.mission;
        if(result.blocked)useDemoState.setState({mission:nextMission,paused:true,blocked:{robotId:owner.id,message:`Navigation stopped: ${result.blocked} Move/delete the blocker or choose another waypoint.`}});
        else if(result.rerouted||previous.state!==nextMission.state || previous.steps.some((s,i)=>s.state!==nextMission!.steps[i]?.state))useDemoState.setState({mission:nextMission});
      }else if(patrolEnabled&&!state.paused && !nextMission && robots.some(r=>r.id==='bot-01')){
        if(patrol.state==='succeeded')patrol={...patrol,state:'running',steps:patrol.steps.map(s=>({...s,state:'pending'}))};
        const result=advanceCheckedMission(poses['bot-01'],patrol,dt,patrolElapsed,bodies.find(b=>b.id==='bot-01')!,bodies,.75);
        poses['bot-01']=result.pose;patrol=result.mission;patrolElapsed=result.elapsed;
        if(result.blocked)useDemoState.setState({paused:true,blocked:{robotId:'bot-01',message:`Patrol stopped: ${result.blocked} Choose a clear waypoint to continue.`}});
      }
      const frame=sampleDemo(time), flush=now-lastUI>=100;
      for(const robot of robots){
        const pose=poses[robot.id], moving=pose.speed>.005;
        const joints:Record<string,number>={};
        const efforts:Record<string,number>={},velocities:Record<string,number>={};
        if(robot.type==='humanoid'){
          Object.assign(joints,frame.joints);
          if(!moving)Object.assign(joints,neutral.joints);
          Object.assign(efforts,moving?frame.efforts:{},velocities,moving?frame.velocities:{});
        }else if(robot.type==='quadruped'){
          const phase=time*7.5;
          for(const [leg,offset] of [['FL',0],['FR',Math.PI],['RL',Math.PI],['RR',0]] as const){
            joints[`${leg}_hip_joint`]=0;
            joints[`${leg}_thigh_joint`]=.8+(moving?.3*Math.sin(phase+offset):0);
            joints[`${leg}_calf_joint`]=-1.5-(moving?.25*Math.sin(phase+offset):0);
          }
          for(const name in joints){efforts[name]=moving?12.5+4*Math.sin(phase):0;velocities[name]=moving?1.2*Math.cos(phase):0;}
        }else{
          joints.left_wheel_joint=time*pose.speed/.139;joints.right_wheel_joint=joints.left_wheel_joint;
          efforts.left_wheel_joint=moving?8.5:0;efforts.right_wheel_joint=efforts.left_wheel_joint;
          velocities.left_wheel_joint=pose.speed/.139;velocities.right_wheel_joint=velocities.left_wheel_joint;
        }
        if(state.paused&&heldJoints[robot.id])Object.assign(joints,heldJoints[robot.id]);
        else heldJoints[robot.id]={...joints};
        publishJointFrame({robotId:robot.id,joints,efforts,velocities,stamp:time},now);
        publishPoseFrame({robotId:robot.id,position:[pose.x,pose.y,FLOOR_Y],orientation:[0,0,Math.sin(pose.yaw/2),Math.cos(pose.yaw/2)],stamp:time},now);
        const stream=voxelStream(robot.id);
        if(!stream.synchronized)stream.accept(voxelBytes);
        stream.receivedAt=now;
        if(flush){app.updateRobotPosition(robot.id,[pose.y,FLOOR_Y,pose.x]);app.updateRobotJoints(robot.id,joints);app.updateRobotDynamics(robot.id,efforts,velocities);}
      }
      if(flush){useDemoState.setState({time,motion:{...poses}});setMessages(n=>(n+robots.length)%100000);lastUI=now;}
      raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(raf);setJointConnection('disconnected');};
  },[appMode]);
  return {status:(appMode==='simulation'?'live':'disabled') as TelemetryStatus,error:null as string|null,messages,close:()=>{}};
}
