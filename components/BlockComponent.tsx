import React from 'react';
import { Block } from '../types';
import { COLORS } from '../constants';
import { Bomb, Shield, Zap, Lock, RefreshCw, Hourglass } from 'lucide-react';

interface BlockProps {
  block: Block;
  isSelected: boolean;
  isDimmed: boolean;
  isDying?: boolean;
  size: number;
}

const BlockComponent: React.FC<BlockProps> = ({ block, isSelected, isDimmed, isDying, size }) => {
  const colorClass = COLORS[block.color];
  
  // Dynamic font size for timer
  const fontSize = Math.max(10, size / 3);

  return (
    <div
      className={`
        relative flex items-center justify-center
        border-2 rounded-lg select-none
        ${colorClass}
        ${isSelected ? 'scale-90 brightness-125 ring-4 ring-white' : 'scale-100'}
        ${isDimmed ? 'opacity-40 grayscale' : 'opacity-100'}
        ${block.isLocked ? 'border-dashed border-gray-900' : ''}
        ${isDying ? 'scale-0 opacity-0' : 'animate-fall-in'}
        transition-all duration-300 ease-out
      `}
      style={{
        width: '100%',
        height: '100%',
        touchAction: 'none',
      }}
    >
      {/* Icon Overlay for Types */}
      {block.type === 'bomb' && <Bomb className="text-white w-2/3 h-2/3 animate-pulse" />}
      {block.type === 'shield' && <Shield className="text-white w-2/3 h-2/3" />}
      {block.type === 'multiply' && <Zap className="text-yellow-200 w-2/3 h-2/3" />}
      
      {/* Timer Overlay */}
      {block.type === 'timer' && block.countdown !== undefined && (
        <div className="flex flex-col items-center justify-center z-10">
          <Hourglass className={`text-white animate-spin`} style={{ width: size/3, height: size/3, animationDuration: '3s' }} />
          <span className="font-bold text-white drop-shadow-md leading-none mt-1" style={{ fontSize: `${fontSize}px` }}>
            {block.countdown}
          </span>
        </div>
      )}

      {/* Lock Overlay */}
      {block.isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg z-20">
          <Lock className="text-white/80 w-1/2 h-1/2" />
        </div>
      )}
      
      {/* Stone Overlay */}
      {block.color === 'stone' && (
        <div className="absolute inset-0 bg-black/20 rounded-lg pointer-events-none" />
      )}

      {/* Changing Indicator */}
      {block.isChanging && (
        <div className="absolute top-0 right-0 p-0.5">
           <RefreshCw className="w-3 h-3 text-white animate-spin" />
        </div>
      )}
    </div>
  );
};

export default React.memo(BlockComponent);