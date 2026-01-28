'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, userService } from '@crush/core';
import { Card, Button, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Sparkles,
  CheckCircle2,
  Home,
  Moon,
  Sun,
  Users,
  Music,
  Plane,
  Book,
  Coffee,
  Wine,
  Dog,
  Cat,
  Mountain,
  Waves,
  Palette,
  Gamepad2,
  Trophy,
  Clock,
  MessageSquare,
  Zap,
  Target,
  Loader2,
} from 'lucide-react';

interface QuizQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'scale';
  icon: React.ReactNode;
  options: {
    value: string;
    label: string;
    icon?: React.ReactNode;
  }[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'social_style',
    question: 'How would you describe your social style?',
    type: 'single',
    icon: <Users className="w-6 h-6" />,
    options: [
      { value: 'introvert', label: 'Introvert - I recharge alone', icon: <Book className="w-5 h-5" /> },
      { value: 'extrovert', label: 'Extrovert - I thrive in social settings', icon: <Users className="w-5 h-5" /> },
      { value: 'ambivert', label: 'Ambivert - A mix of both', icon: <Coffee className="w-5 h-5" /> },
    ],
  },
  {
    id: 'weekend_plans',
    question: 'Your ideal weekend looks like...',
    type: 'single',
    icon: <Sun className="w-6 h-6" />,
    options: [
      { value: 'adventure', label: 'Outdoor adventure', icon: <Mountain className="w-5 h-5" /> },
      { value: 'relax', label: 'Relaxing at home', icon: <Home className="w-5 h-5" /> },
      { value: 'social', label: 'Meeting friends', icon: <Wine className="w-5 h-5" /> },
      { value: 'explore', label: 'Exploring somewhere new', icon: <Plane className="w-5 h-5" /> },
    ],
  },
  {
    id: 'communication',
    question: 'How do you prefer to communicate in a relationship?',
    type: 'single',
    icon: <MessageSquare className="w-6 h-6" />,
    options: [
      { value: 'constant', label: 'Frequent check-ins throughout the day' },
      { value: 'quality', label: 'Less frequent but deeper conversations' },
      { value: 'spontaneous', label: 'Spontaneous - when something comes up' },
      { value: 'balanced', label: 'A balance of both' },
    ],
  },
  {
    id: 'conflict',
    question: 'When there\'s a disagreement, you typically...',
    type: 'single',
    icon: <Zap className="w-6 h-6" />,
    options: [
      { value: 'discuss_now', label: 'Want to talk it out immediately' },
      { value: 'cool_off', label: 'Need time to cool off first' },
      { value: 'avoid', label: 'Prefer to let things blow over' },
      { value: 'compromise', label: 'Focus on finding a compromise' },
    ],
  },
  {
    id: 'love_language',
    question: 'What\'s your primary love language?',
    type: 'single',
    icon: <Heart className="w-6 h-6" />,
    options: [
      { value: 'words', label: 'Words of Affirmation' },
      { value: 'touch', label: 'Physical Touch' },
      { value: 'gifts', label: 'Receiving Gifts' },
      { value: 'service', label: 'Acts of Service' },
      { value: 'time', label: 'Quality Time' },
    ],
  },
  {
    id: 'lifestyle',
    question: 'Are you more of a...',
    type: 'single',
    icon: <Clock className="w-6 h-6" />,
    options: [
      { value: 'early_bird', label: 'Early bird - I love mornings', icon: <Sun className="w-5 h-5" /> },
      { value: 'night_owl', label: 'Night owl - I come alive at night', icon: <Moon className="w-5 h-5" /> },
      { value: 'flexible', label: 'Flexible - depends on the day' },
    ],
  },
  {
    id: 'pets',
    question: 'Your thoughts on pets?',
    type: 'single',
    icon: <Dog className="w-6 h-6" />,
    options: [
      { value: 'dog_lover', label: 'Dog person', icon: <Dog className="w-5 h-5" /> },
      { value: 'cat_lover', label: 'Cat person', icon: <Cat className="w-5 h-5" /> },
      { value: 'both', label: 'Love all animals' },
      { value: 'none', label: 'Not really into pets' },
    ],
  },
  {
    id: 'goals',
    question: 'What are you looking for right now?',
    type: 'single',
    icon: <Target className="w-6 h-6" />,
    options: [
      { value: 'serious', label: 'A serious relationship' },
      { value: 'casual', label: 'Something casual' },
      { value: 'friends', label: 'New friends first' },
      { value: 'open', label: 'Open to see what happens' },
    ],
  },
  {
    id: 'hobbies',
    question: 'Which activities do you enjoy most? (Select all that apply)',
    type: 'multiple',
    icon: <Palette className="w-6 h-6" />,
    options: [
      { value: 'fitness', label: 'Fitness & Sports', icon: <Trophy className="w-5 h-5" /> },
      { value: 'music', label: 'Music & Concerts', icon: <Music className="w-5 h-5" /> },
      { value: 'travel', label: 'Travel & Adventure', icon: <Plane className="w-5 h-5" /> },
      { value: 'arts', label: 'Art & Creativity', icon: <Palette className="w-5 h-5" /> },
      { value: 'gaming', label: 'Gaming', icon: <Gamepad2 className="w-5 h-5" /> },
      { value: 'outdoors', label: 'Outdoors & Nature', icon: <Mountain className="w-5 h-5" /> },
      { value: 'reading', label: 'Reading & Learning', icon: <Book className="w-5 h-5" /> },
      { value: 'food', label: 'Food & Cooking', icon: <Coffee className="w-5 h-5" /> },
    ],
  },
  {
    id: 'values',
    question: 'What matters most to you in a partner?',
    type: 'multiple',
    icon: <Sparkles className="w-6 h-6" />,
    options: [
      { value: 'humor', label: 'Sense of humor' },
      { value: 'ambition', label: 'Ambition & Drive' },
      { value: 'kindness', label: 'Kindness & Empathy' },
      { value: 'intelligence', label: 'Intelligence' },
      { value: 'adventure', label: 'Adventurous spirit' },
      { value: 'stability', label: 'Stability & Reliability' },
    ],
  },
];

