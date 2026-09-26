import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const contract = 'coloured-places.observability';
const stateFile = () => {
  const path = process.env.POWERFARM_OBSERVATION_FILE;
  if (!path) throw new Error('Observation storage is not configured');
  return path;
};

export async function readObservation() {
  try {
    const value = JSON.parse(await readFile(stateFile(), 'utf8'));
    return { ...value, freshness: Date.now() - Date.parse(value.observed_at) > 120_000 ? 'stale' : 'fresh' };
  } catch { return { status: 'unknown', reason: 'No persisted observation', contract }; }
}

let pending: Promise<unknown> | undefined;
export function observe() {
  pending ??= collect().finally(() => { pending = undefined; });
  return pending;
}

async function collect() {
  const tokenFile = process.env.ANTENNA_CLIENT_TOKEN_FILE;
  if (!tokenFile) throw new Error('Antenna contract credential is not configured');
  const token = (await readFile(tokenFile, 'utf8')).trim();
  const base = 'https://antenna.minilab.work';
  let antenna: Record<string, unknown>;
  try {
    const r = await fetch(base + '/health', { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000) });
    const body = await r.json();
    antenna = { state: r.ok && body.status === 'alive' ? 'healthy' : 'needs_a_look', http_status: r.status, contract_services: body.contract_services };
  } catch { antenna = { state: 'unknown', reason: 'Observer could not establish Antenna health' }; }
  const observed_at = new Date().toISOString();
  const input = { event: 'powerfarm.observation', source: 'pf.coloured-places', observed_at, aspects: { antenna } };
  const r = await fetch(base + '/', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(65_000),
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'powerfarm-coloured-places/1', 'Antenna-Contract': contract, Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const receipt = await r.json();
  if (!r.ok || receipt.status !== 'completed') throw new Error(`Antenna observation was not completed (HTTP ${r.status})`);
  const observation = { ...input, contract, receipt_id: receipt.receipt_id, result: receipt.result };
  const path = stateFile(); await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(observation, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  await rename(tmp, path);
  return observation;
}
