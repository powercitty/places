'use client';

import type { CreationSession, SessionPhase } from '@/lib/types';

interface Props {
  session: CreationSession;
  children: React.ReactNode;
}

const phases: SessionPhase[] = ['intent', 'draft', 'missing-fields', 'warnings', 'proposal', 'confirmation', 'result'];

const phaseLabel: Record<SessionPhase, string> = {
  'intent':         'Intent',
  'draft':          'Draft',
  'missing-fields': 'Fields',
  'warnings':       'Warnings',
  'proposal':       'Proposal',
  'confirmation':   'Confirm',
  'result':         'Result',
};

const deskLabel: Record<string, string> = {
  'lab-id':    'LAB ID',
  supabase:    'SUPABASE',
  workflows:   'WORK FLOWS',
  'lab-512':   'LAB 512',
};

export function SessionShell({ session, children }: Props) {
  const currentIndex = phases.indexOf(session.phase);

  return (
    <div className="space-y-6">
      {/* Session identity */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">
                {deskLabel[session.deskType] ?? session.deskType}
              </span>
              <span className="text-white/20">·</span>
              <span className="text-[9px] font-mono text-white/25">{session.id}</span>
            </div>
            <p className="text-sm text-white/60 italic">"{session.intent}"</p>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
            session.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' :
            session.status === 'failed'    ? 'bg-red-500/15 text-red-300 border-red-500/25' :
            session.status === 'waiting'   ? 'bg-amber-500/15 text-amber-300 border-amber-500/25' :
            'bg-sky-500/15 text-sky-300 border-sky-500/25'
          }`}>
            {session.status}
          </div>
        </div>
      </div>

      {/* Phase stepper */}
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none pb-1">
        {phases.map((phase, i) => {
          const done    = i < currentIndex;
          const current = i === currentIndex;
          return (
            <div key={phase} className="flex items-center gap-0.5 flex-shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                current ? 'bg-white/10 border border-white/20' :
                done    ? 'bg-emerald-500/10 border border-emerald-500/20' :
                           'bg-white/[0.03] border border-white/[0.06]'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  current ? 'bg-white' :
                  done    ? 'bg-emerald-400' :
                             'bg-white/15'
                }`} />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  current ? 'text-white' :
                  done    ? 'text-emerald-400' :
                             'text-white/25'
                }`}>
                  {phaseLabel[phase]}
                </span>
              </div>
              {i < phases.length - 1 && (
                <div className={`w-3 h-px ${done ? 'bg-emerald-500/40' : 'bg-white/[0.06]'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Phase content */}
      {children}
    </div>
  );
}
