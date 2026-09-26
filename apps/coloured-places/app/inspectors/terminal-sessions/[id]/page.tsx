import { notFound } from 'next/navigation';
import { queryClient } from '@/lib/query-client';
import type { TerminalSessionInspector } from '@/lib/types';
import { OperatorShell } from '@/components/shell/OperatorShell';
import { StatusChip } from '@/components/StatusChip';
import { InspectorLayout } from '@/components/inspector/InspectorLayout';
import { ActionRail } from '@/components/shell/ActionRail';
import { TerminalSessionLiveInspector } from '@/components/terminal-session/TerminalSessionLiveInspector';

interface Props { params: Promise<{ id: string }>; }

export default async function TerminalSessionInspectorPage({ params }: Props) {
  const { id } = await params;
  const inspector = (await queryClient.getInspector('terminal_session', id)) as TerminalSessionInspector | null;
  if (!inspector) notFound();

  return (
    <OperatorShell
      title={inspector.canonicalName}
      descriptor="Terminal Session Inspector"
      breadcrumbs={[
        { label: 'LAB 512', href: '/places/lab-512' },
        { label: 'Terminal session' },
      ]}
      badge={<StatusChip status={inspector.status} />}
    >
      <InspectorLayout inspector={inspector}>
        <div className="space-y-5">
          <TerminalSessionLiveInspector initialInspector={inspector} />

          <ActionRail
            title="Actions"
            columns={1}
            actions={[
              inspector.runId
                ? { id: 'open-run-thread', label: 'Open originating place agent', variant: 'primary', href: `/places/${inspector.placeId ?? 'lab-512'}/agent` }
                : { id: 'open-lab512', label: 'Open LAB 512', variant: 'primary', href: '/places/lab-512' },
            ]}
          />
        </div>
      </InspectorLayout>
    </OperatorShell>
  );
}
