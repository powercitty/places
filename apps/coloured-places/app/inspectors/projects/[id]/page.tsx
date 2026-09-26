import { notFound } from 'next/navigation';
import { queryClient } from '@/lib/query-client';
import type { ProjectInspector } from '@/lib/types';
import { OperatorShell } from '@/components/shell/OperatorShell';
import { StatusChip } from '@/components/StatusChip';
import { InspectorLayout } from '@/components/inspector/InspectorLayout';
import { InfoPanel } from '@/components/shell/InfoPanel';
import { ActionRail } from '@/components/shell/ActionRail';
import { CheckCircle2, Clock } from 'lucide-react';

interface Props { params: Promise<{ id: string }>; }

const officialStatusConfig = {
  officialized: { label: 'Officialized', cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  draft:        { label: 'Draft',         cls: 'text-amber-300   border-amber-500/30   bg-amber-500/10' },
  archived:     { label: 'Archived',      cls: 'text-white/40    border-white/10       bg-white/5' },
};

export default async function ProjectInspectorPage({ params }: Props) {
  const { id } = await params;
  const inspector = (await queryClient.getInspector('project', id)) as ProjectInspector | null;
  if (!inspector) notFound();

  const official = officialStatusConfig[inspector.officialStatus];

  return (
    <OperatorShell
      title={inspector.canonicalName}
      descriptor="Project Inspector"
      breadcrumbs={[
        { label: 'SUPABASE', href: '/places/supabase' },
        { label: inspector.canonicalName },
      ]}
      badge={
        <div className="flex items-center gap-2">
          <StatusChip status={inspector.status} />
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.1em] border ${official.cls}`}>
            <CheckCircle2 size={10} />
            {official.label}
          </span>
        </div>
      }
    >
      <InspectorLayout
        inspector={inspector}
        timelineHref={`/timelines/projects/${id}`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InfoPanel
            title="Project Identity"
            rows={[
              { label: 'Canonical name', value: inspector.canonicalName },
              { label: 'Data source', value: inspector.dataSource },
              { label: 'Schema version', value: `v${inspector.schemaVersion}` },
              { label: 'Official status', value: inspector.officialStatus },
              { label: 'Owner', value: inspector.ownedBy ?? '—' },
            ]}
          />

          <InfoPanel
            title="Data Health"
            rows={[
              { label: 'Row count', value: inspector.rowCount?.toLocaleString() ?? '—' },
              { label: 'Storage used', value: inspector.storageUsed ?? '—' },
              { label: 'Migrations applied', value: String(inspector.migrations.applied) },
              { label: 'Migrations pending', value: String(inspector.migrations.pending), note: inspector.migrations.pending > 0 ? 'action needed' : undefined },
              { label: 'Last migration', value: new Date(inspector.migrations.lastApplied).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
            ]}
          />

          <ActionRail
            title="Actions"
            columns={1}
            actions={[
              { id: 'inspect-schema', label: 'Inspect schema', variant: 'primary' },
              { id: 'view-migrations', label: 'View migrations', variant: 'secondary' },
              { id: 'open-timeline', label: 'Open timeline', variant: 'secondary', href: `/timelines/projects/${id}` },
              { id: 'archive', label: 'Archive project', variant: 'danger' },
            ]}
          />
        </div>
      </InspectorLayout>
    </OperatorShell>
  );
}
