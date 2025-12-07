import React, { useEffect, useRef } from 'react';
import { BattleLogEntry } from '../types';

interface BattleLogProps {
  logs: BattleLogEntry[];
}

export const BattleLog: React.FC<BattleLogProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex-1 w-full bg-black/60 rounded-lg p-3 overflow-y-auto no-scrollbar border border-white/10 h-32 md:h-48 text-sm md:text-base font-medium shadow-inner">
      <div className="flex flex-col gap-2">
        {logs.map((log) => {
          let colorClass = 'text-gray-300';
          if (log.type === 'damage') colorClass = 'text-red-400';
          if (log.type === 'heal') colorClass = 'text-green-400';
          if (log.type === 'win') colorClass = 'text-yellow-400 font-bold text-lg text-center my-2';
          if (log.type === 'loss') colorClass = 'text-red-500 font-bold text-lg text-center my-2';
          if (log.type === 'effect') colorClass = 'text-purple-400 italic';

          return (
            <div key={log.id} className={`${colorClass} animate-pulse-fast`}>
              <span className="opacity-50 text-xs mr-2">[{log.id.split('-')[0]}]</span>
              {log.text}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
};