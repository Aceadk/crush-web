import { ImageResponse } from 'next/og';
import { BRAND, HEART_PATH } from '@/lib/brand';

export const runtime = 'edge';
export const alt = `${BRAND.name} - ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          // Dark brand background with a subtle primary glow, matching the
          // native app splash + adaptive icon (#0D0E12 + #FF3F7F).
          background: `radial-gradient(circle at 50% 38%, ${BRAND.primary}22 0%, ${BRAND.backgroundDark} 60%)`,
          backgroundColor: BRAND.backgroundDark,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <svg width="96" height="96" viewBox="0 0 24 24" fill={BRAND.primary}>
            <path d={HEART_PATH} />
          </svg>
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: BRAND.onDark,
            letterSpacing: '-2px',
            marginBottom: 16,
          }}
        >
          {BRAND.name}
        </div>
        <div
          style={{
            fontSize: 28,
            color: 'rgba(245, 245, 250, 0.85)',
            fontWeight: 400,
          }}
        >
          {BRAND.tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}
