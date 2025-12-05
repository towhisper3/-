export type BlockColor = 'red' | 'blue' | 'yellow' | 'purple' | 'green' | 'rainbow' | 'stone';
export type BlockType = 'normal' | 'bomb' | 'shield' | 'multiply' | 'timer';

export interface Position {
  row: number;
  col: number;
}

export interface Block {
  id: string;
  color: BlockColor;
  type: BlockType;
  isLocked: boolean;
  isChanging: boolean; // For color shifting mechanic
  changingTimer?: number;
  countdown?: number; // For timer blocks
}

export interface GameState {
  status: 'menu' | 'playing' | 'won' | 'lost' | 'level-transition';
  score: number;
  targetScore: number;
  timeLeft: number;
  level: number;
  gridSize: number;
  activeMultiplier: number; // From items
}

export interface LevelConfig {
  size: number;
  targetScore: number;
  colors: BlockColor[];
  specialChance: number;
  lockedChance: number;
  changingChance: number;
  timerChance: number;
  rainbowChance: number;
  timeLimit?: number; // Optional override
}