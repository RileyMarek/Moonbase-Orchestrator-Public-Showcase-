import { create } from 'zustand';
import { sampleDemo, demoVoxelSnapshot } from './telemetry/demoMockStream';
import { VoxelStream } from './telemetry/voxelStream';

export const voxels = new VoxelStream();
voxels.accept(demoVoxelSnapshot());
export const fleet = [
  { id: 'bot-01', name: 'H1 Humanoid', state: 'ACTIVE' },
  { id: 'carter-01', name: 'Nova Carter', state: 'STANDBY' },
  { id: 'go2-01', name: 'Unitree Go2', state: 'STANDBY' },
];
export const useDemo = create<{
  frame: ReturnType<typeof sampleDemo>; paused: boolean; selected: string;
  showVoxels: boolean; plan: boolean;
}>(() => ({ frame: sampleDemo(0), paused: false, selected: 'bot-01', showVoxels: true, plan: false }));
