import { notFound } from 'next/navigation';
import { queryClient } from '@/lib/query-client';
import type { JobInspector } from '@/lib/types';
import { OperatorShell } from '@/components/shell/OperatorShell';
import { StatusChip } from '@/components/StatusChip';
import { InspectorLayout } from '@/components/inspector/InspectorLayout';
import { InfoPanel } from '@/components/shell/InfoPanel';
import { ActionRail } from '@/components/shell/ActionRail';
import { AlertTriangle } from 'lucide-react';

interface Props { params: Promise<{ id: string }>; }

export default async function JobInspectorPage({ params }: Props) {
  const { id } = await params;
  const inspector = (await queryClient.getInspector('job', id)) as JobInspector | null;
  if (!inspector) notFound();

  const isFailed = inspector.status === 'warning' || inspector.status === 'degraded';

  return (
    <OperatorShell
      title={inspector.canonicalName}
      descriptor="Job Inspector"
      breadcrumbs={[
        { label: 'LAB 512', href: '/places/lab-512' },
        { label: inspector.canonicalName },
      ]}
      badge={<StatusChip status={inspector.status} />}
    >
      <InspectorLayout
        inspector={inspector}
        timelineHref={`/timelines/jobs/${id}`}
        logsHref={`/log-views/jobs/${id}`}
      >
        <div className="space-y-5">
          {/* Error block */}
          {isFailed && inspector.errorMessage && (
            <div className="flex gap-3 p-4 rounded-xl bg-red-500/8 border border-red-500/20">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-300 uppercase tracking-wider mb-1">Execution Error</p>
                <p className="text-sm text-red-200/65 leading-relaxed font-mono text-xs">{inspector.errorMessage}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InfoPanel
              title="Execution Identity"
              rows={[
                { label: 'Job name', value: inspector.canonicalName },
                { label: 'Worker node', value: inspector.workerNode ?? '—' },
                { label: 'Workflow', value: inspector.workflowId ?? 'standalone' },
                { label: 'Owner', value: inspector.ownedBy ?? '—' },
              ]}
            />

            <InfoPanel
              title="Timing"
              rows={[
                { label: 'Started', value: inspector.startedAt ? new Date(inspector.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—' },
                { label: 'Completed', value: inspector.completedAt ? new Date(inspector.completedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : 'in progress' },
                { label: 'Exit code', value: inspector.exitCode != null ? String(inspector.exitCode) : '—' },
              ]}
            />

            <InfoPanel
              title="Input / Output"
              rows={[
                { label: 'Input', value: inspector.inputSummary ?? '—' },
                { label: 'Output', value: inspector.outputSummary ?? '—' },
              ]}
            />

            <ActionRail
              title="Actions"
              columns={1}
              actions={[
                { id: 'view-logs', label: 'Open execution logs', variant: 'primary', href: `/log-views/jobs/${id}` },
                { id: 'retry', label: 'Retry job', variant: 'secondary' },
                { id: 'cancel', label: 'Cancel job', variant: 'danger', disabled: !!inspector.completedAt },
                { id: 'timeline', label: 'View timeline', variant: 'ghost', href: `/timelines/jobs/${id}` },
              ]}
            />
          </div>
        </div>
      </InspectorLayout>
    </OperatorShell>
  );
}
