'use client';

import type { PlaceSummary } from '@/lib/types';
import { getPlaceAnomalyCount } from '@/lib/reconciliation';
import { Clock } from 'lucide-react';

interface Props {
  summary: PlaceSummary;
}

/**
 * Front-page square. Only three things ever show: the accent color, the name,
 * and the one-word descriptor ("surname"). Everything else is status.
 *
 * The five-state grammar (see docs/place-contracts.md):
 *   healthy      → clean colored card
 *   needs a look → full colour + orange "!"
 *   stale        → full colour, slightly dimmed + small clock (no alarm)
 *   unknown      → FULL COLOUR, unchanged + subtle "?" (we lost sight — NOT down)
 *   offline      → desaturated to near black-and-white + bright orange "!"
 *                  (earned only when we're sure our side is up AND the vitals
 *                   are definitively not coming)
 */
type Mode = 'healthy' | 'problem' | 'stale' | 'unknown' | 'offline';

function modeOf(summary: PlaceSummary): Mode {
  const s = summary.status;
  if (s === 'offline') return 'offline';
  if (s === 'unknown') return 'unknown';
  if (s === 'stale') return 'stale';
  const anomalies = getPlaceAnomalyCount(summary.id);
  if (anomalies > 0 || s === 'attention' || s === 'warning' || s === 'degraded') return 'problem';
  return 'healthy';
}

export function PlaceCardFront({ summary }: Props) {
  const mode = modeOf(summary);

  // Only OFFLINE drains the colour. Stale merely softens it; unknown keeps it.
  const filter =
    mode === 'offline' ? 'grayscale(0.92) brightness(0.42)'
    : mode === 'stale' ? 'brightness(0.82)'
    : 'none';

  const nameColor =
    mode === 'offline' ? 'text-white/55'
    : mode === 'stale' ? 'text-white/75'
    : 'text-white';
  const descColor =
    mode === 'offline' ? 'text-white/35'
    : mode === 'stale' ? 'text-white/45'
    : 'text-white/60';

  return (
    <div className="relative w-full h-full rounded-[20px] overflow-hidden select-none">
      {/* Color layer — only offline desaturates */}
      <div
        className="absolute inset-0 rounded-[20px] transition-[filter] duration-300"
        style={{ backgroundColor: summary.accentColor, filter }}
      />
      {/* Depth + top highlight */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/5 rounded-[20px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

      {/* Name + surname — always visible */}
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <h2 className={`text-[1.55rem] font-black leading-none tracking-tight drop-shadow-sm ${nameColor}`}>
          {summary.shortLabel}
        </h2>
        <p className={`text-[11px] font-bold uppercase tracking-[0.16em] mt-1.5 ${descColor}`}>
          {summary.descriptor}
        </p>
      </div>

      {/* Status mark — top-right */}
      <StatusMark mode={mode} />
    </div>
  );
}

function StatusMark({ mode }: { mode: Mode }) {
  if (mode === 'healthy') return null;

  const base =
    'absolute top-3 right-3 flex items-center justify-center w-11 h-11 rounded-full font-black leading-none';

  // Offline / needs-a-look → the orange "!"
  if (mode === 'offline' || mode === 'problem') {
    const bright = mode === 'offline';
    return (
      <div
        className={base}
        style={{
          fontSize: '30px',
          color: bright ? '#ff9a3d' : '#f97316',
          background: 'rgba(0,0,0,0.5)',
          border: `1.5px solid ${bright ? '#ff9a3d' : '#f97316'}`,
          boxShadow: bright ? '0 0 18px rgba(255,154,61,0.65)' : '0 0 12px rgba(249,115,22,0.45)',
        }}
        aria-label={bright ? 'Offline — no contact' : 'Needs a look'}
      >
        !
      </div>
    );
  }

  // Unknown → neutral "?" — we've lost sight, NOT an alarm
  if (mode === 'unknown') {
    return (
      <div
        className={base}
        style={{
          fontSize: '26px',
          color: 'rgba(255,255,255,0.8)',
          background: 'rgba(0,0,0,0.42)',
          border: '1.5px solid rgba(255,255,255,0.45)',
        }}
        aria-label="Unknown — can't see it right now"
      >
        ?
      </div>
    );
  }

  // Stale → quiet clock, no alarm
  return (
    <div
      className="absolute top-3 right-3 flex items-center justify-center w-9 h-9 rounded-full"
      style={{ background: 'rgba(0,0,0,0.42)', border: '1.5px solid rgba(255,255,255,0.35)' }}
      aria-label="Stale — not checked recently"
    >
      <Clock size={17} style={{ color: 'rgba(255,255,255,0.65)' }} />
    </div>
  );
}
