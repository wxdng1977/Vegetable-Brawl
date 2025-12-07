export interface VegetableStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Move {
  name: string;
  description: string;
  damageMultiplier: number; // 1.0 for normal, 1.5 for strong, etc.
  type: 'attack' | 'heal' | 'buff';
}

export type StatusType = 'poison' | 'stun' | 'defense_up' | 'attack_up';

export interface StatusEffect {
  id: string;
  type: StatusType;
  name: string;
  duration: number; // Turns remaining
  value?: number; // e.g. amount of extra defense or poison damage
  icon: string;
}

export interface Fighter {
  id: string;
  name: string;
  description: string;
  stats: VegetableStats;
  ultimateMove: Move;
  imageKeyword: string; // Used for picsum
  emoji: string; // Used for map sprite
  isPlayer: boolean;
  nutritionalHighlight: string; // e.g., "High in Vitamin C"
  statusEffects: StatusEffect[];
}

export interface BattleLogEntry {
  id: string;
  text: string;
  type: 'info' | 'damage' | 'heal' | 'win' | 'loss' | 'effect';
}

export enum GameState {
  MENU,
  LOADING_PLAYER,
  EXPLORATION, // New state for walking around
  LOADING_ENEMY,
  BATTLE,
  VICTORY,
  DEFEAT
}

export interface Position {
  x: number;
  y: number;
}

export interface NPC {
  id: string;
  name: string;
  emoji: string;
  position: Position;
  dialog: string;
  isAggressive: boolean; // If true, wants to fight
}