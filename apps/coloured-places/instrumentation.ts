export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.ANTENNA_CLIENT_TOKEN_FILE) {
    const { observe } = await import('./lib/antenna-observability');
    void observe().catch(() => console.error('Coloured Places: Antenna observation unavailable; no healthy state inferred.'));
  }
}
