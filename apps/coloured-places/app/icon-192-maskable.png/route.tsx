import { ImageResponse } from 'next/og';
import { iconGrid } from '../_icon-grid';

export const runtime = 'edge';

// 192×192 maskable: safe zone = central 80%, so extra padding keeps grid inside.
// padding=24, gap=6, cell=44 → 24+44+6+44+6+44+24=192 ✓
export function GET() {
  return new ImageResponse(
    iconGrid({ size: 192, padding: 24, gap: 6, cell: 44, radius: 0, cellRadius: 8 }),
    { width: 192, height: 192 }
  );
}
