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
import {
  discoveryDisplayName,
  discoveryFiltersFromProfile,
  mapDiscoveryRestProfiles,
} from '@crush/core/services/discovery_rest';
import { mapUserDocumentToUserProfile } from '@crush/core/services/user_document';
import { isPresenceOnline, PRESENCE_FRESHNESS_MS } from '@crush/core/services/presence';
import { DEFAULT_DISCOVERY_FILTERS, isMatchClearedForViewer } from '@crush/core/types/match';
import { DEFAULT_USER_SETTINGS } from '@crush/core/types/user';

describe('messagePreview — media-safe conversation previews (ALIGN-2)', () => {
  it('maps media types to readable labels, never the raw content/URL', () => {
    expect(messagePreview('https://firebasestorage.googleapis.com/x/photo.jpg', 'image')).toBe(
      'Photo'
    );
    expect(messagePreview('https://firebasestorage.googleapis.com/x/clip.mp4', 'video')).toBe(
      'Video'
    );
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
    // Bare handle, no "@" sigil — the handle IS the name on discovery surfaces.
    expect(discoveryDisplayName({ username: 'renu_ktm', displayName: 'Renu' })).toBe('renu_ktm');
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

  it('is online when any client heartbeat is fresh within the window', () => {
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

  it('does not let one closing client hide another fresh session', () => {
    expect(isPresenceOnline({ isOnline: false, lastSeen: Timestamp.fromMillis(now) }, now)).toBe(
      true
    );
  });

  it('is offline when heartbeat data is missing', () => {
    expect(isPresenceOnline(undefined, now)).toBe(false);
    expect(isPresenceOnline({ isOnline: true }, now)).toBe(false);
  });
});

describe('isMatchClearedForViewer — per-user "delete chat" (ALIGN-5)', () => {
  it('is not cleared when the viewer never deleted the chat', () => {
    expect(
      isMatchClearedForViewer({ clearedAt: undefined, lastMessageAt: '2026-07-01T10:00:00.000Z' })
    ).toBe(false);
  });

  it('is cleared when nothing has arrived since the watermark', () => {
    expect(
      isMatchClearedForViewer({
        clearedAt: '2026-07-01T12:00:00.000Z',
        lastMessageAt: '2026-07-01T10:00:00.000Z',
      })
    ).toBe(true);
  });

  it('comes back as soon as a newer message arrives', () => {
    expect(
      isMatchClearedForViewer({
        clearedAt: '2026-07-01T12:00:00.000Z',
        lastMessageAt: '2026-07-01T12:00:01.000Z',
      })
    ).toBe(false);
  });

  it('stays cleared for a conversation that never had a message', () => {
    expect(
      isMatchClearedForViewer({ clearedAt: '2026-07-01T12:00:00.000Z', lastMessageAt: undefined })
    ).toBe(true);
  });
});

describe('discoveryFiltersFromProfile — same deck rule as mobile (ALIGN-6)', () => {
  it('seeds from the account’s saved preferences, not a hardcoded default', () => {
    expect(
      discoveryFiltersFromProfile({
        settings: { ...DEFAULT_USER_SETTINGS, ageRangeMin: 24, ageRangeMax: 33, maxDistance: 12 },
        interestedIn: ['female'],
      })
    ).toEqual({ minAge: 24, maxAge: 33, maxDistance: 12, genders: ['female'] });
  });

  it('omits genders entirely when none are saved, so the backend uses its own fallback', () => {
    const filters = discoveryFiltersFromProfile({ settings: undefined, interestedIn: [] });
    expect(filters).toEqual(DEFAULT_DISCOVERY_FILTERS);
    expect('genders' in filters).toBe(false);
  });

  it('falls back to the shared defaults for a profile that has not loaded', () => {
    expect(discoveryFiltersFromProfile(null)).toEqual(DEFAULT_DISCOVERY_FILTERS);
  });
});

describe('mapDiscoveryRestProfiles — mirrors the mobile deck exclusions (ALIGN-7)', () => {
  it('drops candidates with no photos, exactly as the app does', () => {
    const profiles = mapDiscoveryRestProfiles({
      profiles: [
        { id: 'has-photo', name: 'A', photos: [{ url: 'https://cdn/a.jpg', is_primary: true }] },
        { id: 'no-photo', name: 'B', photos: [] },
      ],
    });
    expect(profiles.map((p) => p.id)).toEqual(['has-photo']);
  });

  it('collapses duplicate ids while preserving server order', () => {
    const profiles = mapDiscoveryRestProfiles({
      profiles: [
        { id: 'a', name: 'A', photos: [{ url: 'https://cdn/a.jpg' }] },
        { id: 'b', name: 'B', photos: [{ url: 'https://cdn/b.jpg' }] },
        { id: 'a', name: 'A again', photos: [{ url: 'https://cdn/a2.jpg' }] },
      ],
    });
    expect(profiles.map((p) => p.id)).toEqual(['a', 'b']);
  });
});
