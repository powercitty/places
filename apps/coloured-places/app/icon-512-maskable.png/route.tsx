import { ImageResponse } from 'next/og';
import { iconGrid } from '../_icon-grid';

export const runtime = 'edge';

// 512×512 maskable: safe zone = central 80%, grid padded for adaptive crop.
// padding=63, gap=17, cell=118 → 63+118+17+118+17+118+63=514... adjust:
// padding=62, gap=16, cell=120 → 62+120+16+120+16+120+62=516... hmm
// padding=64, gap=16, cell=118 → 64+118+16+118+16+118+64=514...
// padding=64, gap=18, cell=116 → 64+116+18+116+18+116+64=512 ✓
export function GET() {
  return new ImageResponse(
    iconGrid({ size: 512, padding: 64, gap: 18, cell: 116, radius: 0, cellRadius: 20 }),
    { width: 512, height: 512 }
  );
}
