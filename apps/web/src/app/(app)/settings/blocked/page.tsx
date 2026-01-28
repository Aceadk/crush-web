'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, userService } from '@crush/core';
import { Button, Card, Avatar, AvatarImage, AvatarFallback } from '@crush/ui';
import {
  ArrowLeft,
  Shield,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BlockedUser {
  id: string;
  name: string;
  photoUrl?: string;
  blockedAt: Date;
}

export default function BlockedUsersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const users = await userService.getBlockedUsers(user.uid);
      setBlockedUsers(users);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleUnblock = async (blockedUserId: string) => {
    if (!user) return;

    setUnblocking(blockedUserId);
    try {
      await userService.unblockUser(user.uid, blockedUserId);
      setBlockedUsers(prev => prev.filter(u => u.id !== blockedUserId));
    } catch (error) {
      console.error('Failed to unblock user:', error);
    } finally {
      setUnblocking(null);
    }
  };

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
            Blocked Users
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!loading && blockedUsers.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Shield className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              No blocked users
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              When you block someone, they will appear here. Blocked users cannot
              see your profile or send you messages.
            </p>
          </div>
        )}

        {/* Blocked users list */}
        {!loading && blockedUsers.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {blockedUsers.length} blocked {blockedUsers.length === 1 ? 'user' : 'users'}
            </p>

            {blockedUsers.map((blockedUser) => (
              <Card key={blockedUser.id} className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar size="md">
                    {blockedUser.photoUrl ? (
                      <AvatarImage src={blockedUser.photoUrl} alt={blockedUser.name} />
                    ) : (
                      <AvatarFallback>{blockedUser.name.charAt(0)}</AvatarFallback>
                    )}
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {blockedUser.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Blocked {formatDistanceToNow(blockedUser.blockedAt, { addSuffix: true })}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(blockedUser.id)}
                    disabled={unblocking === blockedUser.id}
                  >
                    {unblocking === blockedUser.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Unblock'
                    )}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Info note */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-300">About blocking</p>
              <ul className="text-sm text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                <li>• Blocked users cannot see your profile</li>
                <li>• They cannot send you messages</li>
                <li>• They will not appear in your discovery</li>
                <li>• Blocking is always private - they will not be notified</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
