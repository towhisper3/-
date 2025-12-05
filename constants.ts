import { LevelConfig, BlockColor } from './types';

export const COLORS: Record<BlockColor, string> = {
  red: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] border-red-400',
  blue: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] border-blue-400',
  yellow: 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)] border-yellow-300',
  purple: 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)] border-purple-400',
  green: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] border-green-400',
  rainbow: 'bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 shadow-[0_0_15px_rgba(255,255,255,0.5)] border-white/50 animate-pulse',
  stone: 'bg-gray-600 border-gray-700 shadow-inner',
};

export const LEVELS: Record<number, LevelConfig> = {
  1: {
    size: 5,
    targetScore: 2000,
    colors: ['red', 'blue', 'yellow'],
    specialChance: 0.05,
    lockedChance: 0,
    changingChance: 0,
    timerChance: 0,
    rainbowChance: 0,
  },
  2: {
    size: 5,
    targetScore: 5000,
    colors: ['red', 'blue', 'yellow', 'green'],
    specialChance: 0.08,
    lockedChance: 0.05,
    changingChance: 0,
    timerChance: 0,
    rainbowChance: 0.02,
  },
  3: {
    size: 6,
    targetScore: 12000,
    colors: ['red', 'blue', 'yellow', 'green', 'purple'],
    specialChance: 0.1,
    lockedChance: 0.1,
    changingChance: 0,
    timerChance: 0.05,
    rainbowChance: 0.03,
  },
  4: {
    size: 6,
    targetScore: 20000,
    colors: ['red', 'blue', 'yellow', 'green', 'purple'],
    specialChance: 0.12,
    lockedChance: 0.15,
    changingChance: 0,
    timerChance: 0.1,
    rainbowChance: 0.04,
    timeLimit: 240, // 4 mins
  },
  5: {
    size: 7,
    targetScore: 35000,
    colors: ['red', 'blue', 'yellow', 'green', 'purple'],
    specialChance: 0.15,
    lockedChance: 0.2,
    changingChance: 0.05,
    timerChance: 0.15,
    rainbowChance: 0.05,
    timeLimit: 300,
  },
  6: { // Chaos Mode
    size: 7,
    targetScore: 50000,
    colors: ['red', 'blue', 'yellow', 'green', 'purple'],
    specialChance: 0.2,
    lockedChance: 0.1,
    changingChance: 0.1,
    timerChance: 0.2, // Lots of timers
    rainbowChance: 0.08,
    timeLimit: 180, // Low time
  },
};

export const MAX_TIME = 180; // Default 3 minutes
export const CHAIN_BONUS_THRESHOLD = 5;
