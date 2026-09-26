import { notFound } from 'next/navigation';
import { queryClient } from '@/lib/query-client';
import { OperatorShell } from '@/components/shell/OperatorShell';
import { SessionShell } from '@/components/creation-session/SessionShell';
import { FieldsView } from '@/components/creation-session/FieldsView';
import { WarningsView } from '@/components/creation-session/WarningsView';
import { ProposalView } from '@/components/creation-session/ProposalView';
import { ActionRail } from '@/components/shell/ActionRail';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Props { params: Promise<{ sessionId: string }>; }

const deskToPlace: Record<string, string> = {
  'lab-id': 'lab-id',
  supabase: 'supabase',
  workflows: 'workflows',
  'lab-512': 'lab-512',
};

const placeLabel: Record<string, string> = {
  'lab-id': 'LAB ID',
  supabase: 'SUPABASE',
  workflows: 'WORK FLOWS',
  'lab-512': 'LAB 512',
};

export default async function SessionDetailPage({ params }: Props) {
  const { sessionId } = await params;
  const session = await queryClient.getSession(sessionId);
  if (!session) notFound();

  const placeId = deskToPlace[session.deskType];

  return (
    <OperatorShell
      title={session.title}
      descriptor={session.deskType.toUpperCase() + ' desk'}
      breadcrumbs={[
        { label: placeLabel[session.deskType] ?? session.deskType, href: `/places/${placeId}` },
        { label: 'Creation Sessions', href: '/creation-sessions/new' },
        { label: session.title },
      ]}
    >
      <div className="max-w-2xl">
        <SessionShell session={session}>
          <div className="space-y-6">

            {/* INTENT phase */}
            {(session.phase === 'intent') && (
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">Intent captured</p>
                <p className="text-sm text-white/65 italic">"{session.intent}"</p>
              </div>
            )}

            {/* DRAFT / MISSING-FIELDS phase */}
            {(session.phase === 'draft' || session.phase === 'missing-fields') && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-3">
                    {session.phase === 'missing-fields' ? 'Missing fields — fill before proceeding' : 'Draft fields'}
                  </p>
                  <FieldsView fields={session.fields} readOnly={false} />
                </div>
                <ActionRail
                  title=""
                  columns={1}
                  actions={[
                    { id: 'submit-fields', label: 'Validate and continue', variant: 'primary' },
                    { id: 'cancel', label: 'Cancel session', variant: 'danger' },
                  ]}
                />
              </div>
            )}

            {/* WARNINGS phase */}
            {session.phase === 'warnings' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-3">
                    Warnings — review before proceeding
                  </p>
                  <WarningsView warnings={session.warnings} />
                </div>
                <ActionRail
                  title=""
                  columns={1}
                  actions={[
                    { id: 'proceed', label: 'Accept warnings and continue', variant: 'primary' },
                    { id: 'cancel', label: 'Cancel session', variant: 'danger' },
                  ]}
                />
              </div>
            )}

            {/* PROPOSAL phase */}
            {session.phase === 'proposal' && session.proposal && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-3">
                    Proposed action — review carefully
                  </p>
                  <ProposalView proposal={session.proposal} />
                </div>

                {session.warnings.length > 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-2">Warnings</p>
                    <WarningsView warnings={session.warnings} />
                  </div>
                )}

                <ActionRail
                  title=""
                  columns={1}
                  actions={[
                    { id: 'confirm', label: 'Confirm and execute', variant: 'primary' },
                    { id: 'edit', label: 'Edit fields', variant: 'secondary' },
                    { id: 'cancel', label: 'Cancel session', variant: 'danger' },
                  ]}
                />
              </div>
            )}

            {/* CONFIRMATION phase */}
            {session.phase === 'confirmation' && (
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.07] text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mx-auto">
                  <span className="text-amber-300 text-base">⚡</span>
                </div>
                <p className="text-sm text-white/70">Executing…</p>
              </div>
            )}

            {/* RESULT phase */}
            {session.phase === 'result' && session.result && (
              <div className="space-y-4">
                <div className={`p-5 rounded-2xl border ${
                  session.result.success
                    ? 'bg-emerald-500/8 border-emerald-500/20'
                    : 'bg-red-500/8 border-red-500/20'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      session.result.success ? 'bg-emerald-500/20' : 'bg-red-500/20'
                    }`}>
                      <CheckCircle2 size={16} className={session.result.success ? 'text-emerald-400' : 'text-red-400'} />
                    </div>
                    <p className={`text-sm font-bold ${session.result.success ? 'text-emerald-300' : 'text-red-300'}`}>
                      {session.result.success ? 'Completed successfully' : 'Failed'}
                    </p>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">{session.result.message}</p>
                  {session.result.objectLabel && (
                    <div className="mt-3 pt-3 border-t border-white/[0.07]">
                      <span className="text-[9px] text-white/30 uppercase tracking-wider">Created: </span>
                      <span className="text-xs font-bold text-white/70 font-mono">{session.result.objectLabel}</span>
                    </div>
                  )}
                </div>

                <ActionRail
                  title="Next steps"
                  columns={1}
                  actions={[
                    { id: 'back-to-place', label: `Back to ${placeLabel[session.deskType]}`, variant: 'primary', href: `/places/${placeId}` },
                    { id: 'new-session', label: 'Start another session', variant: 'secondary', href: '/creation-sessions/new' },
                  ]}
                />
              </div>
            )}

          </div>
        </SessionShell>
      </div>
    </OperatorShell>
  );
}
