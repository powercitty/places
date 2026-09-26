export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({ status: 'alive', identity: 'pf.coloured-places' }, { headers: { 'Cache-Control': 'no-store' } });
}
