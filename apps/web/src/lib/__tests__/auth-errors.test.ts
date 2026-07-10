/**
 * Auth error mapper tests (P1 #6 of the web-mobile alignment audit).
 *
 * Verifies getAuthErrorMessage() turns Firebase Auth codes and Cloud Functions
 * callable (HttpsError) codes into consistent, friendly user-facing messages,
 * and never leaks raw technical strings.
 */

import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage } from '@crush/core/services/auth_errors';

describe('getAuthErrorMessage — Firebase Auth codes', () => {
  const cases: Array<[string, string]> = [
    ['auth/wrong-password', 'Incorrect email or password.'],
    ['auth/invalid-credential', 'Incorrect email or password.'],
    ['auth/user-not-found', 'No account found with that email.'],
    ['auth/invalid-email', 'Please enter a valid email address.'],
    ['auth/email-already-in-use', 'An account with this email already exists.'],
    ['auth/weak-password', 'Password is too weak. Use at least 8 characters.'],
    ['auth/too-many-requests', 'Too many attempts. Please wait a moment and try again.'],
    ['auth/network-request-failed', 'Network error. Check your connection and try again.'],
    ['auth/popup-closed-by-user', 'Sign-in was cancelled.'],
    ['auth/requires-recent-login', 'For your security, please sign in again to complete this action.'],
    ['auth/invalid-action-code', 'This link is invalid or has already been used.'],
    ['auth/expired-action-code', 'This link has expired. Please request a new one.'],
  ];

  it.each(cases)('maps %s', (code, expected) => {
    expect(getAuthErrorMessage({ code, message: `Firebase: Error (${code}).` })).toBe(
      expected
    );
  });

  it('never leaks the raw Firebase technical string', () => {
    const msg = getAuthErrorMessage({
      code: 'auth/wrong-password',
      message: 'Firebase: Error (auth/wrong-password).',
    });
    expect(msg).not.toMatch(/firebase:/i);
    expect(msg).not.toMatch(/auth\//);
  });
});

describe('getAuthErrorMessage — Cloud Functions callable codes', () => {
  it('maps generic status codes to friendly text', () => {
    expect(getAuthErrorMessage({ code: 'functions/unauthenticated' })).toBe(
      'Please sign in to continue.'
    );
    expect(getAuthErrorMessage({ code: 'functions/permission-denied' })).toBe(
      'You do not have permission to do that.'
    );
    expect(getAuthErrorMessage({ code: 'functions/resource-exhausted' })).toBe(
      'You have reached a limit. Please try again later.'
    );
    expect(getAuthErrorMessage({ code: 'unavailable' })).toBe(
      'Service is temporarily unavailable. Please try again.'
    );
  });

  it('prefers the backend message for failed-precondition / invalid-argument', () => {
    expect(
      getAuthErrorMessage({
        code: 'functions/failed-precondition',
        message: 'Unsend is only available on the Plus plan.',
      })
    ).toBe('Unsend is only available on the Plus plan.');
    expect(
      getAuthErrorMessage({
        code: 'functions/invalid-argument',
        message: 'Message must have content or media.',
      })
    ).toBe('Message must have content or media.');
  });

  it('falls back when a prefer-backend code has only a technical message', () => {
    expect(
      getAuthErrorMessage({
        code: 'functions/failed-precondition',
        message: 'Firebase: Error (functions/failed-precondition).',
      })
    ).toBe('Something went wrong. Please try again.');
  });
});

describe('getAuthErrorMessage — fallbacks', () => {
  it('uses the provided fallback for unknown codes', () => {
    expect(getAuthErrorMessage({ code: 'auth/some-new-code' }, 'Sign in failed')).toBe(
      'Sign in failed'
    );
  });

  it('surfaces a clean non-technical message when there is no code', () => {
    expect(getAuthErrorMessage(new Error('Please enter a phone number'))).toBe(
      'Please enter a phone number'
    );
  });

  it('hides a technical message when there is no code', () => {
    expect(
      getAuthErrorMessage(new Error('Firebase: Error (auth/internal-error).'), 'Oops')
    ).toBe('Oops');
  });

  it('handles null/undefined/string inputs', () => {
    expect(getAuthErrorMessage(null)).toBe('Something went wrong. Please try again.');
    expect(getAuthErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(getAuthErrorMessage('Just a string message')).toBe('Just a string message');
  });

  it('normalizes bare codes without a provider prefix', () => {
    expect(getAuthErrorMessage({ code: 'too-many-requests' })).toBe(
      'Too many attempts. Please wait a moment and try again.'
    );
  });
});