interface CompatibilityResult {
  type: string;
  title: string;
  description: string;
  traits: string[];
  compatibleWith: string[];
  color: string;
}

const COMPATIBILITY_RESULTS: Record<string, CompatibilityResult> = {
  adventurer: {
    type: 'adventurer',
    title: 'The Adventurer',
    description: 'You thrive on new experiences and spontaneity. You bring excitement and energy to relationships.',
    traits: ['Spontaneous', 'Energetic', 'Open-minded', 'Curious'],
    compatibleWith: ['The Free Spirit', 'The Social Butterfly'],
    color: 'from-orange-500 to-amber-500',
  },
  nurturer: {
    type: 'nurturer',
    title: 'The Nurturer',
    description: 'You value deep emotional connections and create safe, loving spaces for your partner.',
    traits: ['Caring', 'Patient', 'Supportive', 'Empathetic'],
    compatibleWith: ['The Intellectual', 'The Romantic'],
    color: 'from-pink-500 to-rose-500',
  },
  intellectual: {
    type: 'intellectual',
    title: 'The Intellectual',
    description: 'You connect through deep conversations and shared curiosity about the world.',
    traits: ['Thoughtful', 'Analytical', 'Curious', 'Articulate'],
    compatibleWith: ['The Nurturer', 'The Adventurer'],
    color: 'from-blue-500 to-indigo-500',
  },
  social_butterfly: {
    type: 'social_butterfly',
    title: 'The Social Butterfly',
    description: 'You love meeting new people and bring warmth and charm to every interaction.',
    traits: ['Outgoing', 'Charming', 'Fun-loving', 'Optimistic'],
    compatibleWith: ['The Adventurer', 'The Romantic'],
    color: 'from-purple-500 to-violet-500',
  },
  romantic: {
    type: 'romantic',
    title: 'The Romantic',
    description: 'You believe in love stories and put your heart fully into relationships.',
    traits: ['Passionate', 'Devoted', 'Expressive', 'Idealistic'],
    compatibleWith: ['The Nurturer', 'The Social Butterfly'],
    color: 'from-red-500 to-pink-500',
  },
};

