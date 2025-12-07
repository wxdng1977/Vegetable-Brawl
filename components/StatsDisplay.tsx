import React from 'react';
import { VegetableStats } from '../types';

interface StatsDisplayProps {
  stats: VegetableStats;
  compact?: boolean;
}

const StatBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
  <div className="flex items-center gap-2 mb-1">
    <span className="text-xs font-bold uppercase w-8 text-right text-gray-300">{label}</span>
    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full ${color}`} 
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      ></div>
    </div>
    <span className="text-xs font-mono w-6 text-right">{value}</span>
  </div>
);

export const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats, compact }) => {
  return (
    <div className={`bg-black/30 p-2 rounded-lg backdrop-blur-sm ${compact ? 'text-xs' : 'text-sm'}`}>
      <StatBar label="攻击" value={stats.attack} max={60} color="bg-red-500" />
      <StatBar label="防御" value={stats.defense} max={40} color="bg-blue-500" />
      <StatBar label="速度" value={stats.speed} max={30} color="bg-yellow-400" />
    </div>
  );
};