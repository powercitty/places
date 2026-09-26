import { NextRequest, NextResponse } from 'next/server';

import type {
  AgentRuntimeAction,
  AgentRuntimeCheckpoint,
  AgentRuntimeEffectivePolicy,
  AgentRuntimeSessionSnapshot,
  AgentRuntimeTerminalSession,
  AgentRuntimeTurnResult,
} from '@/lib/agent-runtime';
import { isTerminalRunStatus } from '@/lib/agent-runtime';

type ControlPlaneSendOutcome = {
  session_id: string;
  app_id?: string | null;
  run_id: string;
  output_kind: string;
  status: string;
  text: string;
  effective_policy?: Record<string, unknown> | null;
  optimistic?: {
    phase?: string;
    checkpoint?: Record<string, unknown> | null;
    effective_policy?: Record<string, unknown> | null;
    terminal?: Record<string, unknown> | null;
  } | null;
};

type ControlPlaneInspector = {
  body?: {
    session?: Record<string, unknown>;
    latest_run?: Record<string, unknown> | null;
    messages?: Array<Record<string, unknown>>;
  };
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await context.params;
  const payload = await request.json();

  const response = await fetch(`${controlPlaneBaseUrl()}/api/agent-runtime/places/${placeId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${controlPlaneToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: payload.sessionId ?? null,
      text: payload.text ?? '',
      app_id: payload.appId ?? (placeId === 'apps' ? 'coding_agents' : null),
      policy_overrides: payload.policyOverrides ?? null,
      files: Array.isArray(payload.attachments)
        ? payload.attachments.map((file: Record<string, unknown>) => ({
            name: String(file.name ?? 'attachment'),
            size_bytes: Number(file.size ?? 0),
            mime_type: String(file.mimeType ?? 'application/octet-stream'),
          }))
        : [],
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    return NextResponse.json({ error: message }, { status: response.status });
  }

  const ack = (await response.json()) as ControlPlaneSendOutcome;
  const firstSnapshot = await readSessionSnapshot(ack.session_id);
  const snapshot = await waitForSessionSnapshot(ack.session_id, ack.run_id, 4, 500);

  const result: AgentRuntimeTurnResult = {
    sessionId: ack.session_id,
    runId: ack.run_id,
    appId: readString(ack.app_id),
    pending: !snapshot || snapshot.pending,
    sessionStatus: snapshot?.sessionStatus ?? ack.status,
    acknowledgement: ack.text,
    phase: snapshot?.phase ?? readString(ack.optimistic?.phase),
    checkpoint: snapshot?.checkpoint ?? normalizeCheckpoint(readNullableObject(ack.optimistic?.checkpoint)),
    effectivePolicy:
      snapshot?.effectivePolicy ??
      normalizeEffectivePolicy(
        readNullableObject(ack.optimistic?.effective_policy) ?? readNullableObject(ack.effective_policy)
      ),
    terminalSession:
      snapshot?.terminalSession ??
      normalizeOptimisticTerminal(readNullableObject(ack.optimistic?.terminal)) ??
      firstSnapshot?.terminalSession ??
      null,
    replyText: snapshot?.replyText,
    outputKind: snapshot?.outputKind ?? ack.output_kind,
    action: snapshot?.action ?? null,
  };

  return NextResponse.json(result);
}

async function waitForSessionSnapshot(
  sessionId: string,
  runId: string,
  attempts: number,
  delayMs: number
): Promise<AgentRuntimeSessionSnapshot | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const snapshot = await readSessionSnapshot(sessionId);
    if (snapshot && snapshot.runId === runId && !snapshot.pending) {
      return snapshot;
    }
    if (attempt < attempts - 1) {
      await delay(delayMs);
    }
  }

  return null;
}

async function readSessionSnapshot(sessionId: string): Promise<AgentRuntimeSessionSnapshot | null> {
  const response = await fetch(`${controlPlaneBaseUrl()}/query/inspectors/agent_session/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${controlPlaneToken()}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) return null;
  const inspector = (await response.json()) as ControlPlaneInspector;
  return normalizeAgentSession(inspector);
}

