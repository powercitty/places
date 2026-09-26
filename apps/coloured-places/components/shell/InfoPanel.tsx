'use client';

interface Row { label: string; value: string; note?: string; }

interface Props {
  title: string;
  rows: Row[];
  compact?: boolean;
}

export function InfoPanel({ title, rows, compact = false }: Props) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-2">{title}</p>
      <div className="rounded-xl border border-white/[0.07] overflow-hidden bg-white/[0.02]">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex items-start justify-between px-3.5 py-2.5 ${i < rows.length - 1 ? 'border-b border-white/[0.05]' : ''} ${compact ? 'py-2' : ''}`}
          >
            <span className={`text-white/45 flex-shrink-0 w-2/5 ${compact ? 'text-[10px]' : 'text-xs'}`}>{row.label}</span>
            <div className="text-right min-w-0">
              <span className={`font-semibold text-white/80 ${compact ? 'text-[10px]' : 'text-xs'}`}>{row.value}</span>
              {row.note && <p className="text-[10px] text-white/35 mt-0.5">{row.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
