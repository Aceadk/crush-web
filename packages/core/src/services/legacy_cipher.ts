/**
 * Decoder for the mobile app's legacy "enc_v1:" chat obfuscation.
 *
 * The Flutter app used to AES-GCM-encrypt text messages with a key DERIVED
 * ENTIRELY FROM PUBLIC INPUTS — SHA-256(matchId|uid1|uid2|staticPepper) with
 * the pepper compiled into the app — so this was never real end-to-end
 * encryption, just encoding. It broke cross-platform chat (web rendered raw
 * ciphertext), chat-list previews, and server-side safety moderation, so new
 * messages are sent as plaintext again. This module exists only so message
 * HISTORY written by older mobile builds still renders on the web.
 *
 * Wire format: `enc_v1:` + base64url(nonce12) . base64url(ciphertext) .
 * base64url(gcmTag16). WebCrypto's AES-GCM expects ciphertext||tag
 * concatenated, so the parts are rejoined before decrypting.
 */

const LEGACY_PREFIX = 'enc_v1:';
const LEGACY_PEPPER = 'crushhour_e2ee_v1';

export function isLegacyEncryptedContent(content: string): boolean {
  return content.startsWith(LEGACY_PREFIX);
}

/** Shown when a legacy message cannot be decoded (never show raw ciphertext). */
export const LEGACY_ENCRYPTED_FALLBACK = '🔒 Encrypted message';

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

async function deriveLegacyKey(
  matchId: string,
  userA: string,
  userB: string
): Promise<CryptoKey> {
  const ids = [userA, userB].sort();
  const material = `${matchId}|${ids[0]}|${ids[1]}|${LEGACY_PEPPER}`;
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(material)
  );
  return globalThis.crypto.subtle.importKey(
    'raw',
    digest,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
}

/**
 * Decode a legacy-encrypted message. Returns the plaintext, or null when the
 * payload is malformed / the key does not match (caller should substitute
 * [LEGACY_ENCRYPTED_FALLBACK]).
 */
export async function decodeLegacyEncryptedContent(params: {
  matchId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
}): Promise<string | null> {
  const { matchId, fromUserId, toUserId, content } = params;
  if (!isLegacyEncryptedContent(content)) return content;

  const parts = content.slice(LEGACY_PREFIX.length).split('.');
  if (parts.length !== 3) return null;

  try {
    const nonce = base64UrlToBytes(parts[0]);
    const cipherText = base64UrlToBytes(parts[1]);
    const tag = base64UrlToBytes(parts[2]);

    // WebCrypto wants ciphertext||tag as a single buffer.
    const combined = new Uint8Array(cipherText.length + tag.length);
    combined.set(cipherText);
    combined.set(tag, cipherText.length);

    const key = await deriveLegacyKey(matchId, fromUserId, toUserId);
    const clear = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce.buffer as ArrayBuffer },
      key,
      combined.buffer as ArrayBuffer
    );
    return new TextDecoder().decode(clear);
  } catch {
    return null;
  }
}
