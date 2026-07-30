import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildViewerWatermarkIdentity,
  createWatermarkDataUrl,
  SensitiveContentWatermark,
} from './sensitive-content-watermark';

describe('buildViewerWatermarkIdentity', () => {
  it('normalizes the current profile username and combines the canonical full name', () => {
    const identity = buildViewerWatermarkIdentity(
      { uid: 'viewer-123', displayName: 'Firebase Fallback' },
      {
        id: 'viewer-123',
        username: '  @jenny\u200D   crush  ',
        displayName: '  Jenny\n',
        lastName: '  Serchan  ',
      }
    );

    expect(identity).toEqual({
      username: 'jenny crush',
      fullName: 'Jenny Serchan',
      label: '@jenny crush • Jenny Serchan • CRUSH',
    });
  });

  it('does not append a last name already present in displayName', () => {
    const identity = buildViewerWatermarkIdentity(
      { uid: 'viewer-123' },
      {
        id: 'viewer-123',
        username: 'jenny',
        displayName: 'Jenny Serchan',
        lastName: 'serchan',
      }
    );

    expect(identity?.fullName).toBe('Jenny Serchan');
  });

  it('never leaks a stale account profile while the current account is loading', () => {
    const identity = buildViewerWatermarkIdentity(
      { uid: 'new-user-987654', displayName: 'Current Viewer' },
      {
        id: 'previous-user',
        username: 'old-private-username',
        displayName: 'Previous',
        lastName: 'Account',
      }
    );

    expect(identity).toEqual({
      username: 'member-new-user',
      fullName: 'Current Viewer',
      label: '@member-new-user • Current Viewer • CRUSH',
    });
    expect(identity?.label).not.toContain('old-private-username');
    expect(identity?.label).not.toContain('Previous Account');
  });

  it('uses a stable non-email fallback when profile data is unavailable', () => {
    const identity = buildViewerWatermarkIdentity(
      { uid: 'abc12345', displayName: 'private.viewer@gmail.com' },
      {
        id: 'abc12345',
        username: 'private.viewer@gmail.com',
        displayName: 'private.viewer@gmail.com',
      }
    );

    expect(identity).toEqual({
      username: 'member-abc12345',
      fullName: 'Crush member',
      label: '@member-abc12345 • Crush member • CRUSH',
    });
    expect(identity?.label).not.toContain('@gmail.com');
  });

  it('returns no watermark identity without a signed-in user', () => {
    expect(buildViewerWatermarkIdentity(null, null)).toBeNull();
  });
});

describe('SensitiveContentWatermark', () => {
  afterEach(cleanup);

  it('encodes hostile profile text as inert XML inside the data URL', () => {
    const identity = {
      username: 'viewer',
      fullName: '<script>alert("capture")</script> & Viewer',
      label: '@viewer • <script>alert("capture")</script> & Viewer • CRUSH',
    };

    const dataUrl = createWatermarkDataUrl(identity);
    const decodedSvg = decodeURIComponent(dataUrl.replace('data:image/svg+xml,', ''));

    expect(dataUrl).not.toContain('<script>');
    expect(decodedSvg).toContain('&lt;script&gt;');
    expect(decodedSvg).toContain('&quot;capture&quot;');
    expect(decodedSvg).toContain('&amp; Viewer');
    expect(decodedSvg).not.toContain('<script>');
  });

  it('renders a viewport-wide, repeating, pointer-transparent accessibility-hidden overlay', () => {
    const identity = {
      username: 'jenny',
      fullName: 'Jenny Serchan',
      label: '@jenny • Jenny Serchan • CRUSH',
    };

    render(
      <>
        <button type="button">Open profile</button>
        <SensitiveContentWatermark identity={identity} />
      </>
    );

    const overlay = screen.getByTestId('viewer-watermark');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(overlay).toHaveClass(
      'pointer-events-none',
      'fixed',
      'inset-0',
      'z-[2147483646]',
      'select-none'
    );
    // PRINT ONLY. This overlay used to paint over every authenticated screen at
    // a visible opacity, which wrecked the UI. `hidden` removes it from the
    // on-screen layout entirely (not merely transparent — it must not tint or
    // intercept anything) and `print:block` restores it for print/PDF, the one
    // capture path the browser actually reports.
    expect(overlay).toHaveClass('hidden', 'print:block');
    expect(overlay).toHaveStyle({
      backgroundRepeat: 'repeat',
      backgroundSize: '420px 168px',
    });
    expect(overlay.style.backgroundImage).toContain('data:image/svg+xml');
    expect(screen.getByRole('button', { name: 'Open profile' })).toBeEnabled();
  });

  it('is not visible while browsing — no screen-visible watermark layer', () => {
    const identity = {
      username: 'jenny',
      fullName: 'Jenny Serchan',
      label: '@jenny • Jenny Serchan • CRUSH',
    };

    render(<SensitiveContentWatermark identity={identity} />);
    const overlay = screen.getByTestId('viewer-watermark');

    // Regression guard for the reported bug. `hidden` is Tailwind's
    // `display:none`, so re-introducing a screen-visible watermark (by dropping
    // `hidden`, or by swapping it for a low opacity that still paints) fails
    // here rather than shipping over the whole interface again.
    expect(overlay.className).toContain('hidden');
    expect(overlay.className).not.toMatch(/(^|\s)block(\s|$)/);
    expect(overlay.className).not.toContain('opacity-');
  });

  it('keeps the print watermark legible when browsers strip backgrounds', () => {
    const identity = {
      username: 'jenny',
      fullName: 'Jenny Serchan',
      label: '@jenny • Jenny Serchan • CRUSH',
    };

    render(<SensitiveContentWatermark identity={identity} />);
    const overlay = screen.getByTestId('viewer-watermark');
    expect(overlay.style.getPropertyValue('print-color-adjust')).toBe('exact');
  });

  it('does not render for an unauthenticated identity', () => {
    render(<SensitiveContentWatermark identity={null} />);
    expect(screen.queryByTestId('viewer-watermark')).not.toBeInTheDocument();
  });
});
