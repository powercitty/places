import type { SessionProposal } from '@/lib/types';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  proposal: SessionProposal;
}

export function ProposalView({ proposal }: Props) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        <p className="text-sm text-white/70 leading-relaxed">{proposal.summary}</p>
      </div>

      {/* Object label */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 size={16} className="text-white/50" />
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-0.5">
            {proposal.objectType}
          </p>
          <p className="text-sm font-bold text-white">{proposal.objectLabel}</p>
        </div>
      </div>

      {/* Fields summary */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-2">Proposed fields</p>
        <div className="rounded-xl border border-white/[0.07] overflow-hidden">
          {proposal.fields.map((f, i) => (
            <div
              key={f.label}
              className={`flex items-start justify-between px-3.5 py-2.5 ${i < proposal.fields.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
            >
              <span className="text-xs text-white/40 flex-shrink-0 w-2/5">{f.label}</span>
              <span className="text-xs font-semibold text-white/75 text-right">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Impact */}
      {proposal.estimatedImpact && (
        <div className="p-3.5 rounded-xl bg-sky-500/8 border border-sky-500/18">
          <p className="text-[9px] font-bold uppercase tracking-wider text-sky-400/70 mb-1">Estimated Impact</p>
          <p className="text-xs text-sky-200/60 leading-relaxed">{proposal.estimatedImpact}</p>
        </div>
      )}
    </div>
  );
}
