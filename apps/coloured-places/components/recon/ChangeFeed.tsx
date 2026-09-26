import type { PlaceRecon } from '@/lib/reconciliation';
import { RECON_STATES } from '@/lib/reconciliation';
import { StateGlyph } from './glyph';

/**
 * "What changed" — recent events that altered the actual-vs-expected picture.
 */
export function ChangeFeed({ recon }: { recon: PlaceRecon }) {
  if (recon.changes.length === 0) return null;

  return (
    <section>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35 mb-2">
        Recent changes
      </h3>
      <ol className="relative space-y-0 border-l border-white/[0.08] ml-1.5">
        {recon.changes.map((change) => (
          <li key={change.id} className="relative pl-4 pb-3 last:pb-0">
            <span className="absolute -left-[5.5px] top-[3px]">
              {change.state ? (
                <StateGlyph state={change.state} size={11} />
              ) : (
                <span className="block w-[9px] h-[9px] rounded-full bg-white/20" />
              )}
            </span>
            <p className="text-[11px] text-white/60 leading-snug">{change.message}</p>
            <p className="text-[9px] text-white/25 mt-0.5">
              {change.at} · {change.actor}
              {change.state && (
                <span style={{ color: RECON_STATES[change.state].color }}>
                  {' '}→ {RECON_STATES[change.state].label.toLowerCase()}
                </span>
              )}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
