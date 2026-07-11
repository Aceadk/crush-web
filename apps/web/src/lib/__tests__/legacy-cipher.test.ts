import { describe, expect, it } from 'vitest';
import {
  decodeLegacyEncryptedContent,
  isLegacyEncryptedContent,
  LEGACY_ENCRYPTED_FALLBACK,
} from '@crush/core';

const MATCH_ID = 'match-abc';
const USER_A = 'uid-alpha';
const USER_B = 'uid-beta';

function bytesToBase64Url(bytes: Uint8Array): string {
  let raw = '';
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Produce a payload exactly as the mobile app's _encryptContent did:
 * AES-GCM-256 with key = SHA-256(matchId|sortedUids|pepper), payload =
 * enc_v1:b64url(nonce).b64url(ciphertext).b64url(tag).
 */
async function encryptLikeMobile(content: string): Promise<string> {
  const ids = [USER_A, USER_B].sort();
  const material = `${MATCH_ID}|${ids[0]}|${ids[1]}|crushhour_e2ee_v1`;
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(material)
  );
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const nonce = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(
    await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      new TextEncoder().encode(content)
    )
  );
  // WebCrypto returns ciphertext||tag; mobile stored them separately.
  const cipherText = sealed.slice(0, sealed.length - 16);
  const tag = sealed.slice(sealed.length - 16);
  return `enc_v1:${bytesToBase64Url(nonce)}.${bytesToBase64Url(cipherText)}.${bytesToBase64Url(tag)}`;
}

describe('legacy enc_v1 chat cipher', () => {
  it('detects legacy-encrypted content', () => {
    expect(isLegacyEncryptedContent('enc_v1:abc.def.ghi')).toBe(true);
    expect(isLegacyEncryptedContent('hello')).toBe(false);
  });

  it('round-trips a mobile-format payload', async () => {
    const payload = await encryptLikeMobile('hey, coffee this weekend? ☕');
    const decoded = await decodeLegacyEncryptedContent({
      matchId: MATCH_ID,
      fromUserId: USER_A,
      toUserId: USER_B,
      content: payload,
    });
    expect(decoded).toBe('hey, coffee this weekend? ☕');
  });

  it('is direction-agnostic (uids are sorted before key derivation)', async () => {
    const payload = await encryptLikeMobile('direction test');
    const decoded = await decodeLegacyEncryptedContent({
      matchId: MATCH_ID,
      fromUserId: USER_B,
      toUserId: USER_A,
      content: payload,
    });
    expect(decoded).toBe('direction test');
  });

  it('returns null for a wrong conversation key', async () => {
    const payload = await encryptLikeMobile('secret');
    const decoded = await decodeLegacyEncryptedContent({
      matchId: 'different-match',
      fromUserId: USER_A,
      toUserId: USER_B,
      content: payload,
    });
    expect(decoded).toBeNull();
  });

  it('returns null for malformed payloads', async () => {
    expect(
      await decodeLegacyEncryptedContent({
        matchId: MATCH_ID,
        fromUserId: USER_A,
        toUserId: USER_B,
        content: 'enc_v1:not-a-valid-payload',
      })
    ).toBeNull();
  });

  it('passes plaintext through unchanged', async () => {
    expect(
      await decodeLegacyEncryptedContent({
        matchId: MATCH_ID,
        fromUserId: USER_A,
        toUserId: USER_B,
        content: 'plain text',
      })
    ).toBe('plain text');
  });

  it('exports a user-facing fallback that is not ciphertext', () => {
    expect(LEGACY_ENCRYPTED_FALLBACK).not.toContain('enc_v1');
  });
});
