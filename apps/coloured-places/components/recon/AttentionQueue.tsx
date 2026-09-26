import Link from 'next/link';
import type { PlaceRecon, ReconSeverity } from '@/lib/reconciliation';
import { RECON_STATES, attentionItems } from '@/lib/reconciliation';
import { StateGlyph } from './glyph';
import { MessageSquare } from 'lucide-react';

const SEV_COLOR: Record<ReconSeverity, string> = {
  critical: '#f87171',
  warning: '#fbbf24',
  info: '#22d3ee',
};

interface Props {
  recon: PlaceRecon;
  placeId: string;
  /** Max items shown before "view all in ledger" hint. */
  limit?: number;
}

/**
 * Ordered triage list: "what deserves my attention first".
 * Every row carries a direct ask-the-agent link with a prefilled prompt.
 */
export function AttentionQueue({ recon, placeId, limit = 4 }: Props) {
  const items = attentionItems(recon.items);
  if (items.length === 0) return null;

  const shown = items.slice(0, limit);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
          Attention queue
        </h3>
        <span className="text-[10px] text-white/25">{items.length} open</span>
      </div>

      <ol className="space-y-1.5">
        {shown.map((item, i) => {
          const meta = RECON_STATES[item.state];
          const sev = SEV_COLOR[item.severity];
          return (
            <li
              key={item.id}
              className="rounded-xl bg-white/[0.03] border border-white/[0.07] pl-3 pr-2.5 py-2.5"
              style={{ borderLeft: `3px solid ${sev}` }}
            >
              <div className="flex items-start gap-2.5">
                <span className="flex-shrink-0 text-[10px] font-black text-white/25 mt-[3px] w-3">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StateGlyph state={item.state} size={11} />
                    <span className="text-[13px] font-bold text-white/85 leading-tight">{item.name}</span>
                    <span
                      className="text-[9px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {item.reason && (
                    <p className="text-[11px] text-white/45 leading-snug mt-1">{item.reason}</p>
                  )}
                  {item.drift && (
                    <div className="mt-1.5 space-y-0.5">
                      {item.drift.map((d) => (
                        <p key={d.field} className="text-[10px] leading-snug font-mono">
                          <span className="text-white/30">{d.field}: </span>
                          <span className="text-emerald-300/80 line-through decoration-emerald-300/40">{d.expected}</span>
                          <span className="text-white/30"> → </span>
                          <span className="text-amber-300/90">{d.actual}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  href={`/places/${placeId}/agent?q=${encodeURIComponent(
                    `Investigate "${item.name}" (${meta.label.toLowerCase()}). ${item.reason ?? item.detail} What is the cause and the safest fix?`
                  )}`}
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[10px] font-bold text-white/60 hover:text-white transition-colors"
                >
                  <MessageSquare size={10} />
                  Ask agent
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
      {items.length > shown.length && (
        <p className="text-[10px] text-white/25 mt-1.5">
          + {items.length - shown.length} more in the ledger below
        </p>
      )}
    </section>
  );
}
