import { NextResponse } from 'next/server';

import type { TerminalSessionInspector } from '@/lib/types';
import { normalizeTerminalSessionInspector } from '@/lib/terminal-session-inspector';

type ControlPlaneInspector = {
  body?: {
    terminal_session?: Record<string, unknown>;
  };
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ terminalSessionId: string }> }
) {
  try {
    const { terminalSessionId } = await context.params;
    const response = await fetch(
      `${controlPlaneBaseUrl()}/query/inspectors/terminal_session/${encodeURIComponent(terminalSessionId)}`,
      {
        headers: {
          Authorization: `Bearer ${controlPlaneToken()}`,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Terminal session not found.' },
        { status: response.status }
      );
    }

    const inspector = (await response.json()) as ControlPlaneInspector;
    const terminal = inspector.body?.terminal_session;
    if (!terminal) {
      return NextResponse.json(
        { error: 'Terminal session payload was invalid.' },
        { status: 502 }
      );
    }

    const normalized: TerminalSessionInspector = normalizeTerminalSessionInspector(
      terminalSessionId,
      terminal
    );

    return NextResponse.json(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terminal session read failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function controlPlaneBaseUrl(): string {
  return (process.env.MODES_CONTROL_PLANE_BASE_URL ?? 'http://127.0.0.1:8080').replace(/\/+$/, '');
}

function controlPlaneToken(): string {
  const token = process.env.LAB_ID_OPERATOR_TOKEN ?? process.env.MODES_DEV_OPERATOR_TOKEN;
  if (!token) {
    throw new Error('LAB_ID_OPERATOR_TOKEN or MODES_DEV_OPERATOR_TOKEN is required for terminal session reads.');
  }
  return token;
}
