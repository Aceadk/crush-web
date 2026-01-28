'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  Heart,
  Coffee,
  Utensils,
  Film,
  Music,
  Palette,
  TreePine,
  Gamepad2,
  BookOpen,
  ShoppingBag,
  Waves,
  Camera,
  Dumbbell,
  ChefHat,
  Sparkles,
  Shuffle,
  Star,
  Clock,
  DollarSign,
  MapPin,
} from 'lucide-react';

interface DateIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  budget: '$' | '$$' | '$$$';
  indoor: boolean;
  romantic: number; // 1-5
  icon: React.ReactNode;
}

const DATE_IDEAS: DateIdea[] = [
  {
    id: '1',
    title: 'Coffee & Walk',
    description: 'Grab coffee from a local cafe and take a leisurely walk through a scenic area. Perfect for getting to know someone.',
    category: 'casual',
    duration: '1-2 hours',
    budget: '$',
    indoor: false,
    romantic: 3,
    icon: <Coffee className="w-5 h-5" />,
  },
  {
    id: '2',
    title: 'Cooking Class',
    description: 'Learn to make a new cuisine together. Great for bonding and you get to eat what you make!',
    category: 'food',
    duration: '2-3 hours',
    budget: '$$',
    indoor: true,
    romantic: 4,
    icon: <ChefHat className="w-5 h-5" />,
  },
  {
    id: '3',
    title: 'Sunset Picnic',
    description: 'Pack some snacks and drinks, find a scenic spot, and watch the sunset together.',
    category: 'outdoor',
    duration: '2-3 hours',
    budget: '$',
    indoor: false,
    romantic: 5,
    icon: <TreePine className="w-5 h-5" />,
  },
  {
    id: '4',
    title: 'Art Gallery Visit',
    description: 'Explore a local art gallery or museum. Discuss your favorite pieces and learn about each other\'s tastes.',
    category: 'culture',
    duration: '2-3 hours',
    budget: '$',
    indoor: true,
    romantic: 3,
    icon: <Palette className="w-5 h-5" />,
  },
  {
    id: '5',
    title: 'Live Music Night',
    description: 'Find a local venue with live music. Jazz clubs and acoustic nights are perfect for dates.',
    category: 'entertainment',
    duration: '2-4 hours',
    budget: '$$',
    indoor: true,
    romantic: 4,
    icon: <Music className="w-5 h-5" />,
  },
  {
    id: '6',
    title: 'Movie Marathon',
    description: 'Pick a movie series or theme and have a cozy movie marathon at home with snacks.',
    category: 'entertainment',
    duration: '4+ hours',
    budget: '$',
    indoor: true,
    romantic: 4,
    icon: <Film className="w-5 h-5" />,
  },
  {
    id: '7',
    title: 'Bookstore Date',
    description: 'Browse a bookstore together, pick books for each other, then read over coffee.',
    category: 'culture',
    duration: '2-3 hours',
    budget: '$',
    indoor: true,
    romantic: 3,
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    id: '8',
    title: 'Beach Day',
    description: 'Spend the day at the beach swimming, sunbathing, and building sandcastles.',
    category: 'outdoor',
    duration: '4+ hours',
    budget: '$',
    indoor: false,
    romantic: 4,
    icon: <Waves className="w-5 h-5" />,
  },
  {
    id: '9',
    title: 'Photo Walk',
    description: 'Explore your city with cameras (or phones) and capture interesting moments together.',
    category: 'outdoor',
    duration: '2-3 hours',
    budget: '$',
    indoor: false,
    romantic: 3,
    icon: <Camera className="w-5 h-5" />,
  },
  {
    id: '10',
    title: 'Farmers Market',
    description: 'Stroll through a farmers market, sample local produce, and pick ingredients for a meal.',
    category: 'food',
    duration: '1-2 hours',
    budget: '$',
    indoor: false,
    romantic: 3,
    icon: <ShoppingBag className="w-5 h-5" />,
  },
  {
    id: '11',
    title: 'Arcade & Games',
    description: 'Hit up an arcade or play board games at a game cafe. Friendly competition is a great icebreaker.',
    category: 'entertainment',
    duration: '2-3 hours',
    budget: '$',
    indoor: true,
    romantic: 2,
    icon: <Gamepad2 className="w-5 h-5" />,
  },
  {
    id: '12',
    title: 'Workout Together',
    description: 'Try a fitness class together - yoga, rock climbing, or a dance class.',
    category: 'active',
    duration: '1-2 hours',
    budget: '$$',
    indoor: true,
    romantic: 2,
    icon: <Dumbbell className="w-5 h-5" />,
  },
  {
    id: '13',
    title: 'Fine Dining',
    description: 'Dress up and enjoy a special meal at a nice restaurant. Perfect for a memorable occasion.',
    category: 'food',
    duration: '2-3 hours',
    budget: '$$$',
    indoor: true,
    romantic: 5,
    icon: <Utensils className="w-5 h-5" />,
  },
  {
    id: '14',
    title: 'Stargazing',
    description: 'Find a spot away from city lights and spend the evening looking at stars.',
    category: 'outdoor',
    duration: '2-3 hours',
    budget: '$',
    indoor: false,
    romantic: 5,
    icon: <Sparkles className="w-5 h-5" />,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: <Heart className="w-4 h-4" /> },
  { id: 'casual', label: 'Casual', icon: <Coffee className="w-4 h-4" /> },
  { id: 'food', label: 'Food', icon: <Utensils className="w-4 h-4" /> },
  { id: 'outdoor', label: 'Outdoor', icon: <TreePine className="w-4 h-4" /> },
  { id: 'culture', label: 'Culture', icon: <Palette className="w-4 h-4" /> },
  { id: 'entertainment', label: 'Fun', icon: <Gamepad2 className="w-4 h-4" /> },
  { id: 'active', label: 'Active', icon: <Dumbbell className="w-4 h-4" /> },
];

