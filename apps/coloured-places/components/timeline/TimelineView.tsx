import type { Timeline, TimelineEventSeverity } from '@/lib/types';

interface Props {
  timeline: Timeline;
}

const severityConfig: Record<TimelineEventSeverity, { dot: string; text: string; bg: string }> = {
  info:    { dot: 'bg-sky-400',     text: 'text-sky-300',     bg: 'bg-sky-500/8' },
  warning: { dot: 'bg-amber-400',   text: 'text-amber-300',   bg: 'bg-amber-500/8' },
  error:   { dot: 'bg-red-400',     text: 'text-red-300',     bg: 'bg-red-500/8' },
  success: { dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/8' },
};

const actorTypeBadge: Record<string, string> = {
  human:  'bg-violet-500/15 text-violet-300 border-violet-500/25',
  system: 'bg-white/8 text-white/40 border-white/10',
  agent:  'bg-sky-500/15 text-sky-300 border-sky-500/25',
  worker: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
};

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

export function TimelineView({ timeline }: Props) {
  return (
    <div className="space-y-2">
      {timeline.events.map((event, i) => {
        const sev = severityConfig[event.severity];
        return (
          <div key={event.id} className="relative flex gap-4">
            {/* Connector line */}
            {i < timeline.events.length - 1 && (
              <div className="absolute left-[7px] top-4 bottom-0 w-px bg-white/[0.06]" />
            )}

            {/* Dot */}
            <div className={`flex-shrink-0 w-3.5 h-3.5 rounded-full mt-1 ${sev.dot} shadow-sm z-10`} />

            {/* Content */}
            <div className={`flex-1 p-3.5 rounded-xl border border-white/[0.07] ${sev.bg} mb-1`}>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-1.5">
                <p className="text-sm text-white/80 leading-snug flex-1">{event.message}</p>
                <span className="text-[10px] text-white/30 font-mono flex-shrink-0">{formatTs(event.timestamp)}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${actorTypeBadge[event.actorType] ?? actorTypeBadge.system}`}>
                  {event.actorType}
                </span>
                <span className="text-[10px] text-white/40 font-mono">{event.actor}</span>
                {event.linkedObjectLabel && (
                  <span className="text-[10px] text-white/30">
                    → <span className="text-white/50">{event.linkedObjectLabel}</span>
                  </span>
                )}
              </div>
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
                  {Object.entries(event.metadata).map(([k, v]) => (
                    <span key={k} className="text-[10px] font-mono text-white/28">
                      {k}=<span className="text-white/45">{v}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
