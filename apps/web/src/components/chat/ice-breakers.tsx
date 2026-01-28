'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageCircle, ChevronRight, RefreshCw, X } from 'lucide-react';

// Ice breaker categories and questions
const ICE_BREAKER_CATEGORIES = [
  {
    id: 'fun',
    name: 'Fun & Playful',
    icon: '🎉',
    questions: [
      "If you could have dinner with anyone in history, who would it be?",
      "What's the most spontaneous thing you've ever done?",
      "Would you rather travel back in time or into the future?",
      "What's your go-to karaoke song?",
      "If you won the lottery tomorrow, what's the first thing you'd do?",
      "What's the weirdest food combination you secretly love?",
      "If you could instantly become an expert in something, what would it be?",
      "What's on your bucket list that might surprise people?",
    ],
  },
  {
    id: 'deep',
    name: 'Getting to Know You',
    icon: '💭',
    questions: [
      "What's something you're passionate about that you could talk about for hours?",
      "What's the best piece of advice you've ever received?",
      "What does your ideal Sunday look like?",
      "What's a skill you're currently trying to learn?",
      "What's something that always makes you smile?",
      "If you could live anywhere in the world, where would it be?",
      "What's the most important quality you look for in a friend?",
      "What's a memory that always makes you happy?",
    ],
  },
  {
    id: 'flirty',
    name: 'Flirty & Bold',
    icon: '💕',
    questions: [
      "What made you swipe right on me? 😊",
      "If we went on a date, what would be your ideal activity?",
      "What's your idea of the perfect romantic evening?",
      "Are you more of a 'stay in and cook together' or 'try a new restaurant' person?",
      "What's your love language?",
      "What's your favorite thing about meeting new people?",
      "Coffee date or dinner date?",
      "What's the most romantic thing someone could do for you?",
    ],
  },
  {
    id: 'creative',
    name: 'Creative & Quirky',
    icon: '🎨',
    questions: [
      "You're stranded on a deserted island. What 3 items do you bring?",
      "If your life was a movie, what genre would it be?",
      "What fictional world would you want to live in?",
      "If you could have any superpower, what would it be?",
      "What's the most interesting Wikipedia rabbit hole you've gone down?",
      "If you could master any instrument overnight, which would you choose?",
      "What's a conspiracy theory you secretly find interesting?",
      "If you could switch lives with anyone for a day, who would it be?",
    ],
  },
];

interface IceBreakersProps {
  onSelect: (message: string) => void;
  matchName?: string;
  className?: string;
}

export function IceBreakers({ onSelect, matchName, className = '' }: IceBreakersProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get shuffled questions from a category
  const getShuffledQuestions = (categoryId: string, count: number = 4) => {
    const category = ICE_BREAKER_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return [];

    // Create a seeded shuffle based on refreshKey
    const shuffled = [...category.questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleSelectQuestion = (question: string) => {
    onSelect(question);
  };

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Ice Breakers</h3>
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {selectedCategory
            ? 'Pick a conversation starter'
            : `Start a conversation with ${matchName || 'your match'}`}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!selectedCategory ? (
          // Category selection
          <motion.div
            key="categories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 grid grid-cols-2 gap-3"
          >
            {ICE_BREAKER_CATEGORIES.map((category, index) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCategory(category.id)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted hover:border-primary/50 transition-colors text-left"
              >
                <span className="text-2xl">{category.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{category.name}</p>
                  <p className="text-xs text-muted-foreground">{category.questions.length} prompts</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </motion.button>
            ))}
          </motion.div>
        ) : (
          // Question selection
          <motion.div
            key="questions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4"
          >
            {/* Category header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {ICE_BREAKER_CATEGORIES.find((c) => c.id === selectedCategory)?.icon}
                </span>
                <span className="text-sm font-medium">
                  {ICE_BREAKER_CATEGORIES.find((c) => c.id === selectedCategory)?.name}
                </span>
              </div>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Shuffle
              </button>
            </div>

            {/* Questions */}
            <div className="space-y-2" key={refreshKey}>
              {getShuffledQuestions(selectedCategory, 4).map((question, index) => (
                <motion.button
                  key={`${question}-${refreshKey}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectQuestion(question)}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border border-border bg-background hover:bg-muted hover:border-primary/50 transition-colors text-left group"
                >
                  <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0 group-hover:text-primary transition-colors" />
                  <p className="text-sm">{question}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact inline version for chat input
interface InlineIceBreakersProps {
  onSelect: (message: string) => void;
  className?: string;
}

export function InlineIceBreakers({ onSelect, className = '' }: InlineIceBreakersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get a few random ice breakers
  const getRandomIceBreakers = (count: number = 3) => {
    const allQuestions = ICE_BREAKER_CATEGORIES.flatMap((c) =>
      c.questions.map((q) => ({ question: q, icon: c.icon }))
    );
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const randomBreakers = getRandomIceBreakers(3);

  const handleSelect = (question: string) => {
    onSelect(question);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Ice Breakers
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-border bg-card shadow-lg overflow-hidden z-10"
          >
            <div className="p-3 border-b border-border bg-muted/30">
              <p className="text-sm font-medium">Quick Starters</p>
            </div>
            <div className="p-2 space-y-1">
              {randomBreakers.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(item.question)}
                  className="w-full flex items-start gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <span className="text-sm">{item.icon}</span>
                  <p className="text-sm text-muted-foreground">{item.question}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
