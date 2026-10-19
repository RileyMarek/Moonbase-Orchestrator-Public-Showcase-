/**
 * Author: Riley Marek
 * Project: Project Moonbase
 * File: SimControls.tsx
 * Description: Widget for spawning simulated agents in the environment.
 * Date: 2026-09-08
 */

import React from 'react';

import { Plus } from 'lucide-react';

import { useAppStore } from '../store';
import type { Robot } from '../store';

/**
 * Name: SimControls
 * Description: UI widget for spawning various virtual robots (humanoids, quadrupeds, AMRs) in Simulation Mode.
 */
export const SimControls: React.FC = () => {
  const appMode = useAppStore(state => state.appMode);
  const addRobot = useAppStore(state => state.addRobot);

  if (appMode !== 'simulation') return null;

  const handleSpawn = (type: 'humanoid' | 'quadruped' | 'amr', variant?: 'flat' | 'arm') => {
    const newRobot: Robot = {
      id: `${type.toUpperCase()}${variant ? `-${variant.toUpperCase()}` : ''}-${Math.floor(Math.random() * 1000)}`,
      type,
      amrVariant: variant,
      mode: 'simulation',
      position: [(Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10],
      battery: 100,
      status: 'idle',
      temperature: 30,
      assignedTasks: ['Awaiting instructions']
    };
    addRobot(newRobot);
  };

  return (
    <div className="absolute top-20 right-6 bg-gray-900/80 backdrop-blur border border-gray-800 p-4 rounded-xl shadow-lg z-10">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sim Spawner</h3>
      <div className="flex flex-col gap-2">
        <button onClick={() => handleSpawn('humanoid')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-200 transition">
          <Plus className="w-4 h-4 text-cyan-500" /> Humanoid
        </button>
        <button onClick={() => handleSpawn('quadruped')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-200 transition">
          <Plus className="w-4 h-4 text-cyan-500" /> Quadruped
        </button>
        <div className="border-t border-gray-700 my-1"></div>
        <button onClick={() => handleSpawn('amr', 'flat')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-200 transition">
          <Plus className="w-4 h-4 text-cyan-500" /> AMR (Flat)
        </button>
        <button onClick={() => handleSpawn('amr', 'arm')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-200 transition">
          <Plus className="w-4 h-4 text-cyan-500" /> AMR (Arm)
        </button>
      </div>
    </div>
  );
};
