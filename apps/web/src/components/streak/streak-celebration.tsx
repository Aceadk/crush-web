'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Star, Rocket, Crown, Diamond, Sparkles, X } from 'lucide-react';
import { useStreakStore, StreakMilestone } from '@crush/core';
import confetti from 'canvas-confetti';

const MILESTONE_ICONS = {
  fire: Flame,
  star: Star,
  rocket: Rocket,
  crown: Crown,
  diamond: Diamond,
};

const MILESTONE_COLORS = {
  fire: { primary: '#FF6B35', secondary: '#FF8C42', gradient: 'from-orange-500 to-red-500' },
  star: { primary: '#FFD700', secondary: '#FFA500', gradient: 'from-yellow-400 to-orange-400' },
  rocket: { primary: '#8B5CF6', secondary: '#A78BFA', gradient: 'from-purple-500 to-violet-500' },
  crown: { primary: '#F59E0B', secondary: '#FBBF24', gradient: 'from-amber-500 to-yellow-500' },
  diamond: { primary: '#06B6D4', secondary: '#22D3EE', gradient: 'from-cyan-500 to-teal-400' },
};

interface StreakCelebrationProps {
  onClose?: () => void;
}

export function StreakCelebration({ onClose }: StreakCelebrationProps) {
  const { showCelebration, celebrationData, hideCelebration } = useStreakStore();
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number }>>([]);

  // Generate floating particles
  useEffect(() => {
    if (showCelebration) {
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
      }));
      setParticles(newParticles);
    }
  }, [showCelebration]);

  // Fire confetti on celebration
  const fireConfetti = useCallback(() => {
    if (!celebrationData) return;

    const colors = celebrationData.milestone
      ? [MILESTONE_COLORS[celebrationData.milestone.icon].primary, MILESTONE_COLORS[celebrationData.milestone.icon].secondary]
      : ['#FF6B35', '#FF8C42', '#FFD700'];

    // First burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors,
    });

    // Side bursts for milestones and records
    if (celebrationData.type === 'milestone' || celebrationData.type === 'new_record') {
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors,
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors,
        });
      }, 250);
    }
  }, [celebrationData]);

  useEffect(() => {
    if (showCelebration) {
      fireConfetti();

      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [showCelebration, fireConfetti]);

  const handleClose = () => {
    hideCelebration();
    onClose?.();
  };

  if (!celebrationData) return null;

  const milestone = celebrationData.milestone;
  const iconType = milestone?.icon || 'fire';
  const Icon = MILESTONE_ICONS[iconType];
  const colors = MILESTONE_COLORS[iconType];

  return (
    <AnimatePresence>
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          {/* Floating particles background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                initial={{ y: '100vh', x: `${particle.x}vw`, opacity: 0 }}
                animate={{
                  y: '-20vh',
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 4,
                  delay: particle.delay,
                  ease: 'easeOut',
                }}
                className="absolute"
              >
                <Sparkles className={`w-4 h-4 text-${iconType === 'fire' ? 'orange' : iconType === 'star' ? 'yellow' : 'purple'}-400`} />
              </motion.div>
            ))}
          </div>

          {/* Main celebration card */}
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="relative bg-card border border-border rounded-3xl p-8 max-w-sm mx-4 text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1 rounded-full bg-muted/50 hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Animated glow background */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-20 blur-3xl`}
            />

            {/* Animated icon */}
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, -5, 5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative mb-6"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${colors.gradient} shadow-lg`}
                style={{
                  boxShadow: `0 0 40px ${colors.primary}40`,
                }}
              >
                <Icon className="w-12 h-12 text-white" />
              </motion.div>

              {/* Orbiting particles */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: i * 0.3,
                  }}
                  className="absolute inset-0"
                  style={{ transformOrigin: 'center' }}
                >
                  <motion.div
                    className={`absolute w-3 h-3 rounded-full bg-gradient-to-br ${colors.gradient}`}
                    style={{
                      top: -6,
                      left: '50%',
                      marginLeft: -6,
                    }}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Streak number with animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
              className="mb-4"
            >
              <motion.span
                animate={{
                  textShadow: [
                    `0 0 20px ${colors.primary}`,
                    `0 0 40px ${colors.primary}`,
                    `0 0 20px ${colors.primary}`,
                  ],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`text-6xl font-bold bg-gradient-to-br ${colors.gradient} bg-clip-text text-transparent`}
              >
                {celebrationData.streakDays}
              </motion.span>
              <p className="text-sm text-muted-foreground mt-1">
                {celebrationData.streakDays === 1 ? 'Day' : 'Days'}
              </p>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold mb-2"
            >
              {celebrationData.type === 'new_record' && (
                <>
                  <span className="text-gradient">New Record!</span>
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 3 }}
                    className="inline-block ml-2"
                  >
                    🎉
                  </motion.span>
                </>
              )}
              {celebrationData.type === 'milestone' && milestone && (
                <span className={`bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent`}>
                  {milestone.message}
                </span>
              )}
              {celebrationData.type === 'streak_increment' && (
                <span className="text-gradient">Streak Extended!</span>
              )}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mb-6"
            >
              {celebrationData.type === 'milestone' && milestone ? (
                <>You've earned <span className="font-semibold text-foreground">+{milestone.bonusLikes} bonus likes</span> today!</>
              ) : celebrationData.type === 'new_record' ? (
                <>This is your longest streak ever! Keep going!</>
              ) : (
                <>Keep the momentum going! Check in tomorrow.</>
              )}
            </motion.p>

            {/* Bonus likes indicator */}
            {celebrationData.type === 'milestone' && milestone && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {50 + milestone.bonusLikes} likes today
                </span>
              </motion.div>
            )}

            {/* Continue button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={handleClose}
              className={`mt-6 w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${colors.gradient} hover:opacity-90 transition-opacity`}
            >
              Continue Swiping
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
