/**
 * Command Client — frontend seam for write/action operations.
 *
 * Until the command boundary is live, this client returns explicit SOON failures
 * instead of pretending to mutate canonical state locally.
 */

import type { AgentRuntimeSessionSnapshot, AgentRuntimeTurnResult } from './agent-runtime';
import type { AttachedFile, CreationSession, SessionDeskType, SessionField } from './types';

class CommandClient {
  // ─── Agent chat ───────────────────────────────────────────────────────────

  /**
   * Send a chat message (with optional file attachments) to the place agent.
   *
   * In production: POST /places/{placeId}/agent/messages
   *   multipart/form-data: text (string) + raw File bytes
   *   Response: { text: string; files?: AttachedFile[] }
   *
   * To wire a real backend, replace the local respond() call in AgentChat
   * with an await of this method, and build a FormData from the raw File
   * objects (obtainable via fetch(attachment.objectUrl) → blob).
   */
  async sendChatMessage(
    placeId: string,
    text: string,
    attachments: AttachedFile[],
    sessionId?: string
  ): Promise<AgentRuntimeTurnResult> {
    const response = await fetch(`/api/agent-runtime/places/${encodeURIComponent(placeId)}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        text,
        attachments: attachments.map((file) => ({
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
        })),
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `Agent runtime request failed for ${placeId}.`);
    }

    return (await response.json()) as AgentRuntimeTurnResult;
  }

  async readAgentSession(sessionId: string): Promise<AgentRuntimeSessionSnapshot> {
    const response = await fetch(`/api/agent-runtime/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `Agent session ${sessionId} could not be read.`);
    }

    return (await response.json()) as AgentRuntimeSessionSnapshot;
  }

  async continueTerminalSession(
    terminalSessionId: string,
    command: string
  ): Promise<{ terminalSessionId: string; status: string }> {
    const response = await fetch(
      `/api/agent-runtime/terminal-sessions/${encodeURIComponent(terminalSessionId)}/continue`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `Terminal session ${terminalSessionId} could not be continued.`);
    }

    const body = (await response.json()) as { terminalSessionId: string; status: string };
    return body;
  }

  // ─── Creation Sessions ────────────────────────────────────────────────────

  async startSession(
    deskType: SessionDeskType,
    intent: string
  ): Promise<{ sessionId: string }> {
    await delay(100);
    throw new Error(
      `SOON: creation session open boundary is not wired yet for ${deskType}. Refusing fake session start for intent "${intent}".`
    );
  }

  async updateSessionFields(
    sessionId: string,
    fields: SessionField[]
  ): Promise<CreationSession> {
    await delay(100);
    throw new Error(
      `SOON: creation session continue boundary is not wired yet for ${sessionId}. Refusing fake field update with ${fields.length} field(s).`
    );
  }

  async confirmSession(sessionId: string): Promise<CreationSession> {
    await delay(100);
    throw new Error(`SOON: creation session confirm boundary is not wired yet for ${sessionId}.`);
  }

  async cancelSession(sessionId: string): Promise<void> {
    await delay(50);
    throw new Error(`SOON: session cancellation is not wired yet for ${sessionId}.`);
  }

  // ─── Job Actions ──────────────────────────────────────────────────────────

  async retryJob(jobId: string): Promise<void> {
    await delay(50);
    throw new Error(`SOON: retry command boundary is not wired yet for ${jobId}.`);
  }

  async cancelJob(jobId: string): Promise<void> {
    await delay(50);
    throw new Error(`SOON: cancel command boundary is not wired yet for ${jobId}.`);
  }

  // ─── Workflow Actions ─────────────────────────────────────────────────────

  async pauseWorkflow(workflowId: string): Promise<void> {
    await delay(50);
    throw new Error(`SOON: pause workflow boundary is not wired yet for ${workflowId}.`);
  }

  async retryWorkflowStep(workflowId: string, stepIndex: number): Promise<void> {
    await delay(50);
    throw new Error(`SOON: retry workflow step boundary is not wired yet for ${workflowId}#${stepIndex}.`);
  }

  // ─── Key Rotation ─────────────────────────────────────────────────────────

  async rotateCredential(credentialId: string): Promise<void> {
    await delay(50);
    throw new Error(`SOON: credential rotation boundary is not wired yet for ${credentialId}.`);
  }
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export const commandClient = new CommandClient();
