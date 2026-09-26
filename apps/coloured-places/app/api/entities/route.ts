import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      kind?: string;
      canonicalName?: string;
      aliases?: string[];
      description?: string | null;
      registrationContext?: Record<string, unknown> | null;
    };

    const response = await fetch(`${controlPlaneBaseUrl()}/api/entities`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${controlPlaneToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kind: payload.kind,
        canonical_name: payload.canonicalName,
        aliases: Array.isArray(payload.aliases) ? payload.aliases : [],
        description: payload.description ?? null,
        registration_context: payload.registrationContext ?? null,
      }),
    });

    if (!response.ok) {
      const error = await readError(response);
      return NextResponse.json({ error }, { status: response.status });
    }

    const body = (await response.json()) as { entity_id: string };
    return NextResponse.json({ entityId: body.entity_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Entity registration failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? 'Entity registration failed.';
  } catch {
    return 'Entity registration failed.';
  }
}

function controlPlaneBaseUrl(): string {
  return (process.env.MODES_CONTROL_PLANE_BASE_URL ?? 'http://127.0.0.1:8080').replace(/\/+$/, '');
}

function controlPlaneToken(): string {
  const token = process.env.LAB_ID_OPERATOR_TOKEN ?? process.env.MODES_DEV_OPERATOR_TOKEN;
  if (!token) {
    throw new Error('LAB_ID_OPERATOR_TOKEN or MODES_DEV_OPERATOR_TOKEN is required for entity registration.');
  }
  return token;
}
