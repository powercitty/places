'use client';

import type { StatusLevel } from '@/lib/types';

const config: Record<StatusLevel, { label: string; classes: string }> = {
  healthy:   { label: 'Healthy',   classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  warning:   { label: 'Warning',   classes: 'bg-amber-500/20   text-amber-300   border-amber-500/30' },
  degraded:  { label: 'Degraded',  classes: 'bg-red-500/20     text-red-300     border-red-500/30' },
  syncing:   { label: 'Syncing',   classes: 'bg-sky-500/20     text-sky-300     border-sky-500/30' },
  attention: { label: 'Attention', classes: 'bg-orange-500/20  text-orange-300  border-orange-500/30' },
  offline:   { label: 'Offline',   classes: 'bg-white/10       text-white/40    border-white/10' },
  stale:     { label: 'Stale',     classes: 'bg-white/8        text-white/50    border-white/12' },
  unknown:   { label: 'Unknown',   classes: 'bg-white/8        text-white/50    border-white/12' },
};

export function StatusChip({ status }: { status: StatusLevel }) {
  const { label, classes } = config[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-[0.1em] uppercase border ${classes}`}>
      {label}
    </span>
  );
}
