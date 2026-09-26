import { ImageResponse } from 'next/og';
import { iconGrid } from './_icon-grid';

// iOS rounds corners automatically — no need to pre-round the outer shape.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// 180×180: 6+52+6+52+6+52+6=180 ✓
export default function AppleIcon() {
  return new ImageResponse(
    iconGrid({ size: 180, padding: 6, gap: 6, cell: 52, radius: 0, cellRadius: 9 }),
    { ...size }
  );
}
