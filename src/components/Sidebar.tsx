/**
 * Author: Riley Marek
 * Project: Project Moonbase
 * File: Sidebar.tsx
 * Description: Robot fleet list and basic telemetry summaries.
 * Date: 2026-09-08
 */

import React, { useState } from 'react';

import { Activity, Battery, Search } from 'lucide-react';

import { useAppStore } from '../store';

/**
 * Name: Sidebar
 * Description: Displays a filterable list of active entities (robots), showing their basic status and battery levels.
 */
export const Sidebar: React.FC = () => {
  const robots = useAppStore(state => state.robots);
  const selectedRobotId = useAppStore(state => state.selectedRobotId);
  const selectRobot = useAppStore(state => state.selectRobot);
  const appMode = useAppStore(state => state.appMode);
  const [filterQuery, setFilterQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredRobots = robots.filter(robot => {
    if (robot.mode !== appMode) return false;
    const matchesQuery = robot.id.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesType = filterType === 'all' || robot.type === filterType;
    return matchesQuery && matchesType;
  });

  return (
    <div className="absolute top-16 left-0 bottom-0 w-80 bg-gray-900/80 backdrop-blur border-r border-gray-800 flex flex-col z-10">
      <div className="p-4 border-b border-gray-800 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
          <span>Fleet Status</span>
          <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">{filteredRobots.length}</span>
        </h2>
        
        {/* Filtering Controls */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search ID..." 
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-md py-1.5 pl-9 pr-3 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div className="flex gap-1 bg-gray-950 p-1 rounded-md border border-gray-800">
            {['all', 'humanoid', 'quadruped', 'amr'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex-1 text-[10px] uppercase font-bold py-1 rounded transition-colors ${
                  filterType === type ? 'bg-gray-800 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredRobots.length === 0 && (
          <div className="text-center p-8 text-gray-500 text-sm">
            {robots.length === 0 ? 'No robots deployed in this environment.' : 'No robots match current filters.'}
          </div>
        )}
        {filteredRobots.map(robot => (
          <div 
            key={robot.id}
            onClick={() => selectRobot(robot.id)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedRobotId === robot.id 
                ? 'bg-gray-800 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                : 'bg-gray-950/50 border-gray-800 hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-200">{robot.id}</span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                robot.status === 'active' ? 'bg-green-500/20 text-green-400' :
                robot.status === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {robot.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Battery className="w-3 h-3" />
                <span>{robot.battery}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span className="capitalize">{robot.type}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
