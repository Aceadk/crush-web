'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@crush/ui';
import { Heart, MessageCircle, X } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/shared/hooks';

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchedUser: {
    name: string;
    photo: string;
  } | null;
  currentUserPhoto?: string;
}

export function MatchModal({
  isOpen,
  onClose,
  matchedUser,
  currentUserPhoto,
}: MatchModalProps) {
  const { width, height } = useWindowSize();

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && matchedUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={onClose}
        >
          {/* Confetti */}
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.2}
          />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="relative w-full max-w-md p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-2 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Match text */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                It's a Match!
              </h1>
              <p className="text-white/80 mt-2">
                You and {matchedUser.name} liked each other
              </p>
            </motion.div>

            {/* Photos */}
            <div className="flex justify-center items-center gap-4 mb-8">
              {/* Current user photo */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="relative"
              >
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary shadow-lg">
                  {currentUserPhoto ? (
                    <img
                      src={currentUserPhoto}
                      alt="You"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-4xl font-bold">
                      ?
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Heart */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
              >
                <Heart className="w-12 h-12 text-primary fill-primary" />
              </motion.div>

              {/* Matched user photo */}
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="relative"
              >
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-secondary shadow-lg">
                  <img
                    src={matchedUser.photo}
                    alt={matchedUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </div>

            {/* Actions */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              <Link href="/messages">
                <Button className="w-full h-14 text-lg" size="xl">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Send a Message
                </Button>
              </Link>

              <Button
                variant="outline"
                className="w-full h-12 text-white border-white/30 hover:bg-white/10"
                onClick={onClose}
              >
                Keep Swiping
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
