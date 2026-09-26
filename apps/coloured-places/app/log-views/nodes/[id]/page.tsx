import { notFound } from 'next/navigation';
import { queryClient } from '@/lib/query-client';
import { OperatorShell } from '@/components/shell/OperatorShell';
import { LogView } from '@/components/log-view/LogView';

interface Props { params: Promise<{ id: string }>; }

// Map node IDs to places for breadcrumbs
const nodeToPlace: Record<string, { label: string; href: string }> = {
  'node-8gb': { label: 'LAB 8GB', href: '/places/lab-8gb' },
  'node-256': { label: 'LAB 256', href: '/places/lab-256' },
  'node-512': { label: 'LAB 512', href: '/places/lab-512' },
};

export default async function NodeLogViewPage({ params }: Props) {
  const { id } = await params;
  const logView = await queryClient.getLogView('node', id);
  if (!logView) notFound();

  const place = nodeToPlace[id];

  return (
    <OperatorShell
      title={`Logs — ${logView.sourceLabel}`}
      descriptor="Node Log View"
      breadcrumbs={[
        ...(place ? [{ label: place.label, href: place.href }] : []),
        { label: 'Logs' },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <p className="text-xs text-white/35 font-medium">
            {logView.entries.length} entries
            {logView.hasMore ? ' · more available' : ''}
          </p>
          <span className="text-[10px] text-white/20 font-mono uppercase">node: {id}</span>
        </div>
        <LogView logView={logView} />
      </div>
    </OperatorShell>
  );
}
