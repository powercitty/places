import type { ReactElement } from 'react';

// The 3×3 colour palette — matches public/icon.svg exactly.
export const ICON_COLORS = [
  '#D81B60', // hot pink   — top-left
  '#212121', // near-black — top-center
  '#E65100', // deep orange— top-right
  '#1B5E20', // dark green — mid-left
  '#000000', // black      — center
  '#0D47A1', // navy blue  — mid-right
  '#B71C1C', // dark red   — bot-left
  '#BDBDBD', // silver     — bot-center
  '#37474F', // blue-grey  — bot-right
] as const;

interface GridOptions {
  /** Overall icon size in px (square). */
  size: number;
  /** Padding around the grid on each side. */
  padding: number;
  /** Gap between cells. */
  gap: number;
  /** Cell width and height. */
  cell: number;
  /** Corner radius of the outer rounded square. */
  radius: number;
  /** Corner radius of each colour cell. */
  cellRadius: number;
}

/**
 * Returns ImageResponse-compatible JSX for the 3×3 grid icon.
 * Satori (used by ImageResponse) supports flex-wrap and gap.
 *
 * Sizing invariant: 2*padding + 3*cell + 2*gap === size
 */
export function iconGrid({
  size,
  padding,
  gap,
  cell,
  radius,
  cellRadius,
}: GridOptions): ReactElement {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#111111',
        borderRadius: radius,
        display: 'flex',
        flexWrap: 'wrap',
        gap,
        padding,
      }}
    >
      {ICON_COLORS.map((color, i) => (
        <div
          key={i}
          style={{
            width: cell,
            height: cell,
            background: color,
            borderRadius: cellRadius,
          }}
        />
      ))}
    </div>
  );
}
