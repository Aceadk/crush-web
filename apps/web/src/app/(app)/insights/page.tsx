'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@crush/core';
import { Card, Button, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Star,
  Users,
  Clock,
  Calendar,
  ChevronRight,
  Crown,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
  BarChart3,
  Activity,
  Zap,
} from 'lucide-react';

interface InsightMetric {
  label: string;
  value: number;
  change: number;
  icon: React.ReactNode;
  description: string;
}

interface ActivityDay {
  day: string;
  views: number;
  likes: number;
}

export default function ProfileInsightsPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const isPremium = profile?.isPremium;

  // Mock data - in production this would come from the backend
  const [metrics] = useState<InsightMetric[]>([
    {
      label: 'Profile Views',
      value: 142,
      change: 23,
      icon: <Eye className="w-5 h-5" />,
      description: 'People who viewed your profile this week',
    },
    {
      label: 'Likes Received',
      value: 28,
      change: 5,
      icon: <Heart className="w-5 h-5" />,
      description: 'People who liked your profile this week',
    },
    {
      label: 'Matches',
      value: 8,
      change: 2,
      icon: <Users className="w-5 h-5" />,
      description: 'New matches this week',
    },
    {
      label: 'Messages',
      value: 45,
      change: -3,
      icon: <MessageSquare className="w-5 h-5" />,
      description: 'Messages exchanged this week',
    },
  ]);

  const [weeklyActivity] = useState<ActivityDay[]>([
    { day: 'Mon', views: 18, likes: 3 },
    { day: 'Tue', views: 25, likes: 5 },
    { day: 'Wed', views: 22, likes: 4 },
    { day: 'Thu', views: 30, likes: 6 },
    { day: 'Fri', views: 28, likes: 5 },
    { day: 'Sat', views: 12, likes: 2 },
    { day: 'Sun', views: 7, likes: 3 },
  ]);

  const [peakTimes] = useState([
    { time: '6pm - 9pm', activity: 'high' },
    { time: '9am - 12pm', activity: 'medium' },
    { time: '12pm - 3pm', activity: 'low' },
  ]);

  const maxViews = Math.max(...weeklyActivity.map(d => d.views));

  const renderTrend = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <ArrowUpRight className="w-4 h-4" />
          <span className="text-sm font-medium">+{change}%</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center gap-1 text-red-500">
          <ArrowDownRight className="w-4 h-4" />
          <span className="text-sm font-medium">{change}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Minus className="w-4 h-4" />
        <span className="text-sm font-medium">0%</span>
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
            <BarChart3 className="w-5 h-5 text-purple-500" />
            Profile Insights
          </h1>
          {isPremium && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Premium Gate */}
        {!isPremium && (
          <Card className="overflow-hidden">
            <div className="p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">Unlock Full Insights</h2>
                  <p className="text-white/80 mb-4">
                    Get detailed analytics about who's viewing your profile, when you get the most likes, and how to improve your matches.
                  </p>
                  <Link href="/premium">
                    <Button className="bg-white text-purple-600 hover:bg-white/90">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Upgrade to Premium
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric, index) => (
            <Card
              key={index}
              className={cn(
                'overflow-hidden',
                !isPremium && index > 1 && 'opacity-50 blur-sm pointer-events-none'
              )}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    index === 0 && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
                    index === 1 && 'bg-pink-100 dark:bg-pink-900/30 text-pink-600',
                    index === 2 && 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
                    index === 3 && 'bg-green-100 dark:bg-green-900/30 text-green-600'
                  )}>
                    {metric.icon}
                  </div>
                  {renderTrend(metric.change)}
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {isPremium || index <= 1 ? metric.value : '??'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {metric.label}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Weekly Activity Chart */}
        <Card className={cn('overflow-hidden', !isPremium && 'opacity-60')}>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Weekly Activity
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-end justify-between h-32 gap-2">
              {weeklyActivity.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col gap-1">
                    <div
                      className="w-full bg-pink-200 dark:bg-pink-900/50 rounded-t"
                      style={{
                        height: `${(day.likes / maxViews) * 100}px`,
                      }}
                    />
                    <div
                      className="w-full bg-blue-400 dark:bg-blue-600 rounded-t"
                      style={{
                        height: `${(day.views / maxViews) * 100}px`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Views</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-pink-200 dark:bg-pink-900" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Likes</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Peak Activity Times */}
        <Card className={cn('overflow-hidden', !isPremium && 'blur-sm pointer-events-none')}>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Best Times to Be Active
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {peakTimes.map((time, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    time.activity === 'high' && 'bg-green-100 dark:bg-green-900/30',
                    time.activity === 'medium' && 'bg-amber-100 dark:bg-amber-900/30',
                    time.activity === 'low' && 'bg-gray-100 dark:bg-gray-800'
                  )}>
                    <Zap className={cn(
                      'w-5 h-5',
                      time.activity === 'high' && 'text-green-600',
                      time.activity === 'medium' && 'text-amber-600',
                      time.activity === 'low' && 'text-gray-400'
                    )} />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {time.time}
                  </span>
                </div>
                <Badge className={cn(
                  time.activity === 'high' && 'bg-green-100 text-green-700 border-0',
                  time.activity === 'medium' && 'bg-amber-100 text-amber-700 border-0',
                  time.activity === 'low' && 'bg-gray-100 text-gray-600 border-0'
                )}>
                  {time.activity === 'high' && 'Peak Time'}
                  {time.activity === 'medium' && 'Good'}
                  {time.activity === 'low' && 'Quiet'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Profile Tips */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Star className="w-4 h-4" />
              Profile Tips
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Add More Photos</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Profiles with 4+ photos get 3x more matches. Add variety to show your personality.
                </p>
              </div>
            </div>
            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Complete Your Prompts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Profiles with prompts get 25% more messages. Give potential matches conversation starters.
                </p>
              </div>
            </div>
            <div className="p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Stay Active</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Active users are shown more often. Check in daily to boost your visibility.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Info Note */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">
                About Insights
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Your insights are updated daily. All data is anonymous and aggregated to protect user privacy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
