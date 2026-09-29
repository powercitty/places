export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ status: 'alive', identity: 'powerfarm.coloured-places' }, { headers: { 'Cache-Control': 'no-store' } });
}
