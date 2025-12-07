import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateFighter } from './services/gemini';
import { Fighter, GameState, BattleLogEntry, Position, NPC, StatusEffect, StatusType } from './types';
import { FighterCard } from './components/FighterCard';
import { BattleLog } from './components/BattleLog';
import { GardenScene } from './components/GardenScene';
import { Loader2, Swords, Trophy, Skull, Zap, Shield, MapPin } from 'lucide-react';

// Initial NPCs for the garden - Updated coordinates for 2000x2000 map
const INITIAL_NPCS: NPC[] = [
  { id: '1', name: '西兰花长老', emoji: '🥦', position: { x: 800, y: 800 }, dialog: "想当年，我们的膳食纤维可比现在多多了！", isAggressive: false },
  { id: '2', name: '土豆列兵', emoji: '🥔', position: { x: 1200, y: 1200 }, dialog: "我是淀粉的守护者！不许动！", isAggressive: true },
  { id: '3', name: '大蒜将军', emoji: '🧄', position: { x: 600, y: 1400 }, dialog: "没有够劲的辣味，休想从我这里通过！", isAggressive: true },
  { id: '4', name: '玉米夫人', emoji: '🌽', position: { x: 1500, y: 500 }, dialog: "我们这里处处都是顺风耳。", isAggressive: false },
  { id: '5', name: '忍者茄子', emoji: '🍆', position: { x: 400, y: 1600 }, dialog: "...", isAggressive: true },
  { id: '6', name: '暴躁南瓜', emoji: '🎃', position: { x: 1600, y: 1600 }, dialog: "别在我的地盘撒野！", isAggressive: true },
];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [playerInput, setPlayerInput] = useState('');
  const [player, setPlayer] = useState<Fighter | null>(null);
  const [enemy, setEnemy] = useState<Fighter | null>(null);
  const [logs, setLogs] = useState<BattleLogEntry[]>([]);
  const [turn, setTurn] = useState<number>(1);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  // sourceId tracks who initiated the action, targetId tracks who received it
  const [lastAction, setLastAction] = useState<{ sourceId?: string, targetId: string, type: 'hit' | 'heal' | 'ultimate' } | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Exploration State - Start in center of 2000x2000 map
  const [playerPosition, setPlayerPosition] = useState<Position>({ x: 1000, y: 1000 });
  const [activeDialog, setActiveDialog] = useState<{npc: NPC, text: string} | null>(null);

  // Add a log entry
  const addLog = (text: string, type: BattleLogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, text, type }]);
  };

  // --- Initial Setup ---

  const startGame = async () => {
    if (!playerInput.trim()) return;

    setGameState(GameState.LOADING_PLAYER);
    setLoadingMessage(`正在从种子培育 ${playerInput}...`);
    
    // 1. Generate Player
    const playerFighter = await generateFighter(playerInput, true);
    setPlayer(playerFighter);

    // 2. Enter Garden
    setGameState(GameState.EXPLORATION);
    // Reset pos to center
    setPlayerPosition({ x: 1000, y: 1000 });
  };

  // --- Exploration Logic ---
  
  const handleMove = (pos: Position) => {
    if (activeDialog) setActiveDialog(null); // Close dialog on move
    setPlayerPosition(pos);
  };

  const handleNPCInteract = (npc: NPC) => {
    const dx = playerPosition.x - npc.position.x;
    const dy = playerPosition.y - npc.position.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist > 150) {
        // Move close first (simple approach toward target)
        const angle = Math.atan2(dy, dx);
        const targetX = npc.position.x + Math.cos(angle) * 80;
        const targetY = npc.position.y + Math.sin(angle) * 80;

        setPlayerPosition({ x: targetX, y: targetY });
        setTimeout(() => {
           openNPCDialog(npc); 
        }, 500);
    } else {
        openNPCDialog(npc);
    }
  };

  const openNPCDialog = (npc: NPC) => {
    setActiveDialog({ npc, text: npc.dialog });
  };

  const startBattleWithNPC = async () => {
    if (!activeDialog) return;
    const npc = activeDialog.npc;
    
    setGameState(GameState.LOADING_ENEMY);
    setActiveDialog(null);
    setLoadingMessage(`${npc.name} 正在准备战斗！`);

    const enemyFighter = await generateFighter(npc.name, false);
    enemyFighter.emoji = npc.emoji; 
    setEnemy(enemyFighter);

    initBattle(player!, enemyFighter);
  };

  const initBattle = (p: Fighter, e: Fighter) => {
    setGameState(GameState.BATTLE);
    setLogs([]);
    setTurn(1);
    
    const pReset = { ...p, statusEffects: [] };
    setPlayer(pReset);

    const playerSpeed = p.stats.speed;
    const enemySpeed = e.stats.speed;
    const playerInit = playerSpeed + Math.random() * 5;
    const enemyInit = enemySpeed + Math.random() * 5;
    
    const playerStarts = playerInit >= enemyInit;
    setIsPlayerTurn(playerStarts);
    
    addLog("战斗开始！", 'info');
    addLog(`${p.name} (HP: ${p.stats.hp}) vs ${e.name} (HP: ${e.stats.hp})`, 'info');
    addLog(playerStarts ? `${p.name} 速度更快，先发制人！` : `${e.name} 速度更快，先发制人！`, 'info');
  };

  const returnToGarden = () => {
    if (player) {
        setPlayer({
            ...player,
            stats: {
                ...player.stats,
                hp: Math.min(player.stats.maxHp, player.stats.hp + 20)
            },
            statusEffects: [] // Clear effects after battle
        });
    }
    setEnemy(null);
    setGameState(GameState.EXPLORATION);
  };

  // --- Battle System Mechanics ---

  // Apply Status Effect Helper
  const applyStatusEffect = (target: Fighter, type: StatusType, duration: number, value: number = 0): Fighter => {
    const newTarget = { ...target };
    
    let effectName = '';
    let effectIcon = '';

    switch(type) {
        case 'poison': effectName = '中毒'; effectIcon = '☠️'; break;
        case 'stun': effectName = '眩晕'; effectIcon = '💫'; break;
        case 'defense_up': effectName = '防御提升'; effectIcon = '🛡️'; break;
        case 'attack_up': effectName = '攻击提升'; effectIcon = '⚔️'; break;
    }

    const newEffect: StatusEffect = {
        id: `${type}-${Date.now()}`,
        type,
        name: effectName,
        duration,
        value,
        icon: effectIcon
    };

    const existingIdx = newTarget.statusEffects.findIndex(e => e.type === type);
    if (existingIdx >= 0) {
        newTarget.statusEffects[existingIdx].duration = Math.max(newTarget.statusEffects[existingIdx].duration, duration);
        addLog(`${newTarget.name} 的 ${effectName} 效果延长了！`, 'effect');
    } else {
        newTarget.statusEffects = [...newTarget.statusEffects, newEffect];
        addLog(`${newTarget.name} 获得了 ${effectName} 效果！`, 'effect');
    }

    return newTarget;
  };

  const calculateDamage = (attacker: Fighter, defender: Fighter, multiplier: number = 1.0) => {
    let atk = attacker.stats.attack;
    let def = defender.stats.defense;

    if (attacker.statusEffects.find(e => e.type === 'attack_up')) atk *= 1.3;
    if (defender.statusEffects.find(e => e.type === 'defense_up')) def *= 1.3;

    const rawDamage = (atk * multiplier) - (def * 0.5);
    const variance = 0.9 + Math.random() * 0.2;
    return Math.max(1, Math.floor(rawDamage * variance));
  };

  // Process End of Turn Effects (Poison dmg, Duration tick)
  const processTurnEndEffects = (fighter: Fighter): Fighter => {
    let newFighter = { ...fighter };
    const remainingEffects: StatusEffect[] = [];
    let hasChanges = false;

    newFighter.statusEffects.forEach(effect => {
        // Apply DoT
        if (effect.type === 'poison') {
            const dmg = Math.floor(newFighter.stats.maxHp * 0.05) + 1;
            newFighter.stats.hp = Math.max(0, newFighter.stats.hp - dmg);
            addLog(`${newFighter.name} 受到毒素伤害 ${dmg} 点！`, 'damage');
            hasChanges = true;
        }

        // Tick duration
        if (effect.duration > 1) {
            remainingEffects.push({ ...effect, duration: effect.duration - 1 });
            hasChanges = true; // Duration changed
        } else {
            addLog(`${newFighter.name} 的 ${effect.name} 效果消失了。`, 'info');
            hasChanges = true; // Effect removed
        }
    });

    if (hasChanges) {
        newFighter.statusEffects = remainingEffects;
        return newFighter;
    }
    return fighter; // Return original reference if no changes to avoid renders
  };

  // --- Turn Management ---

  // Check Stun at Start of Player Turn
  useEffect(() => {
    if (gameState === GameState.BATTLE && isPlayerTurn && player) {
      const stunEffect = player.statusEffects.find(e => e.type === 'stun');
      if (stunEffect) {
        const timer = setTimeout(() => {
            addLog(`${player.name} 晕倒了，无法行动！`, 'effect');
            
            // CRITICAL FIX: Must process effects (duration tick) even if stunned!
            const processedPlayer = processTurnEndEffects(player);
            setPlayer(processedPlayer);
            
            // Only switch turn if still alive
            if (processedPlayer.stats.hp > 0) {
                setIsPlayerTurn(false);
                setTurn(t => t + 1);
            }
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState, isPlayerTurn, player]);

  // AI Logic
  useEffect(() => {
    if (gameState === GameState.BATTLE && !isPlayerTurn && enemy && player) {
      const aiDelay = setTimeout(() => {
        
        // 1. Check Stun
        const stunEffect = enemy.statusEffects.find(e => e.type === 'stun');
        if (stunEffect) {
            addLog(`${enemy.name} 晕倒了，无法行动！`, 'effect');
            const processedEnemy = processTurnEndEffects(enemy);
            setEnemy(processedEnemy);
            
            if (processedEnemy.stats.hp > 0) {
                setIsPlayerTurn(true);
                setTurn(t => t + 1);
            }
            return;
        }

        // 2. AI Decision
        const roll = Math.random();
        
        if (roll < 0.2 && enemy.stats.hp < enemy.stats.maxHp * 0.5) {
             // Heal & Defend
             const healAmount = Math.floor(enemy.stats.maxHp * 0.15);
             let newEnemy = { ...enemy, stats: { ...enemy.stats, hp: Math.min(enemy.stats.maxHp, enemy.stats.hp + healAmount) } };
             newEnemy = applyStatusEffect(newEnemy, 'defense_up', 2);
             
             setLastAction({ sourceId: 'enemy', targetId: 'enemy', type: 'heal' });
             addLog(`${enemy.name} 吸收养分，恢复 ${healAmount} HP 并提升了防御！`, 'heal');
             
             const finalEnemy = processTurnEndEffects(newEnemy);
             setEnemy(finalEnemy);
             if (finalEnemy.stats.hp > 0) {
                setIsPlayerTurn(true);
                setTurn(t => t + 1);
             }

        } else if (roll > 0.75) {
             // Ultimate
             const dmg = calculateDamage(enemy, player, enemy.ultimateMove.damageMultiplier);
             let newPlayer = { ...player, stats: { ...player.stats, hp: Math.max(0, player.stats.hp - dmg) } };
             
             if (Math.random() > 0.5) {
                const effectType = Math.random() > 0.5 ? 'poison' : 'stun';
                newPlayer = applyStatusEffect(newPlayer, effectType, effectType === 'stun' ? 1 : 3);
             }

             setPlayer(newPlayer);
             setLastAction({ sourceId: 'enemy', targetId: 'player', type: 'ultimate' });
             addLog(`${enemy.name} 使用绝招 ${enemy.ultimateMove.name}！造成 ${dmg} 伤害！`, 'damage');

             const finalEnemy = processTurnEndEffects(enemy);
             setEnemy(finalEnemy);
             if (finalEnemy.stats.hp > 0) {
                 setIsPlayerTurn(true);
                 setTurn(t => t + 1);
             }

        } else {
             // Attack
             const dmg = calculateDamage(enemy, player, 1.0);
             setPlayer(prev => prev ? {...prev, stats: {...prev.stats, hp: Math.max(0, prev.stats.hp - dmg)}} : null);
             setLastAction({ sourceId: 'enemy', targetId: 'player', type: 'hit' });
             addLog(`${enemy.name} 发动攻击！造成 ${dmg} 伤害。`, 'damage');

             const finalEnemy = processTurnEndEffects(enemy);
             setEnemy(finalEnemy);
             if (finalEnemy.stats.hp > 0) {
                 setIsPlayerTurn(true);
                 setTurn(t => t + 1);
             }
        }
        
        setTimeout(() => setLastAction(null), 500);

      }, 1500);

      return () => clearTimeout(aiDelay);
    }
  }, [gameState, isPlayerTurn, player, enemy]);

  // Win/Loss Check Effect
  useEffect(() => {
    if (gameState === GameState.BATTLE) {
        if (player && player.stats.hp <= 0) {
            setGameState(GameState.DEFEAT);
            addLog(`${player.name} 枯萎了...`, 'loss');
        }
        if (enemy && enemy.stats.hp <= 0) {
            setGameState(GameState.VICTORY);
            addLog(`${enemy.name} 被打败了！`, 'win');
        }
    }
  }, [player, enemy, gameState]);

  // Player Actions
  const handlePlayerAction = (action: 'attack' | 'ultimate' | 'heal') => {
    if (!player || !enemy) return;

    let newEnemy = { ...enemy };
    let newPlayer = { ...player };

    if (action === 'attack') {
        const dmg = calculateDamage(player, enemy, 1.0);
        newEnemy.stats.hp = Math.max(0, newEnemy.stats.hp - dmg);
        setEnemy(newEnemy);
        setLastAction({ sourceId: 'player', targetId: 'enemy', type: 'hit' });
        addLog(`${player.name} 发动攻击！造成 ${dmg} 伤害。`, 'damage');
    
    } else if (action === 'ultimate') {
        const dmg = calculateDamage(player, enemy, player.ultimateMove.damageMultiplier);
        newEnemy.stats.hp = Math.max(0, newEnemy.stats.hp - dmg);
        
        if (Math.random() > 0.5) {
            const effectType = Math.random() > 0.5 ? 'poison' : 'stun';
            const duration = effectType === 'stun' ? 1 : 3;
            newEnemy = applyStatusEffect(newEnemy, effectType, duration);
        }

        setEnemy(newEnemy);
        setLastAction({ sourceId: 'player', targetId: 'enemy', type: 'ultimate' });
        addLog(`${player.name} 使用 ${player.ultimateMove.name}！造成 ${dmg} 暴击伤害！`, 'damage');
    
    } else if (action === 'heal') {
        const healAmount = Math.floor(player.stats.maxHp * 0.2);
        newPlayer.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + healAmount);
        newPlayer = applyStatusEffect(newPlayer, 'defense_up', 2);
        
        setPlayer(newPlayer);
        setLastAction({ sourceId: 'player', targetId: 'player', type: 'heal' });
        addLog(`${player.name} 进行光合作用，恢复 ${healAmount} HP 并提升防御。`, 'heal');
    }

    const finalPlayer = processTurnEndEffects(action === 'heal' ? newPlayer : player);
    setPlayer(finalPlayer);

    if (finalPlayer.stats.hp > 0 && newEnemy.stats.hp > 0) {
        setIsPlayerTurn(false);
        setTurn(t => t + 1);
        setTimeout(() => setLastAction(null), 500);
    }
  };

  // --- Renders ---
  // ... (No changes to render methods, just reusing existing ones implicitly)

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900 via-stone-900 to-black">
      <div className="space-y-2">
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-yellow-500 drop-shadow-lg">
          蔬菜大乱斗
        </h1>
        <p className="text-gray-400 text-sm md:text-lg">传说菜园</p>
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl">
        <label className="block text-left text-sm font-bold text-green-400 mb-2">培育你的英雄</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={playerInput}
            onChange={(e) => setPlayerInput(e.target.value)}
            placeholder="例如：钢铁羽衣甘蓝、烈焰辣椒..."
            className="flex-1 bg-black/50 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && startGame()}
          />
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {['西兰花', '魔鬼椒', '土豆', '洋葱'].map(v => (
                <button 
                    key={v} 
                    onClick={() => setPlayerInput(v)}
                    className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-full transition-colors border border-gray-600"
                >
                    {v}
                </button>
            ))}
        </div>

        <button
          onClick={startGame}
          disabled={!playerInput}
          className="mt-6 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
        >
          <MapPin size={20} />
          进入菜园
        </button>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center h-full bg-black/90 p-8 text-center z-50 absolute inset-0">
      <Loader2 size={64} className="text-green-500 animate-spin mb-6" />
      <h2 className="text-2xl font-bold text-white mb-2">
        {gameState === GameState.LOADING_PLAYER ? '发芽中...' : '准备战斗'}
      </h2>
      <p className="text-green-400 animate-pulse">{loadingMessage}</p>
    </div>
  );

  const renderExploration = () => {
    if (!player) return null;
    return (
        <div className="w-full h-full relative">
            <GardenScene 
                player={player} 
                npcs={INITIAL_NPCS} 
                playerPosition={playerPosition}
                onMove={handleMove}
                onInteract={handleNPCInteract}
            />
            
            {/* NPC Dialog Modal */}
            {activeDialog && (
                <div className="absolute bottom-4 left-4 right-4 md:left-20 md:right-20 bg-white/95 text-black p-4 rounded-xl shadow-2xl border-4 border-green-600 animate-in slide-in-from-bottom-10 fade-in z-50">
                    <div className="flex items-start gap-4">
                        <div className="text-4xl bg-green-100 p-2 rounded-lg border border-green-300">
                            {activeDialog.npc.emoji}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-green-800 uppercase text-xs mb-1">{activeDialog.npc.name}</h3>
                            <p className="font-medium text-lg mb-4">"{activeDialog.text}"</p>
                            
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setActiveDialog(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-sm">再见</button>
                                <button onClick={startBattleWithNPC} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm flex items-center gap-2 animate-pulse"><Swords size={16} />战斗！</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Stats Corner */}
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm p-2 rounded-lg flex items-center gap-2 border border-white/10">
                <div className="bg-green-600 rounded-full w-8 h-8 flex items-center justify-center text-lg shadow-inner">
                   {player.emoji}
                </div>
                <div>
                   <div className="text-xs font-bold text-white">{player.name}</div>
                   <div className="w-20 bg-gray-700 h-1.5 rounded-full mt-1">
                      <div className="bg-green-400 h-full rounded-full" style={{width: `${(player.stats.hp/player.stats.maxHp)*100}%`}}></div>
                   </div>
                </div>
            </div>
        </div>
    );
  };

  const renderBattle = () => {
    if (!player || !enemy) return null;

    return (
      <div className="flex flex-col h-full bg-stone-900 relative">
        {/* Arena Background */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596711683693-512c26224329?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-20 pointer-events-none"></div>
        
        {/* Top Bar */}
        <div className="relative z-10 flex justify-between items-center p-4 bg-black/40 backdrop-blur-sm border-b border-white/5">
            <div className="text-xs font-mono text-gray-400">回合 {turn}</div>
            <div className="text-xs font-bold text-yellow-500 tracking-widest">竞技场</div>
            <button onClick={returnToGarden} className="text-xs text-red-400 hover:text-red-300">逃跑</button>
        </div>

        {/* Fighters Area */}
        <div className="flex-1 relative z-10 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20 p-4 overflow-y-auto">
            <div className="order-1 md:order-2">
                <FighterCard 
                    fighter={enemy} 
                    isCurrentTurn={!isPlayerTurn && gameState === GameState.BATTLE}
                    isHit={lastAction?.targetId === 'enemy' && (lastAction?.type === 'hit' || lastAction?.type === 'ultimate')}
                    isHealed={lastAction?.targetId === 'enemy' && lastAction?.type === 'heal'}
                    isAttacking={lastAction?.sourceId === 'enemy' && (lastAction.type === 'hit' || lastAction.type === 'ultimate')}
                />
            </div>
            <div className="order-2 md:order-2 text-4xl font-black text-white/20 italic select-none">VS</div>
            <div className="order-3 md:order-1">
                <FighterCard 
                    fighter={player} 
                    isCurrentTurn={isPlayerTurn && gameState === GameState.BATTLE} 
                    isHit={lastAction?.targetId === 'player' && (lastAction?.type === 'hit' || lastAction?.type === 'ultimate')}
                    isHealed={lastAction?.targetId === 'player' && lastAction?.type === 'heal'}
                    isAttacking={lastAction?.sourceId === 'player' && (lastAction.type === 'hit' || lastAction.type === 'ultimate')}
                />
            </div>
        </div>

        {/* Control Center */}
        <div className="relative z-20 bg-gray-900 border-t border-gray-700 p-4 pb-8 md:pb-4 flex flex-col gap-4 shadow-2xl">
            <BattleLog logs={logs} />
            {gameState === GameState.BATTLE && (
                <div className={`grid grid-cols-3 gap-3 transition-opacity duration-300 ${!isPlayerTurn ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                    <button onClick={() => handlePlayerAction('attack')} className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-lg font-bold flex flex-col items-center gap-1 active:transform active:translate-y-1 shadow-lg shadow-red-900/50">
                        <Swords size={20} /> <span className="text-xs md:text-sm">攻击</span>
                    </button>
                    <button onClick={() => handlePlayerAction('ultimate')} className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-lg font-bold flex flex-col items-center gap-1 active:transform active:translate-y-1 shadow-lg shadow-purple-900/50 border border-purple-400">
                        <Zap size={20} /> <span className="text-xs md:text-sm">绝招</span>
                    </button>
                    <button onClick={() => handlePlayerAction('heal')} className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg font-bold flex flex-col items-center gap-1 active:transform active:translate-y-1 shadow-lg shadow-green-900/50">
                        <Shield size={20} /> <span className="text-xs md:text-sm">防御</span>
                    </button>
                </div>
            )}
            
            {/* Victory/Defeat Modal */}
            {(gameState === GameState.VICTORY || gameState === GameState.DEFEAT) && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-in fade-in duration-500">
                    <div className="mb-6 transform scale-125">
                        {gameState === GameState.VICTORY ? <Trophy size={64} className="text-yellow-400 animate-bounce" /> : <Skull size={64} className="text-gray-400 animate-pulse" />}
                    </div>
                    <h2 className={`text-4xl font-black mb-2 ${gameState === GameState.VICTORY ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {gameState === GameState.VICTORY ? '胜利！' : '失败'}
                    </h2>
                    <p className="text-gray-300 mb-8 max-w-xs text-center">
                         {gameState === GameState.VICTORY 
                            ? `${player.name} 证明了它的营养价值是无敌的！` 
                            : `${player.name} 注定只能做成沙拉了...`}
                    </p>
                    <button 
                        onClick={returnToGarden}
                        className="bg-white text-black font-bold py-3 px-8 rounded-full flex items-center gap-2 hover:bg-gray-200 transition-colors"
                    >
                        <MapPin size={20} />
                        返回菜园
                    </button>
                </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <>
        {gameState === GameState.MENU && renderMenu()}
        {(gameState === GameState.LOADING_PLAYER || gameState === GameState.LOADING_ENEMY) && renderLoading()}
        {gameState === GameState.EXPLORATION && renderExploration()}
        {(gameState === GameState.BATTLE || gameState === GameState.VICTORY || gameState === GameState.DEFEAT) && renderBattle()}
    </>
  );
};

export default App;