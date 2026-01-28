'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore, matchService, MessageRequest } from '@crush/core';
import { Card, Avatar, AvatarImage, AvatarFallback, Badge } from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  MessageSquare,
  Heart,
  X,
  Star,
  Sparkles,
  Lock,
  Crown,
  Loader2,
  Check,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function MessageRequestsPage() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [acceptedId, setAcceptedId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const messageRequests = await matchService.getMessageRequests(user.uid);
      setRequests(messageRequests);
    } catch (error) {
      console.error('Failed to load message requests:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleAccept = async (request: MessageRequest) => {
    if (!user || actionLoading) return;

    setActionLoading(request.id);
    try {
      const result = await matchService.acceptMessageRequest(user.uid, request.fromUserId);
      setAcceptedId(request.id);

      // Navigate to chat after a brief delay
      setTimeout(() => {
        router.push(`/messages/${result.matchId}`);
      }, 1000);
    } catch (error) {
      console.error('Failed to accept message request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (request: MessageRequest) => {
    if (!user || actionLoading) return;

    setActionLoading(request.id);
    try {
      await matchService.declineMessageRequest(user.uid, request.fromUserId);
      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (error) {
      console.error('Failed to decline message request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Check if user is premium
  const isPremium = profile?.isPremium;

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
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
            Message Requests
          </h1>
          {requests.length > 0 && (
            <Badge variant="default" className="rounded-full">
              {requests.length}
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Premium gate */}
        {!isPremium && (
          <Card className="overflow-hidden mb-6">
            <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Unlock Message Requests
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    See messages from people who liked you before you match. Upgrade to Premium to
                    read and respond to message requests.
                  </p>
                  <Link href="/premium">
                    <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-colors flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Upgrade to Premium
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-4 animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && requests.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No message requests
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              When someone sends you a message before you match, it will appear here.
            </p>
            <Link href="/discover">
              <button className="text-primary hover:underline">Start discovering</button>
            </Link>
          </div>
        )}

        {/* Message requests list */}
        {!loading && requests.length > 0 && (
          <div className="space-y-4">
            {requests.map((request) => (
              <MessageRequestCard
                key={request.id}
                request={request}
                isPremium={isPremium}
                isLoading={actionLoading === request.id}
                isAccepted={acceptedId === request.id}
                onAccept={() => handleAccept(request)}
                onDecline={() => handleDecline(request)}
              />
            ))}
          </div>
        )}

        {/* Info note */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">
                About Message Requests
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                These are messages from people who liked your profile. Accept to start chatting, or
                decline if you're not interested. Your response is private.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessageRequestCardProps {
  request: MessageRequest;
  isPremium?: boolean;
  isLoading: boolean;
  isAccepted: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

function MessageRequestCard({
  request,
  isPremium,
  isLoading,
  isAccepted,
  onAccept,
  onDecline,
}: MessageRequestCardProps) {
  return (
    <Card className={cn('overflow-hidden', isAccepted && 'ring-2 ring-green-500')}>
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="w-16 h-16">
              {request.fromUserPhotoUrl ? (
                <AvatarImage
                  src={isPremium ? request.fromUserPhotoUrl : undefined}
                  alt={request.fromUserName}
                  className={cn(!isPremium && 'blur-md')}
                />
              ) : (
                <AvatarFallback className={cn(!isPremium && 'blur-sm')}>
                  {request.fromUserName.charAt(0)}
                </AvatarFallback>
              )}
            </Avatar>
            {request.isSuperLike && (
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-white fill-white" />
              </div>
            )}
            {!isPremium && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-6 h-6 text-white drop-shadow-lg" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn('font-semibold', !isPremium && 'blur-sm')}>
                {isPremium ? request.fromUserName : 'Hidden'}
              </h3>
              {request.fromUserAge && isPremium && (
                <span className="text-sm text-gray-500">{request.fromUserAge}</span>
              )}
              {request.isSuperLike && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                  Super Like
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">
              {formatDistanceToNow(new Date(request.timestamp), { addSuffix: true })}
            </p>

            {/* Message preview */}
            <div
              className={cn(
                'p-3 bg-gray-100 dark:bg-gray-800 rounded-lg',
                !isPremium && 'blur-sm select-none'
              )}
            >
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                {isPremium ? request.message : 'Upgrade to Premium to read this message...'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isPremium && !isAccepted && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={onDecline}
              disabled={isLoading}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors',
                'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <X className="w-5 h-5" />
                  Decline
                </>
              )}
            </button>
            <button
              onClick={onAccept}
              disabled={isLoading}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors',
                'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
                'hover:from-pink-600 hover:to-rose-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Heart className="w-5 h-5" />
                  Accept
                </>
              )}
            </button>
          </div>
        )}

        {/* Accepted state */}
        {isAccepted && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-green-600">
            <Check className="w-5 h-5" />
            <span className="font-medium">Matched! Redirecting to chat...</span>
          </div>
        )}

        {/* Premium CTA for non-premium users */}
        {!isPremium && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Link href="/premium">
              <button className="w-full py-2.5 px-4 rounded-lg font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-colors flex items-center justify-center gap-2">
                <Crown className="w-5 h-5" />
                Upgrade to See Message
              </button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
