import Link from 'next/link';
import { OperatorShell } from '@/components/shell/OperatorShell';
import { LabIdRegistrationForm } from '@/components/lab-id/LabIdRegistrationForm';
import { ArrowRight } from 'lucide-react';

interface Props {
  searchParams: Promise<{
    desk?: string;
    canonicalName?: string;
    aliases?: string;
    description?: string;
    intakeMedium?: 'text' | 'photo' | 'document' | 'file' | 'agent';
    sourceLabel?: string;
    sourceReference?: string;
    sourceSurface?: string;
  }>;
}

const deskConfig = {
  'lab-id': {
    label: 'LAB ID',
    descriptor: 'Identity',
    description: 'Register a new principal, entity, or credential in the identity registry, using text, photos, screenshots, PDFs, or other files as intake context.',
    color: '#1A1A1A',
    accent: 'border-white/15 hover:border-white/30',
    sessionId: 'session-lab-id-soon',
  },
  supabase: {
    label: 'SUPABASE',
    descriptor: 'Official',
    description: 'Officialize a project, promote schema changes, or create canonical records.',
    color: '#C2611A',
    accent: 'border-orange-500/25 hover:border-orange-500/50',
    sessionId: 'session-supabase-soon',
  },
  workflows: {
    label: 'WORK FLOWS',
    descriptor: 'Orchestration',
    description: 'Define a new workflow, trigger, or automation pipeline.',
    color: '#4A7FAA',
    accent: 'border-sky-500/25 hover:border-sky-500/50',
    sessionId: 'session-workflows-soon',
  },
  'lab-512': {
    label: 'LAB 512',
    descriptor: 'Compute',
    description: 'Submit a job, propose a compute workload, or configure a worker task.',
    color: '#B5173A',
    accent: 'border-rose-500/25 hover:border-rose-500/50',
    sessionId: 'session-lab-512-soon',
  },
};

export default async function NewSessionPage({ searchParams }: Props) {
  const {
    desk,
    canonicalName,
    aliases,
    description,
    intakeMedium,
    sourceLabel,
    sourceReference,
    sourceSurface,
  } = await searchParams;

  // If a specific desk is requested, redirect-style forward
  if (desk && desk in deskConfig) {
    const cfg = deskConfig[desk as keyof typeof deskConfig];
    return (
      <OperatorShell
        title="New Creation Session"
        descriptor={`${cfg.label} desk`}
        breadcrumbs={[
          { label: 'Creation Sessions' },
          { label: cfg.label },
        ]}
      >
        <div className="max-w-lg space-y-5">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-1">{cfg.descriptor}</p>
            <h2 className="text-lg font-black text-white mb-2">{cfg.label}</h2>
            <p className="text-sm text-white/55 leading-relaxed">{cfg.description}</p>
          </div>
          {desk === 'lab-id' && (
            <>
              <Link
                href="/places/lab-id/agent?q=Help me start a LAB ID registration intake. I may attach photos, screenshots, PDFs, or notes."
                className="flex items-center justify-between p-4 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div>
                  <p className="text-sm font-semibold text-white">Open LAB ID intake in the agent</p>
                  <p className="text-[10px] text-white/35 mt-0.5">Best current path for registration help with text and files.</p>
                </div>
                <ArrowRight size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
              <LabIdRegistrationForm
                initialValues={{
                  canonicalName,
                  aliases,
                  description,
                  intakeMedium,
                  sourceLabel,
                  sourceReference,
                  sourceSurface,
                }}
              />
            </>
          )}
          <div className="space-y-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">Placeholder session</p>
            <Link
              href={`/creation-sessions/${cfg.sessionId}`}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/9 border border-white/8 hover:border-white/15 transition-all group"
            >
              <div>
                <p className="text-sm font-semibold text-white">Open explicit SOON session</p>
                <p className="text-[10px] text-white/35 mt-0.5">Command boundary not live yet · {cfg.sessionId}</p>
              </div>
              <ArrowRight size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
            </Link>
          </div>
        </div>
      </OperatorShell>
    );
  }

  // Desk selector
  return (
    <OperatorShell
      title="New Creation Session"
      descriptor="Select a desk"
      breadcrumbs={[{ label: 'Creation Sessions' }, { label: 'New' }]}
    >
      <div className="max-w-2xl space-y-5">
        <p className="text-sm text-white/45">Select the desk that handles this type of object. Desks without a live command boundary stay explicit about it.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(deskConfig).map(([key, cfg]) => (
            <Link
              key={key}
              href={`/creation-sessions/${cfg.sessionId}`}
              className={`p-5 rounded-2xl bg-white/[0.03] border transition-all group ${cfg.accent}`}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/30 mb-1">{cfg.descriptor}</p>
              <h3 className="text-base font-black text-white mb-2 group-hover:text-white">{cfg.label}</h3>
              <p className="text-xs text-white/45 leading-snug">{cfg.description}</p>
              <div className="flex items-center gap-1 mt-3 text-white/30 group-hover:text-white/60 transition-colors">
                <span className="text-[10px] font-semibold">Open desk</span>
                <ArrowRight size={11} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </OperatorShell>
  );
}
