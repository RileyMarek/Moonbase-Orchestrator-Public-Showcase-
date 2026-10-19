/**
 * Author: Riley Marek
 * Project: Project Moonbase
 * File: Header.tsx
 * Description: Top navigation and mode toggle switch.
 * Date: 2026-09-08
 */

import React from 'react';

import { Bot, Radio, Moon, Factory } from 'lucide-react';

import { useAppStore } from '../store';

/**
 * Name: Header
 * Description: Top navigation bar containing the application title and the Simulation/Physical mode toggle.
 */
export const Header: React.FC = () => {
  const { appMode, setAppMode, environment, setEnvironment } = useAppStore();

  return (
    <header className="absolute top-0 left-0 right-0 h-16 bg-gray-900/80 backdrop-blur border-b border-gray-800 flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded overflow-hidden flex items-center justify-center border border-indigo-500/50">
          <img src="/logo.jpg" alt="Moonbase Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-xl font-bold tracking-wider text-gray-100">MOONBASE</h1>
      </div>

      <div className="flex items-center gap-4">
        {appMode === 'simulation' && (
          <div className="flex items-center gap-2 bg-gray-950 rounded-full p-1 border border-gray-800">
            <button
              onClick={() => setEnvironment('lunar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                environment === 'lunar' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Moon className="w-4 h-4" />
              Lunar
            </button>
            <button
              onClick={() => setEnvironment('factory')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                environment === 'factory' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Factory className="w-4 h-4" />
              Factory
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 bg-gray-950 rounded-full p-1 border border-gray-800">
          <button
            onClick={() => setAppMode('simulation')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              appMode === 'simulation' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            Simulation
          </button>
          <button
            onClick={() => setAppMode('physical')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              appMode === 'physical' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            Physical
          </button>
        </div>
      </div>
    </header>
  );
};
