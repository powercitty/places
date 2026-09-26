import { ImageResponse } from 'next/og';
import { iconGrid } from '../_icon-grid';

export const runtime = 'edge';

// 192×192: 6+56+6+56+6+56+6=192 ✓
export function GET() {
  return new ImageResponse(
    iconGrid({ size: 192, padding: 6, gap: 6, cell: 56, radius: 42, cellRadius: 10 }),
    { width: 192, height: 192 }
  );
}
