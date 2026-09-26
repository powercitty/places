export interface AgentRuntimeAction {
  actionKind: string;
  targetPlace: string;
  status: string;
}

export interface AgentRuntimeEffectivePolicy {
  profileId?: string;
  executionMode?: string;
  executionSubstrate?: string;
  terminalBootstrapOnLaunch?: boolean;
  terminalBootstrapKind?: string | null;
  fallbackStrategy?: string;
  automaticFallback?: boolean;
  initialSessionStatus?: string;
}

export interface AgentRuntimeCheckpoint {
  phase?: string;
  summary?: string;
  terminalStatus?: string | null;
  checkpointAt?: string;
}

export interface AgentRuntimeTerminalSession {
  id: string;
  status: string;
  title?: string;
  connectable?: boolean;
  href?: string;
}

export interface AgentRuntimeTurnResult {
  sessionId: string;
  runId: string;
  appId?: string;
  pending: boolean;
  sessionStatus: string;
  acknowledgement: string;
  phase?: string;
  checkpoint?: AgentRuntimeCheckpoint | null;
  effectivePolicy?: AgentRuntimeEffectivePolicy | null;
  terminalSession?: AgentRuntimeTerminalSession | null;
  replyText?: string;
  outputKind?: string;
  action?: AgentRuntimeAction | null;
}

export interface AgentRuntimeSessionSnapshot {
  sessionId: string;
  sessionStatus: string;
  runId?: string;
  appId?: string;
  runStatus?: string;
  phase?: string;
  placeId?: string;
  machineOrNodeId?: string;
  providerOrExecutionSubstrate?: string;
  effectivePolicy?: AgentRuntimeEffectivePolicy | null;
  checkpoint?: AgentRuntimeCheckpoint | null;
  terminalSessionId?: string;
  terminalSession?: AgentRuntimeTerminalSession | null;
  outputKind?: string;
  replyText?: string;
  resultSummary?: Record<string, unknown> | null;
  action?: AgentRuntimeAction | null;
  updatedAt?: string;
  pending: boolean;
}

export function isTerminalRunStatus(status?: string | null): boolean {
  return status === 'completed' || status === 'failed';
}
