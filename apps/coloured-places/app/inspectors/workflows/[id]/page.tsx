import { notFound } from 'next/navigation';
import { queryClient } from '@/lib/query-client';
import type { WorkflowInspector } from '@/lib/types';
import { OperatorShell } from '@/components/shell/OperatorShell';
import { StatusChip } from '@/components/StatusChip';
import { InspectorLayout } from '@/components/inspector/InspectorLayout';
import { InfoPanel } from '@/components/shell/InfoPanel';
import { ActionRail } from '@/components/shell/ActionRail';

interface Props { params: Promise<{ id: string }>; }

const publishStateConfig = {
  published: { label: 'Published', cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  draft:     { label: 'Draft',     cls: 'text-amber-300   border-amber-500/30   bg-amber-500/10' },
  paused:    { label: 'Paused',    cls: 'text-white/50    border-white/15       bg-white/5' },
};

export default async function WorkflowInspectorPage({ params }: Props) {
  const { id } = await params;
  const inspector = (await queryClient.getInspector('workflow', id)) as WorkflowInspector | null;
  if (!inspector) notFound();

  const pub = publishStateConfig[inspector.publishState];

  return (
    <OperatorShell
      title={inspector.canonicalName}
      descriptor="Workflow Inspector"
      breadcrumbs={[
        { label: 'WORK FLOWS', href: '/places/workflows' },
        { label: inspector.canonicalName },
      ]}
      badge={
        <div className="flex items-center gap-2">
          <StatusChip status={inspector.status} />
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.1em] border ${pub.cls}`}>
            {pub.label}
          </span>
        </div>
      }
    >
      <InspectorLayout
        inspector={inspector}
        timelineHref={`/timelines/jobs/job-002`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InfoPanel
            title="Workflow Definition"
            rows={[
              { label: 'Canonical name', value: inspector.canonicalName },
              { label: 'Trigger type', value: inspector.triggerType },
              { label: 'Steps', value: String(inspector.steps) },
              { label: 'Publish state', value: inspector.publishState },
              { label: 'Input source', value: inspector.inputSource ?? '—' },
              { label: 'Output target', value: inspector.outputTarget ?? '—' },
            ]}
          />

          <InfoPanel
            title="Last Run"
            rows={[
              { label: 'Last run', value: inspector.lastRun ? new Date(inspector.lastRun).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—' },
              { label: 'Last run status', value: inspector.lastRunStatus ?? '—' },
              { label: 'Owner', value: inspector.ownedBy ?? '—' },
            ]}
          />

          <ActionRail
            title="Actions"
            columns={1}
            actions={[
              { id: 'view-runs', label: 'View current runs', variant: 'primary', href: `/timelines/jobs/job-002` },
              { id: 'retry-step', label: 'Retry failed step', variant: 'secondary' },
              { id: 'pause', label: 'Pause workflow', variant: 'danger' },
              { id: 'create-branch', label: 'Create branch flow', variant: 'secondary', href: `/creation-sessions/new?desk=workflows` },
            ]}
          />
        </div>
      </InspectorLayout>
    </OperatorShell>
  );
}
