import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ terminalSessionId: string }> }
) {
  try {
    const { terminalSessionId } = await context.params;
    const payload = (await request.json()) as { command?: string };

    const response = await fetch(
      `${controlPlaneBaseUrl()}/api/agent-runtime/terminal-sessions/${encodeURIComponent(terminalSessionId)}/continue`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${controlPlaneToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: payload.command ?? '',
        }),
      }
    );

    if (!response.ok) {
      const error = await readError(response);
      return NextResponse.json({ error }, { status: response.status });
    }

    const body = (await response.json()) as {
      terminal_session_id: string;
      status: string;
    };

    return NextResponse.json({
      terminalSessionId: body.terminal_session_id,
      status: body.status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Terminal continuation request failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? 'Terminal continuation request failed.';
  } catch {
    return 'Terminal continuation request failed.';
  }
}

function controlPlaneBaseUrl(): string {
  return (process.env.MODES_CONTROL_PLANE_BASE_URL ?? 'http://127.0.0.1:8080').replace(/\/+$/, '');
}

function controlPlaneToken(): string {
  const token = process.env.LAB_ID_OPERATOR_TOKEN ?? process.env.MODES_DEV_OPERATOR_TOKEN;
  if (!token) {
    throw new Error('LAB_ID_OPERATOR_TOKEN or MODES_DEV_OPERATOR_TOKEN is required for terminal continuation.');
  }
  return token;
}