export default function DateIdeasPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [savedIdeas, setSavedIdeas] = useState<string[]>([]);
  const [randomIdea, setRandomIdea] = useState<DateIdea | null>(null);

  const filteredIdeas = selectedCategory === 'all'
    ? DATE_IDEAS
    : DATE_IDEAS.filter(idea => idea.category === selectedCategory);

  const toggleSave = (ideaId: string) => {
    setSavedIdeas(prev =>
      prev.includes(ideaId)
        ? prev.filter(id => id !== ideaId)
        : [...prev, ideaId]
    );
  };

  const getRandomIdea = () => {
    const ideas = selectedCategory === 'all' ? DATE_IDEAS : filteredIdeas;
    const random = ideas[Math.floor(Math.random() * ideas.length)];
    setRandomIdea(random);
  };

  const renderRomanceLevel = (level: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Heart
            key={i}
            className={cn(
              'w-3 h-3',
              i <= level ? 'text-pink-500 fill-pink-500' : 'text-gray-300'
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Date Ideas
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Random Idea Generator */}
        <Card className="overflow-hidden bg-gradient-to-br from-pink-500 to-rose-600">
          <div className="p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">Can't decide?</h2>
                <p className="text-white/80 text-sm">
                  Let us pick a random date idea for you!
                </p>
              </div>
              <Button
                onClick={getRandomIdea}
                className="bg-white text-pink-600 hover:bg-white/90"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Surprise Me
              </Button>
            </div>

            {randomIdea && (
              <div className="mt-4 p-4 bg-white/20 rounded-lg backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    {randomIdea.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{randomIdea.title}</h3>
                    <p className="text-sm text-white/90 mt-1">{randomIdea.description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedCategory === category.id
                  ? 'bg-pink-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              {category.icon}
              {category.label}
            </button>
          ))}
        </div>

        {/* Saved Ideas Quick Access */}
        {savedIdeas.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                <span className="font-medium">Saved Ideas</span>
                <Badge>{savedIdeas.length}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSavedIdeas([])}
              >
                Clear All
              </Button>
            </div>
          </Card>
        )}

        {/* Ideas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIdeas.map((idea) => (
            <Card key={idea.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
                    )}>
                      {idea.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {idea.title}
                      </h3>
                      {renderRomanceLevel(idea.romantic)}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSave(idea.id)}
                    className={cn(
                      'p-2 rounded-full transition-colors',
                      savedIdeas.includes(idea.id)
                        ? 'text-amber-500'
                        : 'text-gray-400 hover:text-amber-500'
                    )}
                  >
                    <Star
                      className={cn(
                        'w-5 h-5',
                        savedIdeas.includes(idea.id) && 'fill-current'
                      )}
                    />
                  </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {idea.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {idea.duration}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {idea.budget}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    {idea.indoor ? 'Indoor' : 'Outdoor'}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredIdeas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No ideas found in this category.</p>
          </div>
        )}

        {/* Tip Card */}
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Pro Tip
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                Mix it up! Alternate between different types of dates to keep things interesting and learn about each other's interests.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
