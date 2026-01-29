'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore, useMessageStore, useMatchStore, storageService, userService, Message, MessageReactionType } from '@crush/core';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@crush/ui';
import { cn } from '@crush/ui';
import {
  ArrowLeft,
  MoreVertical,
  Send,
  Image as ImageIcon,
  Smile,
  Phone,
  Video,
  Shield,
  Flag,
  UserX,
  Trash2,
  Loader2,
  X,
  ZoomIn,
  Pencil,
  Check,
  Mic,
} from 'lucide-react';
import { VoiceNoteRecorder, VoiceNotePlayer } from '@/features/messages/components';
import { format, isToday, isYesterday } from 'date-fns';
import { ContentProtectionProvider, ProtectedImage } from '@/shared/components/content-protection';

interface ChatRoomProps {
  matchId: string;
}

export default function ChatRoom({ matchId }: ChatRoomProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { matches, unmatch } = useMatchStore();
  const {
    currentConversation,
    messages,
    typingIndicator,
    loading,
    loadingMore,
    hasMore,
    openConversation,
    sendMessage,
    sendImageMessage,
    sendVoiceMessage,
    markAsRead,
    setTyping,
    toggleReaction,
    editMessage,
    deleteMessage,
    loadMoreMessages,
    closeConversation,
    blockConversation,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get match info
  const match = matches.find((m) => m.id === matchId);

  // Handle report
  const handleReport = async () => {
    if (!user || !reportReason || !match) return;
    setActionLoading(true);
    try {
      // Submit report to Firestore
      await userService.reportUser(user.uid, match.otherUserId, reportReason);
      setShowReportDialog(false);
      setReportReason('');
      alert('Report submitted. Our team will review it.');
    } catch (error) {
      console.error('Failed to submit report:', error);
      alert('Failed to submit report. Please try again.');
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
    } finally {
      setActionLoading(false);
    }
  };

  // Initialize conversation
  useEffect(() => {
    if (user && match) {
      openConversation(matchId, [user.uid, match.otherUserId], user.uid);
    }

    return () => {
      closeConversation();
    };
  }, [user, match, matchId, openConversation, closeConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !user) return;

    const messageText = inputValue.trim();
    setInputValue('');

    // Stop typing indicator
    setTyping(user.uid, false);

    await sendMessage(messageText, user.uid);
  }, [inputValue, user, sendMessage, setTyping]);

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMore || !currentConversation) return;

    if (container.scrollTop === 0) {
      loadMoreMessages(currentConversation.id);
    }
  }, [loadingMore, hasMore, currentConversation, loadMoreMessages]);

  // Handle image selection
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

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

  // Send image message
  const handleSendImage = useCallback(async () => {
    if (!selectedFile || !user || uploadingImage || !currentConversation) return;

    setUploadingImage(true);

    try {
      // Upload image to storage
      const imageUrl = await storageService.uploadChatImage(
        currentConversation.id,
        user.uid,
        selectedFile
      );

      // Send image message
      await sendImageMessage(imageUrl, user.uid);

      // Clear preview
      cancelImageSelection();
    } catch (error) {
      console.error('Failed to send image:', error);
      alert('Failed to send image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  }, [selectedFile, user, uploadingImage, currentConversation, sendImageMessage, cancelImageSelection]);

  // Send voice message
  const handleSendVoice = useCallback(async (audioBlob: Blob, duration: number) => {
    if (!user || !currentConversation) return;

    try {
      // Upload audio to storage
      const audioUrl = await storageService.uploadVoiceNote(
        currentConversation.id,
        user.uid,
        audioBlob
      );

      // Send voice message
      await sendVoiceMessage(audioUrl, duration, user.uid);
    } catch (error) {
      console.error('Failed to send voice note:', error);
      alert('Failed to send voice note. Please try again.');
      throw error;
    }
  }, [user, currentConversation, sendVoiceMessage]);

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.timestamp);
    const dateKey = format(date, 'yyyy-MM-dd');

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  const formatDateHeader = (dateKey: string) => {
    const date = new Date(dateKey);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-gray-500 mb-4">Match not found</p>
        <Link href="/messages">
          <Button variant="outline">Back to Messages</Button>
        </Link>
      </div>
    );
  }

  return (
    <ContentProtectionProvider
      enabled={true}
      showWarningOnScreenshot={true}
      blurIntensity="heavy"
    >
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <Link href={`/profile/${match.otherUserId}`} className="flex items-center gap-3 flex-1">
          <div className="relative">
            <Avatar size="md">
              {match.otherUserPhotoUrl ? (
                <AvatarImage src={match.otherUserPhotoUrl} alt={match.otherUserName || ''} />
              ) : (
                <AvatarFallback>{match.otherUserName?.charAt(0) || '?'}</AvatarFallback>
              )}
            </Avatar>
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{match.otherUserName || 'Unknown'}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {typingIndicator ? (
                <span className="text-primary">typing...</span>
              ) : (
                'Active now'
              )}
            </p>
          </div>
        </Link>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
            <Video className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown menu */}
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      window.open('/help#safety', '_blank');
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <Shield className="w-4 h-4" />
                    Safety tips
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowReportDialog(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-amber-600"
                  >
                    <Flag className="w-4 h-4" />
                    Report
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowUnmatchDialog(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-red-600"
                  >
                    <UserX className="w-4 h-4" />
                    Unmatch
                  </button>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteDialog(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete chat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Match intro card */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Avatar size="2xl" className="mb-4">
              {match.otherUserPhotoUrl ? (
                <AvatarImage src={match.otherUserPhotoUrl} alt={match.otherUserName || ''} />
              ) : (
                <AvatarFallback className="text-4xl">
                  {match.otherUserName?.charAt(0) || '?'}
                </AvatarFallback>
              )}
            </Avatar>
            <h2 className="text-xl font-semibold mb-1">{match.otherUserName}</h2>
            <p className="text-gray-500 text-center max-w-xs mb-4">
              You matched with {match.otherUserName}! Say something nice to start the conversation.
            </p>
            {match.isSuperLike && (
              <Badge variant="premium" className="mb-2">
                ⭐ Super Liked you
              </Badge>
            )}
          </div>
        )}

        {/* Messages grouped by date */}
        {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
          <div key={dateKey}>
            {/* Date header */}
            <div className="flex justify-center my-4">
              <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full">
                {formatDateHeader(dateKey)}
              </span>
            </div>

            {/* Messages */}
            {dateMessages.map((message, index) => {
              const isOwn = message.senderId === user?.uid;
              const showAvatar =
                !isOwn &&
                (index === 0 || dateMessages[index - 1].senderId !== message.senderId);

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  otherUserPhoto={match.otherUserPhotoUrl}
                  otherUserName={match.otherUserName}
                  currentUserId={user?.uid}
                  onImageClick={setZoomedImage}
                  onReaction={(messageId, emoji) => user && toggleReaction(messageId, user.uid, emoji)}
                  onEdit={(messageId, newContent) => user ? editMessage(messageId, user.uid, newContent) : Promise.resolve()}
                  onDelete={(messageId) => user ? deleteMessage(messageId, user.uid) : Promise.resolve()}
                />
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {typingIndicator && (
          <div className="flex items-end gap-2 mb-2">
            <Avatar size="sm">
              {match.otherUserPhotoUrl ? (
                <AvatarImage src={match.otherUserPhotoUrl} alt="" />
              ) : (
                <AvatarFallback>{match.otherUserName?.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
            <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-32 rounded-lg object-cover"
            />
            <button
              onClick={cancelImageSelection}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={handleSendImage}
              disabled={uploadingImage}
              className="flex items-center gap-2"
            >
              {uploadingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
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
      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowVoiceRecorder(true)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500"
            >
              <Mic className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message..."
                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <Smile className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={cn(
                'p-2.5 rounded-full transition-all',
                inputValue.trim()
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
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
              {['Inappropriate messages', 'Fake profile', 'Spam or scam', 'Harassment', 'Other'].map((reason) => (
                <label
                  key={reason}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                    reportReason === reason
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
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
              This will remove {match.otherUserName} from your matches and delete your conversation.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnmatchDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnmatch}
              disabled={actionLoading}
            >
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
              This will permanently delete all messages in this conversation.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChat}
              disabled={actionLoading}
            >
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
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <ProtectedImage
            src={zoomedImage}
            alt="Zoomed image"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            showWatermark={true}
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
}

function MessageBubble({ message, isOwn, showAvatar, otherUserPhoto, otherUserName, currentUserId, onImageClick, onReaction, onEdit, onDelete }: MessageBubbleProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const time = format(new Date(message.timestamp), 'h:mm a');
  const isImage = message.type === 'image';
  const isAudio = message.type === 'audio';
  const isDeleted = message.isDeleted;

  // Check if message can be edited (within 15 minutes)
  const messageTime = new Date(message.timestamp).getTime();
  const canEdit = isOwn && !isDeleted && !isImage && !isAudio && (Date.now() - messageTime) < 15 * 60 * 1000;
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
  const imageUrl = message.metadata?.imageUrl || message.content;

  // Group reactions by emoji
  const reactionGroups = (message.reactions || []).reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction.userId);
    return acc;
  }, {} as Record<string, string[]>);

  // Check if current user has reacted with each emoji
  const userReaction = message.reactions?.find(r => r.userId === currentUserId)?.emoji;

  const handleReaction = (emoji: MessageReactionType) => {
    onReaction?.(message.id, emoji);
    setShowReactionPicker(false);
  };

  return (
    <div className={cn('flex items-end gap-2 mb-2 group relative', isOwn && 'flex-row-reverse')}>
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
            'absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-gray-200 dark:hover:bg-gray-700',
            isOwn ? '-left-8' : '-right-8'
          )}
        >
          <Smile className="w-4 h-4 text-gray-500" />
        </button>

        {/* Reaction picker popup */}
        {showReactionPicker && (
          <div
            className={cn(
              'absolute bottom-full mb-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border px-2 py-1 flex gap-1 z-20',
              isOwn ? 'right-0' : 'left-0'
            )}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg',
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
                'absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-gray-200 dark:hover:bg-gray-700',
                '-left-16'
              )}
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {/* Message options menu */}
            {showMessageMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMessageMenu(false)} />
                <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border px-1 py-1 z-20 min-w-[120px]">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMessageMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={deleteLoading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      {deleteLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
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
            'rounded-2xl overflow-hidden',
            isImage ? 'p-1' : isAudio ? 'p-3' : 'px-4 py-2.5',
            isOwn
              ? 'bg-primary text-white rounded-br-md'
              : 'bg-gray-200 dark:bg-gray-700 rounded-bl-md',
            isDeleted && 'bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600'
          )}
          onDoubleClick={() => !isDeleted && setShowReactionPicker(!showReactionPicker)}
        >
          {isDeleted ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">
              Message deleted
            </p>
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
                className="w-full px-2 py-1 bg-white/20 rounded text-sm focus:outline-none focus:ring-1 focus:ring-white/50"
                autoFocus
              />
              <div className="flex gap-1 justify-end">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="p-1 rounded hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleEdit}
                  disabled={editLoading}
                  className="p-1 rounded hover:bg-white/20"
                >
                  {editLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ) : isImage ? (
            <div className="relative group/img">
              <img
                src={imageUrl}
                alt="Shared image"
                className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxHeight: '300px' }}
                onClick={() => onImageClick?.(imageUrl)}
              />
              <button
                onClick={() => onImageClick?.(imageUrl)}
                className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
              >
                <ZoomIn className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : isAudio ? (
            <VoiceNotePlayer
              audioUrl={message.metadata?.audioUrl || message.content}
              duration={message.metadata?.audioDuration}
              isOwn={isOwn}
            />
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          <div
            className={cn(
              'flex items-center gap-1 mt-1',
              isOwn ? 'justify-end' : 'justify-start',
              (isImage || isAudio) && 'px-2 pb-1'
            )}
          >
            {/* Edited indicator */}
            {message.editedAt && !isDeleted && (
              <span className={cn('text-xs', isOwn ? 'text-white/50' : 'text-gray-400')}>
                edited
              </span>
            )}
            <span className={cn('text-xs', isOwn ? 'text-white/70' : 'text-gray-500')}>
              {time}
            </span>
            {/* Status indicator for own messages */}
            {isOwn && !isDeleted && (
              <span className="text-xs text-white/70">
                {message.status === 'sending' && '○'}
                {message.status === 'sent' && '✓'}
                {message.status === 'delivered' && '✓✓'}
                {message.status === 'read' && (
                  <span className="text-blue-300">✓✓</span>
                )}
                {message.status === 'failed' && (
                  <span className="text-red-300">!</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reactions display */}
        {Object.keys(reactionGroups).length > 0 && (
          <div
            className={cn(
              'absolute -bottom-3 flex gap-0.5',
              isOwn ? 'right-2' : 'left-2'
            )}
          >
            {Object.entries(reactionGroups).map(([emoji, userIds]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji as MessageReactionType)}
                className={cn(
                  'flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded-full shadow-sm border text-xs',
                  userIds.includes(currentUserId || '') && 'border-primary'
                )}
              >
                <span>{emoji}</span>
                {userIds.length > 1 && (
                  <span className="text-gray-500">{userIds.length}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
