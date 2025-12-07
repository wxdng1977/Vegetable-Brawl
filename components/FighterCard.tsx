import React from 'react';
import { Fighter } from '../types';
import { StatsDisplay } from './StatsDisplay';

interface FighterCardProps {
  fighter: Fighter;
  isCurrentTurn?: boolean;
  isHit?: boolean;
  isHealed?: boolean;
  isAttacking?: boolean;
}

export const FighterCard: React.FC<FighterCardProps> = ({ fighter, isCurrentTurn, isHit, isHealed, isAttacking }) => {
  // Use picsum with a hash of the keyword to get a somewhat consistent random image
  const seed = fighter.imageKeyword.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imageUrl = `https://picsum.photos/seed/${seed}/300/300`;

  let animationClass = "";
  if (isHit) animationClass = "animate-shake ring-4 ring-red-500 z-10";
  if (isHealed) animationClass = "ring-4 ring-green-500 z-10";
  if (isAttacking) animationClass = "animate-attack ring-4 ring-yellow-300 z-20 shadow-[0_0_40px_rgba(253,224,71,0.6)]";
  if (!animationClass && isCurrentTurn) animationClass = "scale-105 shadow-xl ring-2 ring-yellow-400";

  return (
    <div className={`relative flex flex-col items-center transition-all duration-300 transform ${animationClass} w-full max-w-[180px] md:max-w-[220px]`}>
      
      {/* Turn Indicator */}
      {isCurrentTurn && !isAttacking && (
        <div className="absolute -top-10 animate-bounce text-yellow-400 font-bold tracking-widest text-sm bg-black/50 px-3 py-1 rounded-full z-20">
          行动中
        </div>
      )}

      {/* HP Bar */}
      <div className="w-full bg-gray-800 h-4 rounded-full mb-2 border-2 border-gray-600 relative overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-red-600 to-green-500 transition-all duration-500 ease-out"
          style={{ width: `${Math.max(0, (fighter.stats.hp / fighter.stats.maxHp) * 100)}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold shadow-black drop-shadow-md">
          {fighter.stats.hp} / {fighter.stats.maxHp} 生命值
        </span>
      </div>

      {/* Status Effects Row */}
      <div className="flex gap-1 mb-1 w-full justify-center min-h-[24px]">
        {fighter.statusEffects.map((effect) => (
          <div 
            key={effect.id} 
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-sm animate-in zoom-in duration-300
              ${effect.type === 'poison' ? 'bg-purple-900 text-purple-200 border border-purple-500' : ''}
              ${effect.type === 'stun' ? 'bg-yellow-900 text-yellow-200 border border-yellow-500' : ''}
              ${effect.type === 'defense_up' ? 'bg-blue-900 text-blue-200 border border-blue-500' : ''}
              ${effect.type === 'attack_up' ? 'bg-red-900 text-red-200 border border-red-500' : ''}
            `}
            title={`${effect.name} (${effect.duration} 回合)`}
          >
            <span>{effect.icon}</span>
            <span>{effect.duration}</span>
          </div>
        ))}
      </div>

      {/* Card Body */}
      <div className={`bg-gray-800 rounded-xl overflow-hidden shadow-lg w-full border border-gray-700 ${fighter.isPlayer ? 'bg-gradient-to-b from-green-900 to-gray-900' : 'bg-gradient-to-b from-red-900 to-gray-900'}`}>
        <div className="relative h-32 md:h-40 w-full overflow-hidden">
          <img 
            src={imageUrl} 
            alt={fighter.name} 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
            <h3 className="text-lg font-bold truncate text-center text-white">{fighter.name}</h3>
            <p className="text-[10px] text-gray-300 text-center italic truncate">{fighter.nutritionalHighlight}</p>
          </div>
        </div>
        
        <div className="p-3">
          <StatsDisplay stats={fighter.stats} />
          
          <div className="mt-2 pt-2 border-t border-gray-700">
             <div className="flex justify-between items-center text-xs text-purple-300">
                <span className="font-bold">绝招:</span>
                <span className="truncate ml-1">{fighter.ultimateMove.name}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};