export default function CompatibilityQuizPage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CompatibilityResult | null>(null);

  const question = QUIZ_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100;

  const handleSelectOption = useCallback((value: string) => {
    const currentAnswer = answers[question.id];

    if (question.type === 'multiple') {
      const currentValues = (currentAnswer as string[]) || [];
      if (currentValues.includes(value)) {
        setAnswers({
          ...answers,
          [question.id]: currentValues.filter(v => v !== value),
        });
      } else {
        setAnswers({
          ...answers,
          [question.id]: [...currentValues, value],
        });
      }
    } else {
      setAnswers({
        ...answers,
        [question.id]: value,
      });
    }
  }, [answers, question]);

  const canProceed = useCallback(() => {
    const answer = answers[question.id];
    if (question.type === 'multiple') {
      return Array.isArray(answer) && answer.length > 0;
    }
    return !!answer;
  }, [answers, question]);

  const calculateResult = useCallback((): CompatibilityResult => {
    // Simple algorithm to determine personality type based on answers
    let adventureScore = 0;
    let nurturerScore = 0;
    let intellectualScore = 0;
    let socialScore = 0;
    let romanticScore = 0;

    // Social style
    if (answers.social_style === 'extrovert') socialScore += 2;
    if (answers.social_style === 'introvert') intellectualScore += 2;
    if (answers.social_style === 'ambivert') nurturerScore += 1;

    // Weekend plans
    if (answers.weekend_plans === 'adventure') adventureScore += 2;
    if (answers.weekend_plans === 'relax') nurturerScore += 2;
    if (answers.weekend_plans === 'social') socialScore += 2;
    if (answers.weekend_plans === 'explore') adventureScore += 1;

    // Communication
    if (answers.communication === 'constant') romanticScore += 1;
    if (answers.communication === 'quality') intellectualScore += 2;

    // Love language
    if (answers.love_language === 'words') intellectualScore += 1;
    if (answers.love_language === 'touch') romanticScore += 2;
    if (answers.love_language === 'service') nurturerScore += 2;
    if (answers.love_language === 'time') romanticScore += 1;

    // Goals
    if (answers.goals === 'serious') romanticScore += 2;
    if (answers.goals === 'casual') socialScore += 1;
    if (answers.goals === 'open') adventureScore += 1;

    // Hobbies
    const hobbies = (answers.hobbies as string[]) || [];
    if (hobbies.includes('fitness') || hobbies.includes('outdoors')) adventureScore += 1;
    if (hobbies.includes('reading') || hobbies.includes('arts')) intellectualScore += 1;
    if (hobbies.includes('music') || hobbies.includes('food')) socialScore += 1;

    // Values
    const values = (answers.values as string[]) || [];
    if (values.includes('kindness')) nurturerScore += 2;
    if (values.includes('intelligence')) intellectualScore += 2;
    if (values.includes('adventure')) adventureScore += 2;
    if (values.includes('humor')) socialScore += 1;

    // Find highest score
    const scores = {
      adventurer: adventureScore,
      nurturer: nurturerScore,
      intellectual: intellectualScore,
      social_butterfly: socialScore,
      romantic: romanticScore,
    };

    const highestType = Object.entries(scores).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    return COMPATIBILITY_RESULTS[highestType];
  }, [answers]);

  const handleNext = useCallback(async () => {
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Calculate and show results
      setSaving(true);
      const calculatedResult = calculateResult();
      setResult(calculatedResult);

      // Save result to profile
      if (user) {
        try {
          await userService.updateUserProfile(user.uid, {
            // Store compatibility type in profile
          } as any);
        } catch (error) {
          console.error('Failed to save quiz result:', error);
        }
      }

      setSaving(false);
      setShowResults(true);
    }
  }, [currentQuestion, calculateResult, user]);

  const handleBack = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  }, [currentQuestion]);

  const handleRetake = useCallback(() => {
    setAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
    setResult(null);
  }, []);

  // Results view
  if (showResults && result) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Results
            </h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Result Card */}
          <Card className="overflow-hidden">
            <div className={cn('p-8 text-white bg-gradient-to-br', result.color)}>
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10" />
                </div>
                <Badge className="bg-white/20 text-white border-0 mb-3">
                  Your Compatibility Type
                </Badge>
                <h2 className="text-3xl font-bold mb-3">{result.title}</h2>
                <p className="text-white/90 text-lg">{result.description}</p>
              </div>
            </div>
          </Card>

          {/* Traits */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Your Key Traits
              </h2>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {result.traits.map((trait, index) => (
                  <Badge
                    key={index}
                    className="px-4 py-2 text-sm bg-primary/10 text-primary border-0"
                  >
                    {trait}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>

          {/* Compatible Types */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Most Compatible With
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {result.compatibleWith.map((type, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {type}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleRetake}
            >
              Retake Quiz
            </Button>
            <Button
              className="flex-1"
              onClick={() => router.push('/discover')}
            >
              Find Matches
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => currentQuestion === 0 ? router.back() : handleBack()}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Compatibility Quiz
          </h1>
          <Badge className="ml-auto">
            {currentQuestion + 1} / {QUIZ_QUESTIONS.length}
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Question Card */}
        <Card className="overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600">
                {question.icon}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {question.question}
              </h2>
            </div>

            {question.type === 'multiple' && (
              <p className="text-sm text-gray-500 mb-4">Select all that apply</p>
            )}

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option) => {
                const isSelected = question.type === 'multiple'
                  ? ((answers[question.id] as string[]) || []).includes(option.value)
                  : answers[question.id] === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => handleSelectOption(option.value)}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3',
                      isSelected
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-700'
                    )}
                  >
                    {option.icon && (
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                        isSelected
                          ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      )}>
                        {option.icon}
                      </div>
                    )}
                    <span className={cn(
                      'font-medium',
                      isSelected ? 'text-pink-600 dark:text-pink-400' : 'text-gray-700 dark:text-gray-300'
                    )}>
                      {option.label}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-pink-500 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentQuestion > 0 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : currentQuestion === QUIZ_QUESTIONS.length - 1 ? (
              <>
                See Results
                <Sparkles className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
