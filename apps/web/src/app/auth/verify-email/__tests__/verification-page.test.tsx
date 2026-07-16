import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refreshEmailVerification: vi.fn(),
  sendEmailVerification: vi.fn(),
  updateEmail: vi.fn(),
  signOut: vi.fn(),
  user: {
    uid: 'email-user',
    email: 'ace@example.com',
    emailVerified: false,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams('redirect=%2Fdiscover'),
}));

vi.mock('@crush/core', () => {
  const state = {
    user: mocks.user,
    loading: false,
    initialized: true,
    signOut: mocks.signOut,
    refreshEmailVerification: mocks.refreshEmailVerification,
  };
  const useAuthStore = Object.assign(() => state, { getState: () => state });
  return {
    authService: {
      sendEmailVerification: mocks.sendEmailVerification,
      updateEmail: mocks.updateEmail,
    },
    useAuthStore,
  };
});

import VerifyEmailRequiredPage from '../page';

describe('email verification page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshEmailVerification.mockResolvedValue(false);
    mocks.sendEmailVerification.mockResolvedValue(undefined);
  });

  afterEach(() => cleanup());

  it('shows the exact inbox and Spam/Junk/Promotions/All Mail guidance', async () => {
    render(<VerifyEmailRequiredPage />);
    expect(screen.getByText(/Verification email sent to/i)).toBeInTheDocument();
    expect(screen.getByText('ace@example.com')).toBeInTheDocument();
    expect(
      screen.getByText(/Open the email and click the verification link to continue/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Spam, Junk, Promotions, or All Mail/i)).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'I’ve Verified My Email' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend Verification Email' })).toBeInTheDocument();
  }, 15_000);

  it('detects verification on a cold start and navigates only once without a focus event', async () => {
    mocks.refreshEmailVerification.mockResolvedValue(true);
    render(<VerifyEmailRequiredPage />);
    await waitFor(() => expect(mocks.refreshEmailVerification).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith('/onboarding?redirect=%2Fdiscover')
    );
    expect(mocks.replace).toHaveBeenCalledTimes(1);

    act(() => window.dispatchEvent(new Event('focus')));
    expect(mocks.refreshEmailVerification).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledTimes(1);
  });

  it('deduplicates a resume check and button tap while one refresh is in flight', async () => {
    let finish!: (verified: boolean) => void;
    mocks.refreshEmailVerification.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        })
    );
    render(<VerifyEmailRequiredPage />);
    await waitFor(() => expect(mocks.refreshEmailVerification).toHaveBeenCalledTimes(1));
    const verifyButton = screen.getByRole('button', {
      name: /I’ve Verified My Email|Checking\.\.\./,
    });
    act(() => window.dispatchEvent(new Event('focus')));
    expect(verifyButton).toBeDisabled();
    fireEvent.click(verifyButton);
    expect(mocks.refreshEmailVerification).toHaveBeenCalledTimes(1);
    await act(async () => finish(false));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'I’ve Verified My Email' })).toBeEnabled()
    );
  });
});
