import type { StatusLevel, TerminalSessionInspector } from './types';

export function normalizeTerminalSessionInspector(
  id: string,
  terminal?: Record<string, unknown>
): TerminalSessionInspector {
  const metadata = isRecord(terminal?.metadata_json) ? terminal.metadata_json : {};
  const transcript = Array.isArray(terminal?.transcript_excerpt_json)
    ? terminal.transcript_excerpt_json
        .filter(
          (entry): entry is Record<string, unknown> =>
            Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
        )
        .map((entry) => ({
          stream: String(entry.stream ?? 'stdout'),
          text: String(entry.text ?? ''),
        }))
        .filter((entry) => entry.text.trim().length > 0)
    : [];

  return {
    id,
    type: 'terminal_session',
    canonicalName: String(terminal?.title ?? `TERMINAL ${id.slice(0, 8)}`),
    descriptor: 'Live terminal session inspector',
    status: statusLevelForTerminalStatus(String(terminal?.status ?? 'unknown')),
    createdAt: String(terminal?.opened_at ?? new Date().toISOString()),
    updatedAt: String(terminal?.updated_at ?? new Date().toISOString()),
    terminalKind: String(terminal?.terminal_kind ?? 'spawned_run_terminal'),
    terminalStatus: String(terminal?.status ?? 'unknown'),
    connectable: Boolean(terminal?.connectable),
    runId: typeof terminal?.run_id === 'string' ? terminal.run_id : undefined,
    sessionId: typeof terminal?.session_id === 'string' ? terminal.session_id : undefined,
    placeId: typeof terminal?.place_id === 'string' ? terminal.place_id : undefined,
    machineOrNodeId:
      typeof terminal?.machine_or_node_id === 'string' ? terminal.machine_or_node_id : undefined,
    providerOrExecutionSubstrate:
      typeof terminal?.provider_or_execution_substrate === 'string'
        ? terminal.provider_or_execution_substrate
        : undefined,
    transcriptPreview:
      transcript.length > 0
        ? transcript
        : [{ stream: 'stdout', text: 'No terminal excerpt was published for this session.' }],
    lastInterventionCommand:
      typeof metadata.last_intervention_command === 'string'
        ? metadata.last_intervention_command
        : undefined,
    lastInterventionQueuedAt:
      typeof metadata.last_intervention_queued_at === 'string'
        ? metadata.last_intervention_queued_at
        : undefined,
    closedAt: typeof terminal?.closed_at === 'string' ? terminal.closed_at : undefined,
  };
}

function statusLevelForTerminalStatus(status: string): StatusLevel {
  switch (status) {
    case 'bootstrap_failed':
    case 'bootstrap_timeout':
      return 'warning';
    case 'queued_intervention':
    case 'pending_attach':
      return 'syncing';
    case 'intervention_captured':
      return 'attention';
    case 'bootstrap_captured':
      return 'healthy';
    default:
      return 'healthy';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
