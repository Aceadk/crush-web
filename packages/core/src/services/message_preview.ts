import { isLegacyEncryptedContent } from './legacy_cipher';

/**
 * Human-readable, media-safe one-line preview for a conversation's last
 * message. Mirrors the mobile app's `messagePreviewText` (see
 * lib/features/chat/presentation/widgets/message_preview.dart) so both clients
 * render the same conversation-list previews from the same denormalized
 * `matches/{id}.lastMessage*` fields.
 *
 * Guarantees: never a raw storage URL, never legacy ciphertext — media and
 * unreadable payloads always collapse to a readable label.
 *
 * The "You:" prefix is intentionally NOT added here; callers prepend it at
 * render time when they know the message is the viewer's own.
 */
export function messagePreview(
  content: string | undefined | null,
  type: string | undefined | null,
): string | undefined {
  const trimmed = (content ?? '').trim();

  switch (type) {
    case 'image':
      return 'Photo';
    case 'video':
      return 'Video';
    // 'voice' is the mobile type; 'audio' is the web type for the same kind.
    case 'voice':
    case 'audio':
      return 'Voice message';
    case 'gif':
      return 'GIF';
    default:
      break;
  }

  if (trimmed.length === 0) return undefined;
  // Legacy E2EE ciphertext must never leak into the list.
  if (isLegacyEncryptedContent(trimmed)) return '🔒 Message';
  // A bare storage URL as the entire content is an attachment, not text.
  if (looksLikeBareUrl(trimmed)) return 'Attachment';
  return trimmed;
}

function looksLikeBareUrl(value: string): boolean {
  if (value.includes(' ')) return false;
  return value.startsWith('http://') || value.startsWith('https://');
}
