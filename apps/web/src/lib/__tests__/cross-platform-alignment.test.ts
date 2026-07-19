/**
 * Cross-platform alignment contract tests.
 *
 * These lock the web behaviors that must stay in step with the mobile app on
 * the SHARED Firestore data model (see the App↔Web alignment audit, 2026-07-18):
 *   - conversation-list previews are media-safe and never leak a storage URL
 *   - discovery identity is username-first ("@handle")
 */

import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { messagePreview } from '@crush/core/services/message_preview';
import { discoveryDisplayName } from '@crush/core/services/discovery_rest';
import { mapUserDocumentToUserProfile } from '@crush/core/services/user_document';
import {
  isPresenceOnline,
  PRESENCE_FRESHNESS_MS,
} from '@crush/core/services/presence';

describe('messagePreview — media-safe conversation previews (ALIGN-2)', () => {
  it('maps media types to readable labels, never the raw content/URL', () => {
    expect(
      messagePreview('https://firebasestorage.googleapis.com/x/photo.jpg', 'image')
    ).toBe('Photo');
    expect(
      messagePreview('https://firebasestorage.googleapis.com/x/clip.mp4', 'video')
    ).toBe('Video');
    // 'voice' is the mobile type; 'audio' is the web type — both are voice notes.
    expect(messagePreview(null, 'voice')).toBe('Voice message');
    expect(messagePreview('https://firebasestorage.googleapis.com/x/n.m4a', 'audio')).toBe(
      'Voice message'
    );
    expect(messagePreview('anything', 'gif')).toBe('GIF');
  });

  it('passes plain text through unchanged', () => {
    expect(messagePreview('hey there', 'text')).toBe('hey there');
    expect(messagePreview('look at https://example.com cool', 'text')).toBe(
      'look at https://example.com cool'
    );
  });

  it('masks legacy ciphertext and bare storage URLs', () => {
    expect(messagePreview('enc_v1:AAAABBBB', undefined)).toBe('🔒 Message');
    expect(
      messagePreview('https://firebasestorage.googleapis.com/v0/b/x/photo.jpg', undefined)
    ).toBe('Attachment');
  });

  it('returns undefined for an empty message so the list can show a fallback', () => {
    expect(messagePreview('   ', undefined)).toBeUndefined();
    expect(messagePreview(undefined, undefined)).toBeUndefined();
  });
});

describe('discoveryDisplayName — username-first identity (ALIGN-4)', () => {
  it('prefers the @handle when a username exists', () => {
    expect(discoveryDisplayName({ username: 'renu_ktm', displayName: 'Renu' })).toBe('@renu_ktm');
  });

  it('falls back to the (privacy-gated) display name without a username', () => {
    expect(discoveryDisplayName({ username: undefined, displayName: 'Renu' })).toBe('Renu');
    expect(discoveryDisplayName({ username: '  ', displayName: 'Renu' })).toBe('Renu');
  });
});

describe('privacy canonical settings — cross-platform read (ALIGN-1)', () => {
  it('reflects a deliberate mobile-set showOnlineStatus (privacySettings v2)', () => {
    const profile = mapUserDocumentToUserProfile('u1', {
      profile: {
        privacySettings: { showOnlineStatus: false, privacySchemaVersion: 2 },
      },
    });
    // Canonical privacySettings wins even though top-level settings is absent
    // (default true) — so a value set on the mobile app shows correctly here.
    expect(profile.settings?.showOnlineStatus).toBe(false);
  });

  it('ignores a legacy privacySettings value without the v2 marker', () => {
    const profile = mapUserDocumentToUserProfile('u1', {
      // No privacySchemaVersion: this is an incidental legacy default, not a
      // deliberate choice — it must NOT hide the user.
      profile: { privacySettings: { showOnlineStatus: false } },
    });
    expect(profile.settings?.showOnlineStatus).toBe(true);
  });

  it('defaults to visible when no privacy data exists', () => {
    const profile = mapUserDocumentToUserProfile('u1', {});
    expect(profile.settings?.showOnlineStatus).toBe(true);
  });
});

describe('presence freshness — matches the mobile rule (ALIGN-3)', () => {
  const now = 1_800_000_000_000;

  it('is online only when flagged online AND fresh within the window', () => {
    expect(
      isPresenceOnline({ isOnline: true, lastSeen: Timestamp.fromMillis(now - 1000) }, now)
    ).toBe(true);
  });

  it('is offline when the heartbeat is stale beyond the window', () => {
    expect(
      isPresenceOnline(
        { isOnline: true, lastSeen: Timestamp.fromMillis(now - PRESENCE_FRESHNESS_MS - 1) },
        now
      )
    ).toBe(false);
  });

  it('is offline when explicitly flagged offline, or when data is missing', () => {
    expect(
      isPresenceOnline({ isOnline: false, lastSeen: Timestamp.fromMillis(now) }, now)
    ).toBe(false);
    expect(isPresenceOnline(undefined, now)).toBe(false);
    expect(isPresenceOnline({ isOnline: true }, now)).toBe(false);
  });
})
