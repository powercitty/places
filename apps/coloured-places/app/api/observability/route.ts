import { observe, readObservation } from '@/lib/antenna-observability';
export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json(await readObservation(), { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== process.env.NEXT_PUBLIC_BASE_URL) {
    return Response.json({ error: 'Same-origin request required' }, { status: 403 });
  }
  try { return Response.json(await observe()); }
  catch { return Response.json({ status: 'unknown', error: 'Could not complete the observation through Antenna' }, { status: 502 }); }
}
