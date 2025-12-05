import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Block, GameState, Position, LevelConfig, BlockColor, BlockType } from './types';
import { LEVELS, MAX_TIME, COLORS } from './constants';
import { createGrid, isAdjacent, handleCollapse, calculateScore } from './services/gameLogic';
import BlockComponent from './components/BlockComponent';
import { Trophy, Timer, Zap, Play, RotateCcw, Home, Skull } from 'lucide-react';

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

export default function App() {
  // Game State
  const [gameState, setGameState] = useState<GameState>({
    status: 'menu',
    score: 0,
    targetScore: 2000,
    timeLeft: MAX_TIME,
    level: 1,
    gridSize: 5,
    activeMultiplier: 1,
  });

  const [grid, setGrid] = useState<Block[][]>([]);
  const [selectedPath, setSelectedPath] = useState<Position[]>([]);
  const [dyingIds, setDyingIds] = useState<Set<string>>(new Set());
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // Refs
  const timerRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<boolean>(false);
  const lastHoverRef = useRef<Position | null>(null);

  // --- Helpers for Floating Text ---
  const addFloatingText = (x: number, y: number, text: string, color: string = 'text-white') => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id, x, y, text, color }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 800);
  };

  // --- Initialization ---

  const startGame = (level: number) => {
    const config = LEVELS[level] || LEVELS[1];
    const newGrid = createGrid(config.size, config);
    setGrid(newGrid);
    setGameState({
      status: 'playing',
      score: 0,
      targetScore: config.targetScore,
      timeLeft: config.timeLimit || MAX_TIME,
      level: level,
      gridSize: config.size,
      activeMultiplier: 1,
    });
    setSelectedPath([]);
    setDyingIds(new Set());
    setFloatingTexts([]);
  };

  const nextLevel = () => {
    const nextLvl = gameState.level + 1;
    if (LEVELS[nextLvl]) {
      startGame(nextLvl);
    } else {
      // Loop or stay
      startGame(1);
    }
  };

  // --- Timer Logic ---
  useEffect(() => {
    if (gameState.status === 'playing') {
      timerRef.current = window.setInterval(() => {
        
        // 1. Handle Global Time
        setGameState(prev => {
          if (prev.timeLeft <= 1) {
             return { ...prev, timeLeft: 0, status: 'lost' };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });

        // 2. Handle Block Timers
        setGrid(prevGrid => {
            let changed = false;
            let penaltyApplied = false;
            
            const newGrid = prevGrid.map(row => row.map(block => {
                if (block.type === 'timer' && block.countdown !== undefined && block.color !== 'stone') {
                    if (block.countdown > 1) {
                        // Tick down
                        changed = true;
                        return { ...block, countdown: block.countdown - 1 };
                    } else {
                        // Expire! Becomes Stone
                        changed = true;
                        penaltyApplied = true;
                        // Add floating text effect (tricky inside reducer, but we can try side-effect via ref if needed, or just let user see score drop)
                        return { 
                            ...block, 
                            type: 'normal' as BlockType, 
                            color: 'stone' as BlockColor, 
                            countdown: undefined,
                            isLocked: true 
                        };
                    }
                }
                return block;
            }));

            if (penaltyApplied) {
                setGameState(prev => ({
                    ...prev,
                    score: Math.max(0, prev.score - 500),
                    timeLeft: Math.max(0, prev.timeLeft - 10)
                }));
            }

            return changed ? newGrid : prevGrid;
        });

      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.status]);

  // --- Interaction Logic ---

  const getBlockAt = (pos: Position) => {
    if (pos.row < 0 || pos.row >= gameState.gridSize || pos.col < 0 || pos.col >= gameState.gridSize) return null;
    return grid[pos.row][pos.col];
  };

  const handlePointerDown = (row: number, col: number) => {
    if (gameState.status !== 'playing') return;
    const block = grid[row][col];
    
    // Cannot select locked blocks or Stone blocks
    if (block.isLocked || block.color === 'stone') return; 

    if (dyingIds.has(block.id)) return;

    draggingRef.current = true;
    lastHoverRef.current = { row, col };
    setSelectedPath([{ row, col }]);
  };

  // Helper to determine the effective color of the current selection path
  const getEffectiveChainColor = (path: Position[]): BlockColor | null => {
      // Find the first non-rainbow color in the path
      for (const pos of path) {
          const b = grid[pos.row][pos.col];
          if (b.color !== 'rainbow') return b.color;
      }
      return null; // All are rainbow, or path empty
  };

  const handlePointerEnter = (row: number, col: number) => {
    if (gameState.status !== 'playing' || selectedPath.length === 0) return;

    const currentPos = { row, col };
    const lastPos = selectedPath[selectedPath.length - 1];
    const currentBlock = grid[row][col];

    if (dyingIds.has(currentBlock.id)) return;

    // Backtracking
    if (selectedPath.length > 1) {
      const secondLast = selectedPath[selectedPath.length - 2];
      if (secondLast.row === row && secondLast.col === col) {
        setSelectedPath(prev => prev.slice(0, -1));
        return;
      }
    }

    // Validation
    if (!isAdjacent(lastPos, currentPos)) return;
    if (selectedPath.some(p => p.row === row && p.col === col)) return;
    if (currentBlock.isLocked || currentBlock.color === 'stone') return;

    // Color Matching Logic (incorporating Rainbow)
    const chainColor = getEffectiveChainColor(selectedPath);
    
    // Allowed if:
    // 1. Current block is Rainbow (always matches)
    // 2. Chain is all Rainbow so far (matches anything)
    // 3. Current block matches the Chain Color
    const isMatch = 
        currentBlock.color === 'rainbow' || 
        chainColor === null || 
        currentBlock.color === chainColor;

    if (isMatch) {
      setSelectedPath(prev => [...prev, currentPos]);
    }
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
    lastHoverRef.current = null;
    if (gameState.status !== 'playing' || selectedPath.length === 0) {
      setSelectedPath([]);
      return;
    }

    if (selectedPath.length < 2) {
      setSelectedPath([]);
      return;
    }

    triggerCollapse();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || selectedPath.length === 0) return;
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const stride = actualCellSize + gap;
    const col = Math.floor((x - gap) / stride);
    const row = Math.floor((y - gap) / stride);
    if (row < 0 || col < 0 || row >= gameState.gridSize || col >= gameState.gridSize) return;
    const innerX = x - (gap + col * stride);
    const innerY = y - (gap + row * stride);
    if (innerX < 0 || innerY < 0 || innerX > actualCellSize || innerY > actualCellSize) return;
    const last = lastHoverRef.current;
    if (!last || last.row !== row || last.col !== col) {
      handlePointerEnter(row, col);
      lastHoverRef.current = { row, col };
    }
  };

  const triggerCollapse = () => {
    const config = LEVELS[gameState.level];
    
    // Determine the 'primary' color cleared for side-effects
    const effectiveColor = getEffectiveChainColor(selectedPath);

    // 1. Identify blocks to remove
    const blocksToRemove = new Set<string>();
    let bombTriggered = false;
    let shieldTriggered = false;
    let multiplyTriggered = false;

    selectedPath.forEach(pos => {
      const block = grid[pos.row][pos.col];
      blocksToRemove.add(block.id);
      if (block.type === 'bomb') bombTriggered = true;
      if (block.type === 'shield') shieldTriggered = true;
      if (block.type === 'multiply') multiplyTriggered = true;
    });

    // 5-match color clear bonus
    // If we have a rainbow-only chain (rare), clear all rainbows? Or nothing?
    // Let's assume if effectiveColor is null (all rainbows), we pick a random color or just clear rainbows.
    // Simpler: Only trigger color clear if we have a real color.
    if (selectedPath.length >= 5 && effectiveColor) {
      grid.forEach(row => {
        row.forEach(block => {
          if (block.color === effectiveColor && !block.isLocked && block.color !== 'stone') {
            blocksToRemove.add(block.id);
          }
        });
      });
    }

    if (bombTriggered) {
      selectedPath.forEach(pos => {
        for(let c=0; c<gameState.gridSize; c++) {
            const b = grid[pos.row][c];
            // Bomb destroys everything except maybe other specials? Let's say it destroys Locks and Stones too.
            blocksToRemove.add(b.id);
        }
      });
    }

    // 2. Visual Feedback Phase
    setDyingIds(blocksToRemove);

    // Calculate Score info for display
    const points = calculateScore(
        selectedPath.length, 
        blocksToRemove.size, 
        gameState.activeMultiplier, 
        multiplyTriggered
    );
    
    // Show floating score at the end of path or center
    const lastP = selectedPath[selectedPath.length - 1];
    
    // 3. Delay Logic Update for Animation
    setTimeout(() => {
        // --- LOGIC START ---
        
        // Handle side effects (Unlocking)
        const unlockedIds = new Set<string>();
        blocksToRemove.forEach(id => {
            let r = -1, c = -1;
            grid.forEach((row, ri) => {
                row.forEach((col, ci) => {
                    if (col.id === id) { r = ri; c = ci; }
                });
            });
            if (r !== -1) {
                const neighbors = [{r: r-1, c}, {r: r+1, c}, {r, c: c-1}, {r, c: c+1}];
                neighbors.forEach(n => {
                    const nb = getBlockAt({row: n.r, col: n.c});
                    if (nb && nb.isLocked) unlockedIds.add(nb.id);
                });
            }
        });

        // Apply Unlocks locally first
        grid.forEach(row => row.forEach(b => {
            if (unlockedIds.has(b.id)) b.isLocked = false;
        }));

        // Handle Collapse (Gravity)
        const nextGrid = handleCollapse(grid, blocksToRemove, config);

        const newScore = gameState.score + points;
        const nextMultiplier = multiplyTriggered ? 3 : 1; 
        const timeBonus = shieldTriggered ? 15 : 0;

        setGrid(nextGrid);
        setGameState(prev => ({
            ...prev,
            score: newScore,
            activeMultiplier: nextMultiplier,
            timeLeft: prev.timeLeft + timeBonus
        }));
        setDyingIds(new Set()); 
        setSelectedPath([]);

        // Show Score Text
        addFloatingText(lastP.col, lastP.row, `+${points}`);
        if (timeBonus > 0) addFloatingText(lastP.col, lastP.row - 1, `+15s`, 'text-blue-300');
        if (multiplyTriggered) addFloatingText(lastP.col, lastP.row + 1, `x3 奖励!`, 'text-yellow-300');

        // Check Win
        if (newScore >= gameState.targetScore) {
            setTimeout(() => setGameState(prev => ({ ...prev, status: 'won' })), 500);
        }
    }, 250); 
  };

  // --- Render Helpers ---

  const [boardSize, setBoardSize] = useState(320);
  useEffect(() => {
    const handleResize = () => {
      const width = Math.min(window.innerWidth - 32, 500); 
      setBoardSize(width);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cellSize = (boardSize / gameState.gridSize);
  const gap = 4;
  const actualCellSize = (boardSize - (gap * (gameState.gridSize + 1))) / gameState.gridSize;

  const flatBlocks = grid.flatMap((row, r) => row.map((block, c) => ({ ...block, r, c })));

  // --- Screens ---

  if (gameState.status === 'menu') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 mb-2">
          连锁崩解
        </h1>
        <p className="text-gray-400 mb-8 max-w-md">
          连接方块 • 触发连锁 • 引爆全场
        </p>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
           {Object.keys(LEVELS).map(lvl => (
               <button 
                  key={lvl}
                  onClick={() => startGame(Number(lvl))}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-xl border border-gray-600 transition-all active:scale-95"
               >
                   第 {lvl} 关
                   <div className="text-xs text-gray-500 font-normal mt-1">
                       {LEVELS[Number(lvl)].size}x{LEVELS[Number(lvl)].size} • {(LEVELS[Number(lvl)].targetScore/1000).toFixed(0)}k
                   </div>
               </button>
           ))}
        </div>
      </div>
    );
  }

  if (gameState.status === 'won') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
        <Trophy size={64} className="text-yellow-400 mb-4 animate-bounce" />
        <h2 className="text-4xl font-bold text-white mb-2">关卡 {gameState.level} 完成!</h2>
        <p className="text-gray-400 mb-8">得分: {gameState.score}</p>
        <div className="flex gap-4">
             <button 
                onClick={() => setGameState(p => ({...p, status: 'menu'}))}
                className="bg-gray-700 text-white px-6 py-3 rounded-lg font-bold"
            >
                <Home />
            </button>
            <button 
                onClick={nextLevel}
                className="bg-green-500 text-white px-8 py-3 rounded-lg font-bold shadow-green-500/50 shadow-lg animate-pulse"
            >
                下一关
            </button>
        </div>
      </div>
    );
  }

  if (gameState.status === 'lost') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
        <Skull size={64} className="text-gray-500 mb-4" />
        <h2 className="text-4xl font-bold text-red-500 mb-2">游戏结束</h2>
        <p className="text-gray-400 mb-8">目标: {gameState.targetScore} | 你的得分: {gameState.score}</p>
        <button 
            onClick={() => startGame(gameState.level)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2"
        >
            <RotateCcw /> 再试一次
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center select-none overflow-hidden touch-none font-sans">
      
      {/* Header UI */}
      <div className="w-full max-w-lg p-4 flex justify-between items-center bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 z-50">
        <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase tracking-widest">Lv. {gameState.level} 得分</span>
            <span className="text-2xl font-mono font-bold text-white leading-none">
                {gameState.score}
                <span className="text-xs text-gray-500 ml-1">/ {gameState.targetScore}</span>
            </span>
        </div>
        
        <div className="flex items-center gap-4">
             {gameState.activeMultiplier > 1 && (
                <div className="flex items-center text-yellow-400 font-bold animate-pulse">
                    <Zap size={16} className="fill-current" />
                    <span>x{gameState.activeMultiplier}</span>
                </div>
            )}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${gameState.timeLeft < 30 ? 'bg-red-900/50 text-red-200 animate-pulse' : 'bg-gray-700 text-white'}`}>
                <Timer size={16} />
                <span className="font-mono font-bold">{Math.floor(gameState.timeLeft / 60)}:{(gameState.timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
        </div>
      </div>

      {/* Game Board Container */}
      <div className="flex-1 flex flex-col justify-center items-center w-full relative">
        
        {/* Progress Bar */}
        <div className="w-full max-w-lg h-1 bg-gray-800 mb-4 rounded-full overflow-hidden">
            <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (gameState.score / gameState.targetScore) * 100)}%` }}
            />
        </div>

        {/* Grid Area */}
        <div 
            ref={gridRef}
            className="relative bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden"
        style={{ 
            width: boardSize, 
            height: boardSize,
            touchAction: 'none' 
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerUp}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
            {/* Render Blocks */}
            {flatBlocks.map((block) => {
                const isSelected = selectedPath.some(p => p.row === block.r && p.col === block.c);
                const isDying = dyingIds.has(block.id);
                
                // Dim calculation is slightly more complex with Rainbows
                let isDimmed = false;
                if (selectedPath.length > 0 && !isSelected) {
                   const chainColor = getEffectiveChainColor(selectedPath);
                   // If block is incompatible with chain, dim it
                   const compatible = block.color === 'rainbow' || chainColor === null || block.color === chainColor;
                   if (!compatible || block.isLocked || block.color === 'stone') {
                       isDimmed = true;
                   }
                }

                const top = gap + block.r * (actualCellSize + gap);
                const left = gap + block.c * (actualCellSize + gap);

                return (
                    <div
                        key={block.id}
                        className="absolute transition-transform duration-300 ease-in-out"
                        style={{
                            width: actualCellSize,
                            height: actualCellSize,
                            transform: `translate(${left}px, ${top}px)`,
                            zIndex: isSelected ? 20 : 10
                        }}
                        onPointerDown={(e) => {
                            e.currentTarget.releasePointerCapture(e.pointerId); 
                            handlePointerDown(block.r, block.c);
                        }}
                        onPointerEnter={() => handlePointerEnter(block.r, block.c)}
                    >
                        <BlockComponent 
                            block={block}
                            isSelected={isSelected}
                            isDimmed={isDimmed}
                            isDying={isDying}
                            size={actualCellSize}
                        />
                    </div>
                );
            })}

            {/* Path Line */}
            <svg className="absolute inset-0 pointer-events-none z-30" width={boardSize} height={boardSize}>
                {selectedPath.length > 1 && (
                    <polyline
                        points={selectedPath.map(p => {
                            const offset = gap + (actualCellSize / 2);
                            const stride = actualCellSize + gap;
                            const x = gap + (p.col * stride) + (actualCellSize/2);
                            const y = gap + (p.row * stride) + (actualCellSize/2);
                            return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="white"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-80 drop-shadow-md"
                    />
                )}
            </svg>

            {/* Floating Score Texts */}
            {floatingTexts.map(ft => {
                 const stride = actualCellSize + gap;
                 const x = gap + (ft.x * stride) + (actualCellSize/2);
                 const y = gap + (ft.y * stride) + (actualCellSize/2);

                 return (
                    <div
                        key={ft.id}
                        className={`absolute pointer-events-none float-up font-black text-2xl ${ft.color} z-40 text-shadow-lg`}
                        style={{
                            left: x,
                            top: y,
                            transform: 'translate(-50%, -50%)',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}
                    >
                        {ft.text}
                    </div>
                 );
            })}

        </div>
        
        <div className="mt-8 text-gray-500 text-sm text-center">
            {gameState.level <= 3 ? (
                <p>滑动连接 • 5连消同色清屏</p>
            ) : (
                <p>⚠️ 注意限时方块 • 🌈 彩虹方块可百搭</p>
            )}
        </div>
      </div>
    </div>
  );
}
