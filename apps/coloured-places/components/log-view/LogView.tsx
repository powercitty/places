import type { LogView, LogLevel } from '@/lib/types';

interface Props {
  logView: LogView;
}

const levelConfig: Record<LogLevel, { cls: string; bg: string; label: string }> = {
  debug: { cls: 'text-white/30',    bg: '',                   label: 'DBG' },
  info:  { cls: 'text-sky-300/80',  bg: '',                   label: 'INF' },
  warn:  { cls: 'text-amber-300',   bg: 'bg-amber-500/6',     label: 'WRN' },
  error: { cls: 'text-red-300',     bg: 'bg-red-500/8',       label: 'ERR' },
  fatal: { cls: 'text-red-200',     bg: 'bg-red-500/15',      label: 'FTL' },
};

function formatTs(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

export function LogView({ logView }: Props) {
  // Group entries by date
  const grouped = logView.entries.reduce<Record<string, typeof logView.entries>>((acc, entry) => {
    const date = new Date(entry.timestamp).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  return (
    <div className="font-mono">
      {Object.entries(grouped).map(([date, entries]) => (
        <div key={date} className="mb-6">
          {/* Date separator */}
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/25 px-2">
              {date}
            </span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          {/* Entries */}
          <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-[#0a0a0a]">
            {entries.map((entry, i) => {
              const lvl = levelConfig[entry.level];
              return (
                <div
                  key={entry.id}
                  className={`flex gap-3 px-4 py-2 ${i < entries.length - 1 ? 'border-b border-white/[0.04]' : ''} ${lvl.bg} hover:bg-white/[0.02] transition-colors`}
                >
                  {/* Timestamp */}
                  <span className="flex-shrink-0 text-[10px] text-white/25 w-16 pt-0.5">
                    {formatTs(entry.timestamp)}
                  </span>

                  {/* Level badge */}
                  <span className={`flex-shrink-0 text-[9px] font-bold w-8 pt-0.5 ${lvl.cls}`}>
                    {lvl.label}
                  </span>

                  {/* Source */}
                  <span className="flex-shrink-0 text-[10px] text-white/35 w-24 truncate pt-0.5">
                    {entry.source}
                  </span>

                  {/* Message */}
                  <span className={`flex-1 text-[11px] leading-snug break-all ${lvl.cls === 'text-white/30' ? 'text-white/45' : lvl.cls}`}>
                    {entry.message}
                  </span>

                  {/* Trace ID */}
                  {entry.traceId && (
                    <span className="flex-shrink-0 text-[9px] text-white/20 pt-0.5">
                      {entry.traceId}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {logView.hasMore && (
        <div className="text-center py-4">
          <span className="text-[10px] text-white/25 uppercase tracking-wider">
            — older entries not loaded —
          </span>
        </div>
      )}
    </div>
  );
}
