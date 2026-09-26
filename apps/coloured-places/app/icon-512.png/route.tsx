import { ImageResponse } from 'next/og';
import { iconGrid } from '../_icon-grid';

export const runtime = 'edge';

// 512×512: 17+148+17+148+17+148+17=512 ✓
export function GET() {
  return new ImageResponse(
    iconGrid({ size: 512, padding: 17, gap: 17, cell: 148, radius: 112, cellRadius: 26 }),
    { width: 512, height: 512 }
  );
}
