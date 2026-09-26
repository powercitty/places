import { ImageResponse } from 'next/og';
import { iconGrid } from './_icon-grid';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// 32×32: 2+8+2+8+2+8+2=32 ✓
export default function Icon() {
  return new ImageResponse(
    iconGrid({ size: 32, padding: 2, gap: 2, cell: 8, radius: 7, cellRadius: 1 }),
    { ...size }
  );
}
