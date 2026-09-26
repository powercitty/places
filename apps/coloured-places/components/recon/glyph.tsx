import type { ReconState } from '@/lib/reconciliation';
import { RECON_STATES } from '@/lib/reconciliation';

/**
 * One glyph per reconciliation state — the visual grammar's atomic unit.
 * Shapes are drawn, not emoji: dashed outline = absent, hollow = unregistered,
 * delta = drift, star = unexpected, strike = obsolete, pulse = changed.
 */
export function StateGlyph({ state, size = 12 }: { state: ReconState; size?: number }) {
  const color = RECON_STATES[state].color;
  const common = { width: size, height: size, viewBox: '0 0 12 12', fill: 'none' as const, 'aria-hidden': true as const };

  switch (state) {
    case 'healthy':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.5" stroke={color} strokeWidth="1.4" />
          <path d="M4 6.2l1.4 1.4L8.2 4.8" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'changed':
      return (
        <svg {...common}>
          <path d="M9.8 6a3.8 3.8 0 1 1-1.1-2.7" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M9.9 1.6v2h-2" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'drifted':
      return (
        <svg {...common}>
          <path d="M6 1.8 11 10.2H1Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M6 5v2.4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="6" cy="8.8" r="0.7" fill={color} />
        </svg>
      );
    case 'at_risk':
      return (
        <svg {...common}>
          <path d="M6 1.6 11.2 10.4H0.8Z" fill={color} opacity="0.22" />
          <path d="M6 1.6 11.2 10.4H0.8Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M6 4.8v2.6" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="6" cy="8.9" r="0.75" fill={color} />
        </svg>
      );
    case 'missing':
      return (
        <svg {...common}>
          <rect x="1.6" y="1.6" width="8.8" height="8.8" rx="1.5" stroke={color} strokeWidth="1.4" strokeDasharray="2.4 1.8" />
        </svg>
      );
    case 'unexpected':
      return (
        <svg {...common}>
          <path d="M6 1.4v9.2M1.4 6h9.2M2.8 2.8l6.4 6.4M9.2 2.8 2.8 9.2" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'unregistered':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="4.6" stroke={color} strokeWidth="1.4" />
          <circle cx="6" cy="6" r="1.1" fill={color} />
        </svg>
      );
    case 'obsolete':
      return (
        <svg {...common}>
          <rect x="1.6" y="1.6" width="8.8" height="8.8" rx="1.5" stroke={color} strokeWidth="1.3" opacity="0.6" />
          <path d="M2.4 9.6 9.6 2.4" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
  }
}

export function StateChip({ state, count }: { state: ReconState; count?: number }) {
  const meta = RECON_STATES[state];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full border text-[10px] font-bold uppercase tracking-[0.08em]"
      style={{ color: meta.color, borderColor: `${meta.color}44`, background: `${meta.color}14` }}
    >
      <StateGlyph state={state} size={10} />
      {meta.label}
      {typeof count === 'number' && <span style={{ color: `${meta.color}aa` }}>{count}</span>}
    </span>
  );
}
