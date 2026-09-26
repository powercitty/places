import { notFound } from 'next/navigation';
import { queryClient } from '@/lib/query-client';
import type { EntityInspector } from '@/lib/types';
import { OperatorShell } from '@/components/shell/OperatorShell';
import { StatusChip } from '@/components/StatusChip';
import { TimelineView } from '@/components/timeline/TimelineView';

interface Props { params: Promise<{ id: string }>; }

export default async function EntityTimelinePage({ params }: Props) {
  const { id } = await params;
  const timeline = await queryClient.getTimeline('entity', id);
  if (!timeline) notFound();

  const inspector = (await queryClient.getInspector('entity', id)) as EntityInspector | null;

  return (
    <OperatorShell
      title={`Timeline — ${timeline.objectLabel}`}
      descriptor="Entity Timeline"
      breadcrumbs={[
        { label: 'LAB ID', href: '/places/lab-id' },
        { label: timeline.objectLabel, href: `/inspectors/entities/${id}` },
        { label: 'Timeline' },
      ]}
      badge={inspector ? <StatusChip status={inspector.status} /> : undefined}
    >
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/35 font-medium">
            {timeline.events.length} events · most recent first
          </p>
        </div>
        <TimelineView timeline={timeline} />
      </div>
    </OperatorShell>
  );
}
