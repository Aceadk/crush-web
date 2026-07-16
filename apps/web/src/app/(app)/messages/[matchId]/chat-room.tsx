'use client';

import { IceBreakers, InlineIceBreakers } from '@/components/chat/ice-breakers';
import { PinButton } from '@/components/messages/pinned-conversations';
import { VoiceNotePlayer, VoiceNoteRecorder } from '@/features/messages/components';
import { analytics } from '@/lib/analytics';
import { ContentProtectionProvider, ProtectedImage } from '@/shared/components/content-protection';
import { useNetworkStatus } from '@/shared/hooks';
import {
    Message,
    MessageReactionType,
    storageService,
    useAuthStore,
    useMatchStore,
    useMessageStore,
    userService,
    useUIStore,
} from '@crush/core';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Button,
    cn,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@crush/ui';
import { format, isToday, isYesterday } from 'date-fns';
import {
    ArrowLeft,
    Check,
    Flag,
    Image as ImageIcon,
    Loader2,
    Mic,
    MoreVertical,
    Pencil,
    Phone,
    RefreshCw,
    Send,
    Shield,
    Smile,
    Trash2,
    UserX,
    Video,
    WifiOff,
    X,
    ZoomIn,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

interface ChatRoomProps {
  matchId: string;
}

export default function ChatRoom({ matchId }: ChatRoomProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { matches, unmatch, loadMatches } = useMatchStore();
  const { addToast } = useUIStore();
  const { isOnline, reconnectCount } = useNetworkStatus();
  const {
    currentConversation,
    messages,
    typingIndicator,
    loading,
    error,
    loadingMore,
    hasMore,
    openConversation,
    sendMessage,
    sendImageMessage,
    sendVideoMessage,
    sendVoiceMessage,
    retryFailedMessage,
    markAsRead,
    setTyping,
    toggleReaction,
    editMessage,
    deleteMessage,
    loadMoreMessages,
    closeConversation,
    blockConversation,
    clearError,
  } = useMessageStore();

  const [inputValue, setInputValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasRequestedMatchesRef = useRef(false);
  const lastMatchesUserRef = useRef<string | null>(null);
  const trackedConversationRef = useRef<string | null>(null);

  // For virtuoso prepend: track a stable first item index so older
  // messages are prepended without scroll jumps.
  const START_INDEX = 100_000;
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);

  // Get match info
  const match =
    matches.find((m) => m.id === matchId) ??
    (user ? matches.find((m) => `${m.otherUserId}_${user.uid}` === matchId) : undefined);

  // Ensure matches are loaded for direct chat routes.
  useEffect(() => {
    let cancelled = false;

    if (!user) {
      hasRequestedMatchesRef.current = false;
      lastMatchesUserRef.current = null;
      setInitializing(false);
      return;
    }

    if (lastMatchesUserRef.current !== user.uid) {
      lastMatchesUserRef.current = user.uid;
      hasRequestedMatchesRef.current = false;
      setInitializing(true);
    }

    if (matches.length > 0) {
      setInitializing(false);
      return;
    }

    if (hasRequestedMatchesRef.current) {
      return;
    }

    hasRequestedMatchesRef.current = true;

    void (async () => {
      try {
        await loadMatches(user.uid);
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, matches.length, loadMatches]);

  const conversationMatchId = match?.id;
  const conversationOtherUserId = match?.otherUserId;

  const reconnectConversation = useCallback(
    async (showSuccessToast: boolean) => {
      if (!user || !conversationMatchId || !conversationOtherUserId) {
        return;
      }

      if (!isOnline) {
        addToast({
          type: 'error',
          title: 'You are offline',
          description: 'Reconnect to restore real-time updates.',
        });
        return;
      }

      setReconnecting(true);
      analytics.funnelStep('messaging', 'reconnect', 'started');
      try {
        await loadMatches(user.uid);
        await openConversation(conversationMatchId, [user.uid, conversationOtherUserId], user.uid);
        analytics.track({
          name: 'feature_used',
          properties: { feature: 'chat_reconnected' },
        });
        analytics.funnelStep('messaging', 'reconnect', 'completed');
        if (showSuccessToast) {
          addToast({
            type: 'success',
            title: 'Reconnected',
            description: 'Chat updates are live again.',
          });
        }
      } catch (error) {
        analytics.funnelStep('messaging', 'reconnect', 'failed', {
          reason: error instanceof Error ? error.message : 'unknown_error',
        });
        addToast({
          type: 'error',
          title: 'Reconnect failed',
          description: 'Unable to restore chat updates right now.',
        });
      } finally {
        setReconnecting(false);
      }
    },
    [
      user,
      conversationMatchId,
      conversationOtherUserId,
      isOnline,
      addToast,
      loadMatches,
      openConversation,
    ]
  );

  // Handle report
  const handleReport = async () => {
    if (!user || !reportReason || !match) return;
    setActionLoading(true);
    try {
      // Submit report to Firestore
      await userService.reportUser(user.uid, match.otherUserId, reportReason);
      setShowReportDialog(false);
      setReportReason('');
      addToast({
        type: 'success',
        title: 'Report submitted',
        description: 'Our team will review it shortly.',
      });
    } catch (error) {
      console.error('Failed to submit report:', error);
      addToast({
        type: 'error',
        title: 'Report failed',
        description: 'Please try again.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle unmatch
  const handleUnmatch = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await unmatch(user.uid, matchId);
      setShowUnmatchDialog(false);
      router.push('/messages');
    } catch (error) {
      console.error('Failed to unmatch:', error);
      addToast({
        type: 'error',
        title: 'Could not unmatch',
        description: 'Please try again.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete chat (block conversation)
  const handleDeleteChat = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await blockConversation(user.uid);
      setShowDeleteDialog(false);
      router.push('/messages');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      addToast({
        type: 'error',
        title: 'Could not delete chat',
        description: 'Please try again.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Initialize conversation
  useEffect(() => {
    if (user && conversationMatchId && conversationOtherUserId && !initializing) {
      openConversation(conversationMatchId, [user.uid, conversationOtherUserId], user.uid);
    }

    return () => {
      closeConversation();
    };
  }, [
    user,
    conversationMatchId,
    conversationOtherUserId,
    initializing,
    openConversation,
    closeConversation,
  ]);

  useEffect(() => {
    if (!isOnline || reconnectCount === 0) return;
    void reconnectConversation(true);
  }, [isOnline, reconnectCount, reconnectConversation]);

  useEffect(() => {
    if (!currentConversation) return;
    if (trackedConversationRef.current === currentConversation.id) return;
    trackedConversationRef.current = currentConversation.id;
    analytics.track({
      name: 'conversation_started',
      properties: { matchId: conversationMatchId || matchId },
    });
  }, [currentConversation, conversationMatchId, matchId]);

  // Keep firstItemIndex in sync when older messages are prepended.
  // Virtuoso uses firstItemIndex to maintain scroll position automatically.
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    const newCount = messages.length;
    if (prevCount > 0 && newCount > prevCount && loadingMore) {
      // Older messages were prepended — shift firstItemIndex back
      const added = newCount - prevCount;
      setFirstItemIndex((prev) => prev - added);
    }
    prevMessageCountRef.current = newCount;
  }, [messages.length, loadingMore]);

  // Mark messages as read
  useEffect(() => {
    if (!user || !currentConversation) return;

    const unreadMessages = messages
      .filter((m) => m.senderId !== user.uid && m.status !== 'read')
      .map((m) => m.id);

    if (unreadMessages.length > 0) {
      markAsRead(user.uid, unreadMessages);
    }
  }, [messages, user, currentConversation, markAsRead]);

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setInputValue(value);

    if (!user) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true
    if (value.length > 0) {
      setTyping(user.uid, true);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(user.uid, false);
    }, 2000);
  };

  // Ensure typing indicator is cleared when leaving chat
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (user) {
        void setTyping(user.uid, false);
      }
    };
  }, [setTyping, user]);

  // Surface chat store errors through toasts
  useEffect(() => {
    if (!error) return;

    addToast({
      type: 'error',
      title: 'Chat error',
      description: error,
    });
    clearError();
  }, [error, addToast, clearError]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !user) return;
    if (!isOnline) {
      addToast({
        type: 'error',
        title: 'You are offline',
        description: 'Reconnect to send messages.',
      });
      return;
    }

    const messageText = inputValue.trim();
    setInputValue('');

    // Stop typing indicator
    setTyping(user.uid, false);

    try {
      await sendMessage(messageText, user.uid);
      analytics.track({
        name: 'message_sent',
        properties: {
          matchId: conversationMatchId || matchId,
          messageType: 'text',
        },
      });
    } catch (error) {
      analytics.funnelStep('messaging', 'message_send', 'failed', {
        reason: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  }, [inputValue, user, isOnline, addToast, setTyping, sendMessage, conversationMatchId, matchId]);

  // Virtuoso startReached handler: load older messages when scrolled to top
  const handleStartReached = useCallback(() => {
    if (loadingMore || !hasMore || !currentConversation) return;
    loadMoreMessages(currentConversation.id);
  }, [loadingMore, hasMore, currentConversation, loadMoreMessages]);

  // Handle image selection
  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const isVideoFile = file.type.startsWith('video/');
      // Validate file type
      if (!file.type.startsWith('image/') && !isVideoFile) {
        addToast({
          type: 'error',
          title: 'Invalid file',
          description: 'Please select an image or a video.',
        });
        return;
      }

      // Validate file size (5MB images, 50MB videos — matches storage rules)
      const maxBytes = isVideoFile ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        addToast({
          type: 'error',
          title: isVideoFile ? 'Video too large' : 'Image too large',
          description: isVideoFile
            ? 'Video must be less than 50MB.'
            : 'Image must be less than 5MB.',
        });
        return;
      }

      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    },
    [addToast]
  );

  // Cancel image selection
  const cancelImageSelection = useCallback(() => {
    setSelectedFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [imagePreview]);

  // Clean up object URL if component unmounts while preview is open.
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Send image message
  const handleSendImage = useCallback(async () => {
    if (!selectedFile || !user || uploadingImage || !currentConversation) return;
    if (!isOnline) {
      addToast({
        type: 'error',
        title: 'You are offline',
        description: 'Reconnect to send photos.',
      });
      return;
    }

    setUploadingImage(true);

    const isVideoFile = selectedFile.type.startsWith('video/');
    try {
      // Upload media to storage (same chat_media path for images and videos)
      const mediaUrl = await storageService.uploadChatImage(
        currentConversation.id,
        user.uid,
        selectedFile
      );

      if (isVideoFile) {
        await sendVideoMessage(mediaUrl, user.uid);
      } else {
        await sendImageMessage(mediaUrl, user.uid);
      }
      analytics.track({
        name: 'message_sent',
        properties: {
          matchId: conversationMatchId || matchId,
          messageType: isVideoFile ? 'video' : 'image',
        },
      });

      // Clear preview
      cancelImageSelection();
    } catch (error) {
      console.error('Failed to send media:', error);
      addToast({
        type: 'error',
        title: isVideoFile ? 'Video failed' : 'Image failed',
        description: isVideoFile
          ? 'Failed to send video. Please try again.'
          : 'Failed to send image. Please try again.',
      });
    } finally {
      setUploadingImage(false);
    }
  }, [
    selectedFile,
    user,
    uploadingImage,
    currentConversation,
    isOnline,
    sendImageMessage,
    sendVideoMessage,
    cancelImageSelection,
    addToast,
    conversationMatchId,
    matchId,
  ]);

  // Send voice message
  const handleSendVoice = useCallback(
    async (audioBlob: Blob, duration: number) => {
      if (!user || !currentConversation) return;
      if (!isOnline) {
        addToast({
          type: 'error',
          title: 'You are offline',
          description: 'Reconnect to send voice notes.',
        });
        return;
      }

      try {
        // Upload audio to storage
        const audioUrl = await storageService.uploadVoiceNote(
          currentConversation.id,
          user.uid,
          audioBlob
        );

        // Send voice message
        await sendVoiceMessage(audioUrl, duration, user.uid);
        analytics.track({
          name: 'message_sent',
          properties: {
            matchId: conversationMatchId || matchId,
            messageType: 'audio',
          },
        });
      } catch (error) {
        console.error('Failed to send voice note:', error);
        addToast({
          type: 'error',
          title: 'Voice note failed',
          description: 'Failed to send voice note. Please try again.',
        });
        throw error;
      }
    },
    [user, currentConversation, isOnline, sendVoiceMessage, addToast, conversationMatchId, matchId]
  );

  const handleRetryFailedMessage = useCallback(
    async (messageId: string) => {
      if (!user) {
        return;
      }

      analytics.funnelStep('messaging', 'message_retry', 'started');
      try {
        await retryFailedMessage(messageId, user.uid);
        analytics.track({
          name: 'feature_used',
          properties: { feature: 'retry_failed_message' },
        });
        analytics.funnelStep('messaging', 'message_retry', 'completed');
      } catch (error) {
        analytics.funnelStep('messaging', 'message_retry', 'failed', {
          reason: error instanceof Error ? error.message : 'unknown_error',
        });
        addToast({
          type: 'error',
          title: 'Retry failed',
          description: 'Message could not be resent. Please try again.',
        });
      }
    },
    [user, retryFailedMessage, addToast]
  );

  const formatDateHeader = (dateKey: string) => {
    const date = new Date(dateKey);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  // Build a flat list of items: date headers + message rows for Virtuoso.
  type ChatItem =
    | { kind: 'date-header'; dateKey: string }
    | { kind: 'message'; message: Message; showAvatar: boolean };

  const chatItems: ChatItem[] = useMemo(() => {
    const items: ChatItem[] = [];
    let currentDateKey: string | null = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const dateKey = format(new Date(msg.timestamp), 'yyyy-MM-dd');

      if (dateKey !== currentDateKey) {
        items.push({ kind: 'date-header', dateKey });
        currentDateKey = dateKey;
      }

      const isOwn = msg.senderId === user?.uid;
      // Show avatar for the first message in a run from the same sender within a date group
      const prevInDate =
        i > 0 && format(new Date(messages[i - 1].timestamp), 'yyyy-MM-dd') === dateKey
          ? messages[i - 1]
          : null;
      const showAvatar = !isOwn && (!prevInDate || prevInDate.senderId !== msg.senderId);

      items.push({ kind: 'message', message: msg, showAvatar });
    }

    return items;
  }, [messages, user?.uid]);

  const composeDisabled = !isOnline || reconnecting;

  if (initializing) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-gray-500">Loading conversation...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="mb-4 text-gray-500">Match not found</p>
        <Link href="/messages">
          <Button variant="outline">Back to Messages</Button>
        </Link>
      </div>
    );
  }

  return (
    <ContentProtectionProvider enabled={true} showWarningOnScreenshot={true} blurIntensity="heavy">
      <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => router.back()}
            className="-ml-2 rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <Link href={`/profile/${match.otherUserId}`} className="flex flex-1 items-center gap-3">
            <div className="relative">
              <Avatar size="md">
                {match.otherUserPhotoUrl ? (
                  <AvatarImage src={match.otherUserPhotoUrl} alt={match.otherUserName || ''} />
                ) : (
                  <AvatarFallback>{match.otherUserName?.charAt(0) || '?'}</AvatarFallback>
                )}
              </Avatar>
              {/* Online indicator */}
              <span
                className={cn(
                  'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-gray-800',
                  isOnline ? 'bg-green-500' : 'bg-amber-400'
                )}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-semibold">{match.otherUserName || 'Unknown'}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {!isOnline ? (
                  <span className="text-amber-600 dark:text-amber-400">Offline</span>
                ) : reconnecting ? (
                  <span className="text-primary">Reconnecting...</span>
                ) : typingIndicator ? (
                  <span className="text-primary">Typing...</span>
                ) : (
                  'Active now'
                )}
              </p>
            </div>
          </Link>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <PinButton matchId={match.id} isPinned={Boolean(match.pinnedForUser)} />
            <button
              className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Voice call"
            >
              <Phone className="h-5 w-5" />
            </button>
            <button
              className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Video call"
            >
              <Video className="h-5 w-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="More options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {/* Dropdown menu */}
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        window.open('/help#safety', '_blank');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Shield className="h-4 w-4" />
                      Safety tips
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowReportDialog(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-amber-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Flag className="h-4 w-4" />
                      Report
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowUnmatchDialog(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <UserX className="h-4 w-4" />
                      Unmatch
                    </button>
                    <hr className="my-1 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteDialog(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete chat
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {!isOnline && (
          <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 dark:border-amber-700/50 dark:bg-amber-900/20">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                <WifiOff className="h-4 w-4" />
                You are offline. Messages will send after reconnection.
              </div>
              <button
                onClick={() => void reconnectConversation(false)}
                className="rounded-md p-1.5 text-amber-800 transition-colors hover:bg-amber-200/70 dark:text-amber-200 dark:hover:bg-amber-800/40"
                aria-label="Retry reconnect"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {isOnline && reconnecting && (
          <div className="border-b border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Reconnecting chat stream...
            </div>
          </div>
        )}

        {/* Messages — virtualized list */}
        {messages.length === 0 && !loading ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
            <Avatar size="2xl" className="mb-4">
              {match.otherUserPhotoUrl ? (
                <AvatarImage src={match.otherUserPhotoUrl} alt={match.otherUserName || ''} />
              ) : (
                <AvatarFallback className="text-4xl">
                  {match.otherUserName?.charAt(0) || '?'}
                </AvatarFallback>
              )}
            </Avatar>
            <h2 className="mb-1 text-xl font-semibold">{match.otherUserName}</h2>
            <p className="mb-4 max-w-xs text-center text-gray-500">
              You matched with {match.otherUserName}! Say something nice to start the conversation.
            </p>
            {match.isSuperLike && (
              <Badge variant="premium" className="mb-2">
                ⭐ Super Liked you
              </Badge>
            )}
            <div className="mt-5 w-full max-w-md">
              <IceBreakers
                matchName={match.otherUserName}
                onSelect={(message) => {
                  analytics.track({
                    name: 'ice_breaker_used',
                    properties: { category: 'full_panel' },
                  });
                  handleInputChange(message);
                }}
              />
            </div>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            className="flex-1"
            data={chatItems}
            firstItemIndex={firstItemIndex}
            initialTopMostItemIndex={chatItems.length - 1}
            followOutput="smooth"
            startReached={handleStartReached}
            overscan={300}
            components={{
              Header: () =>
                loadingMore ? (
                  <div className="flex justify-center py-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : null,
              Footer: () =>
                typingIndicator ? (
                  <div className="mb-2 flex items-end gap-2 px-4">
                    <Avatar size="sm">
                      {match.otherUserPhotoUrl ? (
                        <AvatarImage
                          src={match.otherUserPhotoUrl}
                          alt={`${match.otherUserName}'s photo`}
                        />
                      ) : (
                        <AvatarFallback>{match.otherUserName?.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="rounded-2xl rounded-bl-md bg-gray-200 px-4 py-3 dark:bg-gray-700">
                      <div className="flex gap-1">
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                          style={{ animationDelay: '150ms' }}
                        />
                        <span
                          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null,
            }}
            itemContent={(_index, item) => {
              if (item.kind === 'date-header') {
                return (
                  <div className="my-4 flex justify-center px-4">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-gray-800">
                      {formatDateHeader(item.dateKey)}
                    </span>
                  </div>
                );
              }

              const { message, showAvatar } = item;
              const isOwn = message.senderId === user?.uid;

              return (
                <div className="px-4">
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    otherUserPhoto={match.otherUserPhotoUrl}
                    otherUserName={match.otherUserName}
                    currentUserId={user?.uid}
                    onImageClick={setZoomedImage}
                    onReaction={(messageId, emoji) =>
                      user && toggleReaction(messageId, user.uid, emoji)
                    }
                    onEdit={(messageId, newContent) =>
                      user ? editMessage(messageId, user.uid, newContent) : Promise.resolve()
                    }
                    onDelete={(messageId) =>
                      user ? deleteMessage(messageId, user.uid) : Promise.resolve()
                    }
                    onRetry={handleRetryFailedMessage}
                  />
                </div>
              );
            }}
          />
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="relative inline-block">
              {selectedFile?.type.startsWith('video/') ? (
                <video
                  src={imagePreview}
                  controls
                  playsInline
                  className="max-h-32 w-auto rounded-lg"
                />
              ) : (
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={128}
                  height={128}
                  className="max-h-32 w-auto rounded-lg object-cover"
                  unoptimized
                />
              )}
              <button
                onClick={cancelImageSelection}
                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={handleSendImage}
                disabled={uploadingImage || composeDisabled}
                className="flex items-center gap-2"
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Photo
                  </>
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelImageSelection}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Voice Recorder */}
          {showVoiceRecorder ? (
            <VoiceNoteRecorder
              onSend={handleSendVoice}
              onCancel={() => setShowVoiceRecorder(false)}
              maxDuration={60}
            />
          ) : (
            <div className="space-y-2">
              <InlineIceBreakers
                onSelect={(message) => {
                  analytics.track({
                    name: 'ice_breaker_used',
                    properties: { category: 'inline_quick' },
                  });
                  handleInputChange(message);
                }}
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach image"
                  disabled={composeDisabled}
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>

                <button
                  onClick={() => setShowVoiceRecorder(true)}
                  aria-label="Record voice note"
                  disabled={composeDisabled}
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Mic className="h-5 w-5" />
                </button>

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    disabled={composeDisabled}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder={
                      composeDisabled ? 'Reconnect to continue chatting...' : 'Type a message...'
                    }
                    className="w-full rounded-full bg-gray-100 px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 dark:bg-gray-700"
                  />
                  <button
                    aria-label="Open emoji picker"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                </div>

                <button
                  onClick={() => void handleSend()}
                  disabled={!inputValue.trim() || composeDisabled}
                  aria-label="Send message"
                  className={cn(
                    'rounded-full p-2.5 transition-all',
                    inputValue.trim() && !composeDisabled
                      ? 'hover:bg-primary-dark bg-primary text-white'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
                  )}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Report Dialog */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Report {match.otherUserName}</DialogTitle>
              <DialogDescription>
                Help us understand what happened. Your report will be reviewed by our team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                {[
                  'Inappropriate messages',
                  'Fake profile',
                  'Spam or scam',
                  'Harassment',
                  'Other',
                ].map((reason) => (
                  <label
                    key={reason}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                      reportReason === reason
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                    )}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={reportReason === reason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="text-primary"
                    />
                    <span className="text-sm">{reason}</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReport}
                disabled={!reportReason || actionLoading}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {actionLoading ? 'Submitting...' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unmatch Dialog */}
        <Dialog open={showUnmatchDialog} onOpenChange={setShowUnmatchDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Unmatch {match.otherUserName}?</DialogTitle>
              <DialogDescription>
                This will remove {match.otherUserName} from your matches and delete your
                conversation. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUnmatchDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleUnmatch} disabled={actionLoading}>
                {actionLoading ? 'Unmatching...' : 'Unmatch'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Chat Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete this conversation?</DialogTitle>
              <DialogDescription>
                This will permanently delete all messages in this conversation. This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteChat} disabled={actionLoading}>
                {actionLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Zoom Modal */}
        {zoomedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={() => setZoomedImage(null)}
          >
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
            >
              <X className="h-6 w-6 text-white" />
            </button>
            <ProtectedImage
              src={zoomedImage}
              alt="Zoomed image"
              className="max-h-[90vh] max-w-[90vw] object-contain"
              showWatermark={true}
              watermarkUsername={user?.displayName || user?.email?.split('@')[0] || 'User'}
            />
          </div>
        )}
      </div>
    </ContentProtectionProvider>
  );
}

// Available reactions
const REACTION_EMOJIS: MessageReactionType[] = ['❤️', '😂', '😮', '😢', '😡', '👍'];

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  otherUserPhoto?: string;
  otherUserName?: string;
  currentUserId?: string;
  onImageClick?: (imageUrl: string) => void;
  onReaction?: (messageId: string, emoji: MessageReactionType) => void;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onRetry?: (messageId: string) => Promise<void>;
}

function MessageBubble({
  message,
  isOwn,
  showAvatar,
  otherUserPhoto,
  otherUserName,
  currentUserId,
  onImageClick,
  onReaction,
  onEdit,
  onDelete,
  onRetry,
}: MessageBubbleProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const time = format(new Date(message.timestamp), 'h:mm a');
  const isImage = message.type === 'image';
  const isAudio = message.type === 'audio';
  const isVideo = message.type === 'video';
  const isDeleted = message.isDeleted;

  // Check if message can be edited (within 15 minutes)
  const messageTime = new Date(message.timestamp).getTime();
  const canEdit =
    isOwn &&
    !isDeleted &&
    !isImage &&
    !isAudio &&
    !isVideo &&
    Date.now() - messageTime < 15 * 60 * 1000;
  const canDelete = isOwn && !isDeleted;

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }

    setEditLoading(true);
    try {
      await onEdit?.(message.id, editContent.trim());
      setIsEditing(false);
    } catch {
      setEditContent(message.content);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await onDelete?.(message.id);
      setShowMessageMenu(false);
    } catch {
      // Error handled by store
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!onRetry) {
      return;
    }

    setRetryLoading(true);
    try {
      await onRetry(message.id);
    } finally {
      setRetryLoading(false);
    }
  };
  const imageUrl = message.metadata?.imageUrl || message.content;

  // Group reactions by emoji
  const reactionGroups = (message.reactions || []).reduce(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction.userId);
      return acc;
    },
    {} as Record<string, string[]>
  );

  // Check if current user has reacted with each emoji
  const userReaction = message.reactions?.find((r) => r.userId === currentUserId)?.emoji;

  const handleReaction = (emoji: MessageReactionType) => {
    onReaction?.(message.id, emoji);
    setShowReactionPicker(false);
  };

  return (
    <div className={cn('group relative mb-2 flex items-end gap-2', isOwn && 'flex-row-reverse')}>
      {/* Avatar */}
      {!isOwn && (
        <div className="w-8">
          {showAvatar && (
            <Avatar size="sm">
              {otherUserPhoto ? (
                <AvatarImage src={otherUserPhoto} alt={otherUserName || ''} />
              ) : (
                <AvatarFallback>{otherUserName?.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
          )}
        </div>
      )}

      {/* Message bubble container */}
      <div className="relative max-w-[70%]">
        {/* Reaction button (shows on hover) */}
        <button
          onClick={() => setShowReactionPicker(!showReactionPicker)}
          className={cn(
            'absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-gray-100 p-1.5 opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 dark:bg-gray-800 dark:hover:bg-gray-700',
            isOwn ? '-left-8' : '-right-8'
          )}
        >
          <Smile className="h-4 w-4 text-gray-500" />
        </button>

        {/* Reaction picker popup */}
        {showReactionPicker && (
          <div
            className={cn(
              'absolute bottom-full z-20 mb-2 flex gap-1 rounded-full border bg-white px-2 py-1 shadow-lg dark:bg-gray-800',
              isOwn ? 'right-0' : 'left-0'
            )}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
                  userReaction === emoji && 'bg-primary/20'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Message menu for own messages */}
        {isOwn && !isDeleted && (
          <div className="relative">
            <button
              onClick={() => setShowMessageMenu(!showMessageMenu)}
              className={cn(
                'absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-gray-100 p-1.5 opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 dark:bg-gray-800 dark:hover:bg-gray-700',
                '-left-16'
              )}
            >
              <MoreVertical className="h-4 w-4 text-gray-500" />
            </button>

            {/* Message options menu */}
            {showMessageMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMessageMenu(false)} />
                <div className="absolute bottom-full left-0 z-20 mb-2 min-w-[120px] rounded-lg border bg-white px-1 py-1 shadow-lg dark:bg-gray-800">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMessageMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {deleteLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Unsend
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'overflow-hidden rounded-2xl',
            isImage ? 'p-1' : isAudio ? 'p-3' : 'px-4 py-2.5',
            isOwn
              ? 'rounded-br-md bg-primary text-white'
              : 'rounded-bl-md bg-gray-200 dark:bg-gray-700',
            isDeleted &&
              'border border-dashed border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800'
          )}
          onDoubleClick={() => !isDeleted && setShowReactionPicker(!showReactionPicker)}
        >
          {isDeleted ? (
            <p className="text-sm italic text-gray-500 dark:text-gray-500">Message deleted</p>
          ) : isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEdit();
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }
                }}
                className="w-full rounded bg-white/20 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-white/50"
                autoFocus
              />
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="rounded p-1 hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={handleEdit}
                  disabled={editLoading}
                  className="rounded p-1 hover:bg-white/20"
                >
                  {editLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ) : isImage ? (
            <div className="group/img relative">
              <Image
                src={imageUrl}
                alt="Shared image"
                width={300}
                height={300}
                className="max-w-full cursor-pointer rounded-xl transition-opacity hover:opacity-90"
                style={{ maxHeight: '300px', width: 'auto', height: 'auto' }}
                onClick={() => onImageClick?.(imageUrl)}
                sizes="(max-width: 768px) 70vw, 300px"
              />
              <button
                onClick={() => onImageClick?.(imageUrl)}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 opacity-0 transition-opacity group-hover/img:opacity-100"
              >
                <ZoomIn className="h-4 w-4 text-white" />
              </button>
            </div>
          ) : isAudio ? (
            <VoiceNotePlayer
              audioUrl={message.metadata?.audioUrl || message.content}
              duration={message.metadata?.audioDuration}
              isOwn={isOwn}
            />
          ) : isVideo ? (
            // Native controls keep sound, scrubbing and fullscreen working on
            // every browser; playsInline avoids iOS hijacking the page.
            <video
              src={message.metadata?.videoUrl || message.content}
              controls
              playsInline
              preload="metadata"
              className="max-h-[320px] max-w-full rounded-xl"
            />
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content}
            </p>
          )}
          <div
            className={cn(
              'mt-1 flex items-center gap-1',
              isOwn ? 'justify-end' : 'justify-start',
              (isImage || isAudio || isVideo) && 'px-2 pb-1'
            )}
          >
            {/* Edited indicator */}
            {message.editedAt && !isDeleted && (
              <span className={cn('text-xs', isOwn ? 'text-white/50' : 'text-gray-500')}>
                edited
              </span>
            )}
            <span className={cn('text-xs', isOwn ? 'text-white/70' : 'text-gray-500')}>{time}</span>
            {/* Status indicator for own messages */}
            {isOwn && !isDeleted && (
              <span className="text-xs text-white/70">
                {message.status === 'sending' && '○'}
                {message.status === 'sent' && '✓'}
                {message.status === 'delivered' && '✓✓'}
                {message.status === 'read' && <span className="text-blue-300">✓✓</span>}
                {message.status === 'failed' && (
                  <button
                    onClick={handleRetry}
                    disabled={retryLoading}
                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-red-200 hover:bg-white/15 disabled:opacity-60"
                  >
                    {retryLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <span className="text-red-300">!</span>
                    )}
                    <span className="text-[10px] uppercase tracking-wide">Retry</span>
                  </button>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reactions display */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className={cn('absolute -bottom-3 flex gap-0.5', isOwn ? 'right-2' : 'left-2')}>
            {Object.entries(reactionGroups).map(([emoji, userIds]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji as MessageReactionType)}
                className={cn(
                  'flex items-center gap-0.5 rounded-full border bg-white px-1.5 py-0.5 text-xs shadow-sm dark:bg-gray-800',
                  userIds.includes(currentUserId || '') && 'border-primary'
                )}
              >
                <span>{emoji}</span>
                {userIds.length > 1 && <span className="text-gray-500">{userIds.length}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
