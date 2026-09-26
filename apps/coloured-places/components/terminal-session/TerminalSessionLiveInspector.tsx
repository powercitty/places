'use client';

import { useEffect, useState } from 'react';

import type { TerminalSessionInspector } from '@/lib/types';
import { InfoPanel } from '@/components/shell/InfoPanel';
import { StatusChip } from '@/components/StatusChip';
import { TerminalSessionContinueComposer } from '@/components/terminal-session/TerminalSessionContinueComposer';

export function TerminalSessionLiveInspector({
  initialInspector,
}: {
  initialInspector: TerminalSessionInspector;
}) {
  const [inspector, setInspector] = useState(initialInspector);
  const [readState, setReadState] = useState<'idle' | 'polling' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        setReadState('polling');
        const response = await fetch(`/api/agent-runtime/terminal-sessions/${inspector.id}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error('Terminal session refresh failed.');
        }
        const next = (await response.json()) as TerminalSessionInspector;
        if (!cancelled) {
          setInspector(next);
          setReadState('idle');
        }
      } catch {
        if (!cancelled) {
          setReadState('error');
        }
      }
    };

    refresh();
    const timer = window.setInterval(refresh, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [inspector.id]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
            Live terminal read
          </p>
          <p className="mt-1 text-[12px] text-white/58">
            Polling this session every 2.5 seconds so the inspector follows queued interventions
            without manual reload.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={inspector.status} />
          <span className="text-[11px] text-white/42">
            {readState === 'error'
              ? 'refresh delayed'
              : readState === 'polling'
                ? 'refreshing'
                : `updated ${formatTimestamp(inspector.updatedAt)}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <InfoPanel
          title="Session Identity"
          rows={[
            { label: 'Terminal kind', value: inspector.terminalKind },
            { label: 'Status', value: inspector.terminalStatus.replace(/_/g, ' ') },
            { label: 'Place', value: inspector.placeId ?? '—' },
            { label: 'Run', value: inspector.runId ?? '—' },
            { label: 'Last update', value: formatTimestamp(inspector.updatedAt) },
          ]}
        />

        <InfoPanel
          title="Execution Context"
          rows={[
            { label: 'Node', value: inspector.machineOrNodeId ?? '—' },
            { label: 'Substrate', value: inspector.providerOrExecutionSubstrate ?? '—' },
            { label: 'Connectable', value: inspector.connectable ? 'yes' : 'no' },
            { label: 'Session', value: inspector.sessionId ?? '—' },
            {
              label: 'Last command',
              value: inspector.lastInterventionCommand ?? '—',
            },
            {
              label: 'Queued at',
              value: formatTimestamp(inspector.lastInterventionQueuedAt),
            },
          ]}
        />
      </div>

      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/30">
          Transcript Excerpt
        </p>
        <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
          {inspector.transcriptPreview.map((entry, index) => (
            <div
              key={`${entry.stream}-${index}-${entry.text.slice(0, 16)}`}
              className={`px-4 py-3 ${
                index < inspector.transcriptPreview.length - 1 ? 'border-b border-white/[0.05]' : ''
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                {entry.stream}
              </p>
              <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-white/72">
                {entry.text}
              </pre>
            </div>
          ))}
        </div>
      </div>

      <TerminalSessionContinueComposer
        terminalSessionId={inspector.id}
        onQueued={(status, command) => {
          setInspector((current) => ({
            ...current,
            status: 'syncing',
            terminalStatus: status,
            lastInterventionCommand: command,
            lastInterventionQueuedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
        }}
      />
    </div>
  );
}

function formatTimestamp(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
