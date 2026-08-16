import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProtectedImage } from './protected-image';

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    void _fill;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} {...props} />
    );
  },
}));

describe('ProtectedImage', () => {
  afterEach(cleanup);

  it('renders media without a watermark or capture-trace layer', () => {
    const { container } = render(
      <ProtectedImage src="https://example.com/photo.jpg" alt="Profile photo" />
    );

    expect(screen.getByRole('img', { name: 'Profile photo' })).toBeInTheDocument();
    expect(container.querySelector('[data-testid*="watermark"]')).toBeNull();
    expect(container.innerHTML.toLowerCase()).not.toContain('watermark');
    expect(container.innerHTML).not.toContain('data:image/svg+xml');
  });

  it('keeps direct drag protection after watermark removal', () => {
    render(<ProtectedImage src="https://example.com/photo.jpg" alt="Profile photo" />);

    expect(screen.getByRole('img', { name: 'Profile photo' })).toHaveAttribute(
      'draggable',
      'false'
    );
  });
});
