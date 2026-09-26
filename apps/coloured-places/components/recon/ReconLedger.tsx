'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PlaceRecon, ReconState } from '@/lib/reconciliation';
import { RECON_STATES, countRecon } from '@/lib/reconciliation';
import { StateGlyph } from './glyph';

interface Props {
  recon: PlaceRecon;
  placeId: string;
}

/**
 * The operational ledger of a place: every known thing, filterable by
 * reconciliation state. Expected/observed markers make the actual-vs-intent
 * gap readable per row. Hovering dims sibling rows for focus.
 */
export function ReconLedger({ recon, placeId }: Props) {
  const counts = countRecon(recon.items);
  const [filter, setFilter] = useState<ReconState | 'all' | 'diff'>('diff');

  const presentStates = useMemo(
    () =>
      (Object.keys(RECON_STATES) as ReconState[])
        .filter((s) => counts.byState[s] > 0)
        .sort((a, b) => RECON_STATES[b].severityRank - RECON_STATES[a].severityRank),
    [counts]
  );

  const rows = useMemo(() => {
    const filtered =
      filter === 'all'
        ? recon.items
        : filter === 'diff'
          ? recon.items.filter((i) => i.state !== 'healthy')
          : recon.items.filter((i) => i.state === filter);
    return [...filtered].sort(
      (a, b) => RECON_STATES[b.state].severityRank - RECON_STATES[a.state].severityRank
    );
  }, [recon.items, filter]);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
          Ledger
        </h3>
        <span className="text-[10px] text-white/25">
          {counts.total} known · {counts.anomalies} differ
        </span>
      </div>

      {/* filter chips */}
      <div className="flex flex-wrap gap-1 mb-2">
        <FilterChip active={filter === 'diff'} onClick={() => setFilter('diff')}
          label="Differences" count={counts.anomalies} color="#fbbf24" />
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}
          label="All" count={counts.total} color="#ffffff" />
        {presentStates.map((s) => (
          <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}
            label={RECON_STATES[s].label} count={counts.byState[s]} color={RECON_STATES[s].color} />
        ))}
      </div>

      {/* rows — group hover dims siblings */}
      <div className="group/ledger rounded-xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.05] overflow-hidden">
        {rows.length === 0 && (
          <p className="px-3 py-4 text-[11px] text-white/35">
            No items in this state. {filter === 'diff' ? 'This place matches its intent.' : ''}
          </p>
        )}
        {rows.map((item) => {
          const meta = RECON_STATES[item.state];
          return (
            <Link
              key={item.id}
              href={`/places/${placeId}/agent?q=${encodeURIComponent(
                `Show me everything known about "${item.name}" (${item.kind}, state: ${meta.label.toLowerCase()}).`
              )}`}
              className="flex items-center gap-2.5 px-3 py-2 transition-opacity duration-150 group-hover/ledger:opacity-30 hover:!opacity-100 hover:bg-white/[0.03]"
            >
              <StateGlyph state={item.state} size={12} />

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-bold text-white/80 truncate">{item.name}</span>
                  <span className="hidden sm:inline text-[9px] uppercase tracking-[0.1em] text-white/25 flex-shrink-0">
                    {item.kind}
                  </span>
                </div>
                <p className="text-[10px] text-white/35 truncate mt-px">
                  {item.reason ?? item.detail}
                </p>
              </div>

              {/* expected / observed marks */}
              <span className="flex-shrink-0 flex items-center gap-1 text-[8px] font-mono font-bold">
                <span title={item.expected ? 'expected by intent' : 'not in intent'}
                  className={item.expected ? 'text-white/50' : 'text-white/15'}>E</span>
                <span title={item.observed ? 'observed in reality' : 'not observed'}
                  className={item.observed ? 'text-white/50' : 'text-white/15'}>O</span>
              </span>

              <span
                className="flex-shrink-0 text-[9px] font-bold uppercase tracking-[0.08em] w-[74px] text-right"
                style={{ color: meta.color }}
              >
                {meta.label}
              </span>

              <span className="hidden md:block flex-shrink-0 w-14 text-right text-[9px] text-white/25">
                {item.lastChange ?? ''}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2 py-1 rounded-full border text-[9px] font-bold uppercase tracking-[0.08em] transition-all duration-150"
      style={
        active
          ? { color: '#0e0e0e', background: color, borderColor: color }
          : { color: `${color}bb`, borderColor: 'rgba(255,255,255,0.1)', background: 'transparent' }
      }
    >
      {label} {count}
    </button>
  );
}
