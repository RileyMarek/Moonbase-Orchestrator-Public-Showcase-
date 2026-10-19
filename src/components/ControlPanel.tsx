/**
 * Author: Riley Marek
 * Project: Project Moonbase
 * File: ControlPanel.tsx
 * Description: Inspector and control dispatcher for a selected agent.
 * Date: 2026-09-08
 */

import React from 'react';

import { Settings, AlertOctagon, Terminal, Trash2 } from 'lucide-react';

import { useAppStore } from '../store';

/**
 * Name: ControlPanel
 * Description: Renders telemetry details, task history, and command dispatch actions (Move, E-STOP) for the currently selected robot.
 */
export const ControlPanel: React.FC = () => {
  const robots = useAppStore(state => state.robots);
  const selectedRobotId = useAppStore(state => state.selectedRobotId);
  const appMode = useAppStore(state => state.appMode);
  
  const updateRobotStatus = useAppStore(state => state.updateRobotStatus);
  const addRobotTask = useAppStore(state => state.addRobotTask);
  const dispatchCommand = useAppStore(state => state.dispatchCommand);
  const removeRobot = useAppStore(state => state.removeRobot);
  const updateRobotTarget = useAppStore(state => state.updateRobotTarget);
  
  const robot = robots.find(r => r.id === selectedRobotId);

  if (!robot || robot.mode !== appMode) return null;

  /**
   * Name: handleEStop
   * Description: Pushes an emergency stop command to the robot's task list and marks its status as error.
   */
  const handleEStop = () => {
    addRobotTask(robot.id, 'EMERGENCY STOP ENGAGED');
    updateRobotTarget(robot.id, undefined); // halt movement
    updateRobotStatus(robot.id, 'error');
  };

  /**
   * Name: handleCommandSubmit
   * Description: Form submit handler that pushes a new text command to the robot's task list.
   */
  const handleCommandSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cmd = formData.get('command') as string;
    if (cmd && cmd.trim()) {
      dispatchCommand(robot.id, cmd.trim());
      e.currentTarget.reset();
    }
  };

  return (
    <div className="absolute bottom-6 right-6 w-96 bg-gray-900/90 backdrop-blur border border-gray-800 rounded-xl shadow-2xl flex flex-col z-10 overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-950/50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-100">{robot.id}</h2>
          <p className="text-xs text-gray-400 capitalize">{robot.type} • {appMode}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => removeRobot(robot.id)}
            className="p-1.5 bg-gray-800 hover:bg-red-900/50 hover:text-red-400 rounded text-gray-300 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Diagnostics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
            <span className="text-xs text-gray-500 block mb-1">Temperature</span>
            <span className="text-xl text-gray-200">{robot.temperature}°C</span>
          </div>
          <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
            <span className="text-xs text-gray-500 block mb-1">Location (x,z)</span>
            <span className="text-lg text-gray-200">{robot.position[0].toFixed(1)}, {robot.position[2].toFixed(1)}</span>
          </div>
        </div>

        {/* Latest Joint Data (freshness is shown in the connection banner) */}
        {robot.joints && Object.keys(robot.joints).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Latest Joint Telemetry ({Object.keys(robot.joints).length})
            </h3>
            <div className="bg-gray-950 rounded-lg p-2 border border-gray-800 min-h-16 max-h-32 overflow-y-auto text-xs grid grid-cols-2 gap-x-2 gap-y-1">
              {Object.entries(robot.joints).map(([name, pos]) => (
                <div key={name} className="flex justify-between border-b border-gray-800/50 pb-0.5">
                  <span className="text-gray-400 truncate pr-2">{name.replace('panda_', '').replace('_joint', '')}</span>
                  <span className="text-cyan-400 font-mono">{pos.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task History */}
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Active Tasks</h3>
          <div className="bg-gray-950 rounded-lg p-2 border border-gray-800 min-h-16 max-h-32 overflow-y-auto text-sm">
            {robot.assignedTasks.length > 0 ? (
              <ul className="space-y-1">
                {robot.assignedTasks.map((t, i) => <li key={i} className="text-gray-300 flex items-center gap-2"><Terminal className="w-3 h-3 text-cyan-500 shrink-0"/> <span className="truncate">{t}</span></li>)}
              </ul>
            ) : (
              <span className="text-gray-500">No active tasks</span>
            )}
          </div>
        </div>

        {/* Command Dispatcher */}
        <div className="pt-2 border-t border-gray-800">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Command Dispatcher</h3>
          <form 
            onSubmit={handleCommandSubmit}
            className="flex gap-2 mb-2"
          >
            <input 
              name="command"
              type="text" 
              placeholder="e.g. 'move to 10, -5', 'pickup crate'" 
              className="flex-1 bg-gray-950 border border-gray-700 rounded-md py-1.5 px-3 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition">
              Send
            </button>
          </form>
          <button onClick={handleEStop} className="w-full flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white py-2 rounded-lg text-sm font-medium border border-red-800 transition">
            <AlertOctagon className="w-4 h-4" /> E-STOP
          </button>
        </div>
      </div>
    </div>
  );
};
