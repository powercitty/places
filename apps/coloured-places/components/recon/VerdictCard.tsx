import type { PlaceRecon } from '@/lib/reconciliation';
import { countRecon } from '@/lib/reconciliation';

interface Props {
  recon: PlaceRecon;
  color: string;
  shortLabel: string;
}

/**
 * The colored status card, rebuilt as the reconciliation verdict:
 * "what actually exists vs. what should exist" at a glance.
 */
export function VerdictCard({ recon, color, shortLabel }: Props) {
  const counts = countRecon(recon.items);
  const clean = counts.anomalies === 0;

  return (
    <section
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: [
          `radial-gradient(ellipse 130% 70% at 50% 0%, ${color}dd 0%, transparent 60%)`,
          `radial-gradient(ellipse 80% 60% at 0% 100%, ${color}77 0%, transparent 50%)`,
          `linear-gradient(165deg, ${color}aa 0%, ${color}66 30%, #111111 65%)`,
          '#141414',
        ].join(', '),
        border: `1px solid ${color}55`,
        boxShadow: `inset 0 1px 0 ${color}cc`,
      }}
    >
      {/* provenance strip */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: `${color}ee` }}>
          Reality vs intent
        </p>
        <p className="text-[10px] text-white/40 truncate">
          reconciled {recon.lastReconciled}
        </p>
      </div>

      {/* verdict */}
      <div className="px-4 pt-2.5 pb-3">
        {clean ? (
          <h2 className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight">
            {shortLabel} matches intent
          </h2>
        ) : (
          <h2 className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight">
            {counts.anomalies} difference{counts.anomalies === 1 ? '' : 's'} between
            <br className="hidden md:block" /> reality and intent
          </h2>
        )}
        <p className="text-[11px] text-white/50 mt-1">
          intent: {recon.intentSource} · observed: {recon.observedSource}
        </p>
      </div>

      {/* actual vs expected counter */}
      <div className="grid grid-cols-3 border-t border-white/10">
        <div className="px-4 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Expected</p>
          <p className="text-lg font-black text-white leading-tight">{counts.expected}</p>
        </div>
        <div className="px-4 py-2.5 border-l border-white/10">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Observed</p>
          <p className="text-lg font-black text-white leading-tight">{counts.observed}</p>
        </div>
        <div className="px-4 py-2.5 border-l border-white/10">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Differences</p>
          <p
            className="text-lg font-black leading-tight"
            style={{ color: clean ? '#34d399' : counts.worstSeverity === 'critical' ? '#f87171' : '#fbbf24' }}
          >
            {counts.anomalies}
          </p>
        </div>
      </div>
    </section>
  );
}
