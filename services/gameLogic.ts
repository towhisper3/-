import { Block, BlockColor, BlockType, LevelConfig, Position } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const generateBlock = (config: LevelConfig): Block => {
  // Determine Color
  let color: BlockColor;
  if (Math.random() < config.rainbowChance) {
    color = 'rainbow';
  } else {
    color = config.colors[Math.floor(Math.random() * config.colors.length)];
  }
  
  const rand = Math.random();
  let type: BlockType = 'normal';
  let countdown: number | undefined = undefined;

  // Determine Type
  if (color !== 'rainbow' && rand < config.specialChance) {
    // Specials don't usually appear on rainbow to keep it simple, or they can.
    // Let's allow specials on normal colors.
    const specialRand = Math.random();
    if (specialRand < 0.30) type = 'bomb';
    else if (specialRand < 0.60) type = 'shield';
    else type = 'multiply';
  } else if (color !== 'rainbow' && Math.random() < config.timerChance) {
    type = 'timer';
    countdown = Math.floor(Math.random() * 10) + 10; // 10-20 seconds
  }

  const isLocked = Math.random() < config.lockedChance && type !== 'timer' && color !== 'rainbow'; // Timers/Rainbows don't spawn locked
  const isChanging = Math.random() < config.changingChance;

  return {
    id: uuidv4(),
    color,
    type,
    isLocked,
    isChanging,
    changingTimer: isChanging ? 3 : undefined,
    countdown,
  };
};

export const createGrid = (size: number, config: LevelConfig): Block[][] => {
  const grid: Block[][] = [];
  for (let r = 0; r < size; r++) {
    const row: Block[] = [];
    for (let c = 0; c < size; c++) {
      row.push(generateBlock(config));
    }
    grid.push(row);
  }
  return grid;
};

export const isAdjacent = (p1: Position, p2: Position): boolean => {
  const dr = Math.abs(p1.row - p2.row);
  const dc = Math.abs(p1.col - p2.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
};

export const calculateScore = (
  chainLength: number,
  clearedCount: number,
  activeMultiplier: number,
  hasDoubleBonus: boolean
): number => {
  let baseScore = clearedCount * 10;
  
  // Chain multipliers
  let chainMultiplier = 1;
  if (chainLength >= 3) chainMultiplier = 2;
  if (chainLength >= 5) chainMultiplier = 5;
  if (chainLength >= 10) chainMultiplier = 10;

  const total = baseScore * chainMultiplier * activeMultiplier * (hasDoubleBonus ? 3 : 1);
  return Math.floor(total);
};

export const handleCollapse = (
  grid: Block[][], 
  blocksToRemove: Set<string>, 
  config: LevelConfig
): Block[][] => {
  const size = grid.length;
  const newGrid: Block[][] = Array(size).fill(null).map(() => []);

  // For each column
  for (let c = 0; c < size; c++) {
    const remainingBlocks: Block[] = [];
    
    // Scan column top to bottom
    for (let r = 0; r < size; r++) {
      const block = grid[r][c];
      if (!blocksToRemove.has(block.id)) {
        remainingBlocks.push(block);
      }
    }

    // How many to generate?
    const missingCount = size - remainingBlocks.length;
    const newBlocks: Block[] = [];
    for (let i = 0; i < missingCount; i++) {
      newBlocks.push(generateBlock(config));
    }

    // Stack: New blocks on top, remaining blocks below
    const finalColumn = [...newBlocks, ...remainingBlocks];
    
    // Place back into row-major grid
    for (let r = 0; r < size; r++) {
      newGrid[r][c] = finalColumn[r];
    }
  }

  return newGrid;
};