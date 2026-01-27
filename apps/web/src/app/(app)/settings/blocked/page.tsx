'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, userService } from '@crush/core';
import { Avatar, AvatarImage, AvatarFallback, Button, Card } from '@crush/ui';
import { ArrowLeft, UserX, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    const loadBlockedUsers = async () => {
      if (!user) return;

      try {
        // In a real app, you'd fetch this from the backend
        // For now, we'll use a placeholder
        const users = await userService.getBlockedUsers(user.uid);
        setBlockedUsers(users || []);
      } catch (error) {
        console.error('Failed to load blocked users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBlockedUsers();
  }, [user]);

  const handleUnblock = async (blockedUserId: string) => {
    if (!user) return;

    setUnblocking(blockedUserId);
    try {
      await userService.unblockUser(user.uid, blockedUserId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedUserId));
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <UserX className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No blocked users
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              When you block someone, they&apos;ll appear here. Blocked users can&apos;t see your
              profile or send you messages.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {blockedUsers.map((blockedUser) => (
                <div
                  key={blockedUser.id}
                  className="flex items-center gap-4 p-4"
                >
                  <Avatar size="md">
                    {blockedUser.photoUrl ? (
                      <AvatarImage src={blockedUser.photoUrl} alt={blockedUser.name} />
                    ) : (
                      <AvatarFallback>{blockedUser.name.charAt(0)}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {blockedUser.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Blocked {new Date(blockedUser.blockedAt).toLocaleDateString()}
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
              ))}
            </div>
          </Card>
        )}

        <p className="mt-6 text-sm text-center text-gray-500 dark:text-gray-400">
          Unblocking someone will allow them to see your profile and send you messages again.
        </p>
      </div>
    </div>
  );
}
