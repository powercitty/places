'use client';

import type { StatusLight } from '@/lib/types';

interface Props {
  lights: StatusLight[];
  compact?: boolean;
}

const dotColor = {
  on:   'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.65)]',
  warn: 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.65)]',
  off:  'bg-white/20',
};

export function StatusLights({ lights, compact = false }: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {lights.map((l) => (
          <div
            key={l.label}
            className={`w-1.5 h-1.5 rounded-full ${dotColor[l.status]}`}
            title={l.label}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {lights.map((l) => (
        <div key={l.label} className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColor[l.status]}`} />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-white/40">
            {l.label}
          </span>
        </div>
      ))}
    </div>
  );
}
