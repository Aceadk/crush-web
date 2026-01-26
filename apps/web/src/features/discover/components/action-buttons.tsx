'use client';

import { motion } from 'framer-motion';
import { X, Heart, Star, RotateCcw } from 'lucide-react';
import { cn } from '@crush/ui';

interface ActionButtonsProps {
  onPass: () => void;
  onLike: () => void;
  onSuperLike: () => void;
  onUndo?: () => void;
  disabled?: boolean;
  canUndo?: boolean;
}

export function ActionButtons({
  onPass,
  onLike,
  onSuperLike,
  onUndo,
  disabled,
  canUndo,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* Undo button */}
      {onUndo && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onUndo}
          disabled={disabled || !canUndo}
          className={cn(
            'w-12 h-12 rounded-full bg-background border-2 border-yellow-500 flex items-center justify-center shadow-lg transition-colors',
            disabled || !canUndo
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-yellow-50'
          )}
        >
          <RotateCcw className="w-5 h-5 text-yellow-500" />
        </motion.button>
      )}

      {/* Pass button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onPass}
        disabled={disabled}
        className={cn(
          'w-16 h-16 rounded-full bg-background border-2 border-action-pass flex items-center justify-center shadow-lg transition-colors',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
        )}
      >
        <X className="w-8 h-8 text-action-pass" />
      </motion.button>

      {/* Super Like button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onSuperLike}
        disabled={disabled}
        className={cn(
          'w-14 h-14 rounded-full bg-background border-2 border-action-superlike flex items-center justify-center shadow-lg transition-colors',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-50'
        )}
      >
        <Star className="w-7 h-7 text-action-superlike fill-action-superlike" />
      </motion.button>

      {/* Like button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onLike}
        disabled={disabled}
        className={cn(
          'w-16 h-16 rounded-full bg-background border-2 border-action-like flex items-center justify-center shadow-lg transition-colors',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50'
        )}
      >
        <Heart className="w-8 h-8 text-action-like fill-action-like" />
      </motion.button>
    </div>
  );
}
