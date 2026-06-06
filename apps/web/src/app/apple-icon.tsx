import { ImageResponse } from 'next/og';
import { BRAND, HEART_PATH } from '@/lib/brand';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: BRAND.backgroundDark,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24" fill={BRAND.primary}>
          <path d={HEART_PATH} />
        </svg>
      </div>
    ),
    { ...size }
  );
}
