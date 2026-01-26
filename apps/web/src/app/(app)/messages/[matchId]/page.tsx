'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@crush/ui';

const ChatRoom = dynamic(() => import('./chat-room'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col h-screen">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      {/* Messages skeleton */}
      <div className="flex-1 p-4 space-y-4">
        <div className="flex justify-start">
          <Skeleton className="h-12 w-48 rounded-2xl" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-12 w-36 rounded-2xl" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-16 w-56 rounded-2xl" />
        </div>
      </div>
      {/* Input skeleton */}
      <div className="p-4 border-t">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  ),
});

interface PageProps {
  params: Promise<{ matchId: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { matchId } = await params;
  return <ChatRoom matchId={matchId} />;
}