function normalizeAgentSession(inspector: ControlPlaneInspector): AgentRuntimeSessionSnapshot | null {
  const body = inspector.body ?? {};
  const session = readObject(body.session);
  const latestRun = readNullableObject(body.latest_run);
  const messages = Array.isArray(body.messages) ? body.messages.filter(isRecord) : [];
  const latestAgentMessage = [...messages].reverse().find((message) => message.role === 'agent');
  const structured = readNullableObject(latestAgentMessage?.structured_payload_json);
  const action = normalizeAction(readNullableObject(structured?.action));
  const runStatus = readString(latestRun?.status);

  const sessionId = readString(session.id);
  if (!sessionId) return null;

  return {
    sessionId,
    sessionStatus: readString(session.status) ?? 'open',
    runId: readString(latestRun?.id),
    appId: readString(readNullableObject(latestRun?.context_refs_json)?.app_id) ?? readString(readNullableObject(session.context_refs_json)?.app_id),
    runStatus,
    phase: readString(latestRun?.phase),
    placeId: readString(latestRun?.place_id) ?? readString(session.place),
    machineOrNodeId: readString(latestRun?.machine_or_node_id) ?? readString(latestRun?.inference_node_id),
    providerOrExecutionSubstrate: readString(latestRun?.provider_or_execution_substrate),
    effectivePolicy: normalizeEffectivePolicy(readNullableObject(latestRun?.effective_policy_json)),
    checkpoint: normalizeCheckpoint(readNullableObject(latestRun?.checkpoint_json)),
    terminalSessionId: readString(latestRun?.terminal_session_id),
    terminalSession: normalizeTerminalSession(readNullableObject(latestRun?.terminal_session)),
    outputKind: readString(latestRun?.output_kind) ?? readString(structured?.output_kind),
    replyText: readString(latestAgentMessage?.content),
    resultSummary: readNullableObject(latestRun?.result_summary_json),
    action,
    updatedAt: readString(session.updated_at),
    pending: !isTerminalRunStatus(runStatus) || !latestAgentMessage,
  };
}

function normalizeTerminalSession(
  value: Record<string, unknown> | null
): AgentRuntimeTerminalSession | null {
  if (!value) return null;
  const id = readString(value.id);
  const status = readString(value.status);
  if (!id || !status) return null;
  return {
    id,
    status,
    title: readString(value.title),
    connectable: typeof value.connectable === 'boolean' ? value.connectable : undefined,
    href: `/inspectors/terminal-sessions/${id}`,
  };
}

function normalizeOptimisticTerminal(
  value: Record<string, unknown> | null
): AgentRuntimeTerminalSession | null {
  if (!value) return null;
  const terminalSessionId = readString(value.terminal_session_id);
  const status = readString(value.status);
  if (!terminalSessionId || !status) return null;
  return {
    id: terminalSessionId,
    status,
    title: 'Run terminal',
    connectable: status === 'bootstrap_captured',
    href: `/inspectors/terminal-sessions/${terminalSessionId}`,
  };
}

function normalizeAction(value: Record<string, unknown> | null): AgentRuntimeAction | null {
  if (!value) return null;
  const actionKind = readString(value.action_kind);
  const targetPlace = readString(value.target_place);
  const status = readString(value.status);
  if (!actionKind || !targetPlace || !status) return null;
  return { actionKind, targetPlace, status };
}

function normalizeEffectivePolicy(
  value: Record<string, unknown> | null
): AgentRuntimeEffectivePolicy | null {
  if (!value) return null;
  const inference = readNullableObject(value.inference);
  const terminal = readNullableObject(value.terminal);
  const fallback = readNullableObject(value.fallback);
  const delivery = readNullableObject(value.delivery);

  return {
    profileId: readString(inference?.profile_id),
    executionMode: readString(value.execution_mode),
    executionSubstrate: readString(inference?.execution_substrate),
    terminalBootstrapOnLaunch:
      typeof terminal?.bootstrap_on_launch === 'boolean' ? terminal.bootstrap_on_launch : undefined,
    terminalBootstrapKind: readString(terminal?.bootstrap_kind),
    fallbackStrategy: readString(fallback?.strategy),
    automaticFallback:
      typeof fallback?.automatic_fallback === 'boolean' ? fallback.automatic_fallback : undefined,
    initialSessionStatus: readString(delivery?.initial_session_status),
  };
}

function normalizeCheckpoint(
  value: Record<string, unknown> | null
): AgentRuntimeCheckpoint | null {
  if (!value) return null;
  return {
    phase: readString(value.phase),
    summary: readString(value.summary),
    terminalStatus: readString(value.terminal_status),
    checkpointAt: readString(value.checkpoint_at),
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function readNullableObject(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? 'Agent runtime request failed.';
  } catch {
    return 'Agent runtime request failed.';
  }
}

function controlPlaneBaseUrl(): string {
  return (process.env.MODES_CONTROL_PLANE_BASE_URL ?? 'http://127.0.0.1:8080').replace(/\/+$/, '');
}

function controlPlaneToken(): string {
  const token = process.env.LAB_ID_OPERATOR_TOKEN ?? process.env.MODES_DEV_OPERATOR_TOKEN;
  if (!token) {
    throw new Error('LAB_ID_OPERATOR_TOKEN or MODES_DEV_OPERATOR_TOKEN is required for agent runtime requests.');
  }
  return token;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
