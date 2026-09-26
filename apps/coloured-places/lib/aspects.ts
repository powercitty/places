/**
 * Aspect model — the "What's here" rows, per docs/place-contracts.md.
 *
 * An aspect is one operational health check on a place: a human label, a state
 * (reusing the reconciliation grammar), a short human value ("SECURE", "ON MAINS",
 * "1 HOG"), and freshness (when we last checked). The card rolls the whole list
 * up to its single worst aspect.
 *
 * Signals here are HONESTLY MOCKED per the interviewed contracts — clearly fake,
 * shaped exactly as the real per-place adapters will produce them.
 */
import type { ReconState, ReconSeverity } from './reconciliation';
import { ANOMALY_STATES, RECON_STATES } from './reconciliation';

export type AspectGroup = 'services' | 'identity' | 'machine' | 'hygiene' | 'data' | 'observer';

export interface Aspect {
  id: string;
  label: string;
  group: AspectGroup;
  /** Reuses the reconciliation grammar for colour + severity ordering. */
  state: ReconState;
  /** Short human value shown on the right, e.g. "SECURE", "ON MAINS", "2 OPEN". */
  value: string;
  /** One line: what this checks / what's wrong. */
  detail: string;
  severity: ReconSeverity;
  /** Relative freshness, e.g. "2m ago". */
  checkedAgo: string;
  /** Within the freshness window? false → this row's evidence is stale. */
  fresh: boolean;
}

const anomaly = (s: ReconState) => ANOMALY_STATES.includes(s);

/** Aspects that deserve attention, worst-first (then stale-but-ok after). */
export function sortAspects(aspects: Aspect[]): Aspect[] {
  return [...aspects].sort((a, b) => {
    const d = RECON_STATES[b.state].severityRank - RECON_STATES[a.state].severityRank;
    if (d !== 0) return d;
    // fresh-but-equal: stale sinks slightly below fresh
    return Number(b.fresh) - Number(a.fresh);
  });
}

export interface AspectSummary {
  total: number;
  needLook: number;
  worst: Aspect | null;
}

export function summarizeAspects(aspects: Aspect[]): AspectSummary {
  const problems = aspects.filter((a) => anomaly(a.state));
  const worst = sortAspects(problems)[0] ?? null;
  return { total: aspects.length, needLook: problems.length, worst };
}

// ── Per-place adapters (mock per the contracts) ──────────────────────────────

const SUPABASE_ASPECTS: Aspect[] = [
  { id: 'sb-project', label: 'Supabase project', group: 'services', state: 'healthy', value: 'OK', detail: 'Project exists and responds.', severity: 'info', checkedAgo: '1m ago', fresh: true },
  { id: 'sb-db', label: 'Database', group: 'services', state: 'at_risk', value: 'DEGRADED', detail: 'Postgres reachable but reporting elevated latency.', severity: 'critical', checkedAgo: '1m ago', fresh: true },
  { id: 'sb-structure', label: 'Database structure', group: 'data', state: 'healthy', value: 'OK', detail: 'Critical expected structures present and matching.', severity: 'info', checkedAgo: '12m ago', fresh: true },
  { id: 'sb-alerts', label: 'Supabase alerts', group: 'services', state: 'drifted', value: '2 OPEN', detail: 'Two platform advisories need attention.', severity: 'warning', checkedAgo: '9m ago', fresh: true },
  { id: 'sb-edge', label: 'Edge functions', group: 'services', state: 'missing', value: '1 FAILING', detail: 'reconcile-nightly: no successful run in 72h.', severity: 'critical', checkedAgo: '2m ago', fresh: true },
  { id: 'sb-backups', label: 'Backups', group: 'data', state: 'changed', value: 'RECENT', detail: 'PITR enabled; last snapshot within window.', severity: 'info', checkedAgo: '30m ago', fresh: true },
  { id: 'sb-storage', label: 'Storage', group: 'data', state: 'healthy', value: 'OK', detail: 'Required buckets available.', severity: 'info', checkedAgo: '14m ago', fresh: true },
  { id: 'sb-observer', label: 'Observer', group: 'observer', state: 'healthy', value: 'FRESH', detail: 'We can still see everything above.', severity: 'info', checkedAgo: '1m ago', fresh: true },
];

const LAB8GB_ASPECTS: Aspect[] = [
  { id: 'l8-antenna', label: 'Antenna ingress', group: 'services', state: 'healthy', value: 'OK', detail: 'Routing everything it claims to route.', severity: 'info', checkedAgo: '1m ago', fresh: true },
  { id: 'l8-vault', label: 'Minivault', group: 'identity', state: 'healthy', value: 'SECURE', detail: 'Sealed, not network-exposed, keys within policy.', severity: 'info', checkedAgo: '1m ago', fresh: true },
  { id: 'l8-heartime', label: 'Heartime', group: 'machine', state: 'healthy', value: 'PULSING', detail: 'Fleet pulse steady.', severity: 'info', checkedAgo: '20s ago', fresh: true },
  { id: 'l8-research', label: 'Research institute', group: 'services', state: 'healthy', value: 'ON', detail: 'Up and answering.', severity: 'info', checkedAgo: '2m ago', fresh: true },
  { id: 'l8-identity', label: 'Identity / authority', group: 'identity', state: 'healthy', value: 'OK', detail: 'Authority resolution answering.', severity: 'critical', checkedAgo: '1m ago', fresh: true },
  { id: 'l8-machine', label: 'Machine', group: 'machine', state: 'healthy', value: 'UP', detail: 'Mini up, heartbeat arriving.', severity: 'info', checkedAgo: '30s ago', fresh: true },
  { id: 'l8-power', label: 'Power (UPS)', group: 'machine', state: 'healthy', value: 'ON MAINS', detail: 'On mains; battery full.', severity: 'info', checkedAgo: '30s ago', fresh: true },
  { id: 'l8-memory', label: 'Memory', group: 'hygiene', state: 'unexpected', value: '1 HOG', detail: 'A process is holding RAM for no clear reason.', severity: 'warning', checkedAgo: '3m ago', fresh: true },
  { id: 'l8-login', label: 'Login items', group: 'hygiene', state: 'unregistered', value: '1 STRAY', detail: 'A launch-at-login item nobody registered.', severity: 'warning', checkedAgo: '3m ago', fresh: true },
  { id: 'l8-registered', label: 'Registered things', group: 'hygiene', state: 'healthy', value: 'OK', detail: 'Everything registered is present and live.', severity: 'info', checkedAgo: '3m ago', fresh: true },
  { id: 'l8-link', label: 'Link to LAB 512', group: 'machine', state: 'healthy', value: 'OK', detail: 'Ethernet link up — interchangeability intact.', severity: 'info', checkedAgo: '30s ago', fresh: true },
  { id: 'l8-disk', label: 'Disk', group: 'machine', state: 'healthy', value: 'OK', detail: 'Plenty of headroom.', severity: 'info', checkedAgo: '11m ago', fresh: true },
  { id: 'l8-thermals', label: 'Thermals', group: 'machine', state: 'healthy', value: 'OK', detail: 'Temperature nominal.', severity: 'info', checkedAgo: '11m ago', fresh: true },
  { id: 'l8-time', label: 'Time sync', group: 'machine', state: 'healthy', value: 'OK', detail: 'Clock in sync — auth stays valid.', severity: 'info', checkedAgo: '5m ago', fresh: true },
  { id: 'l8-security', label: 'Security', group: 'identity', state: 'healthy', value: 'OK', detail: 'FileVault on, firewall on, no surprise ports.', severity: 'critical', checkedAgo: '8m ago', fresh: true },
  { id: 'l8-observer', label: 'Observer', group: 'observer', state: 'healthy', value: 'FRESH', detail: 'We can still perform every check above.', severity: 'info', checkedAgo: '30s ago', fresh: true },
];

const ADAPTERS: Record<string, Aspect[]> = {
  supabase: SUPABASE_ASPECTS,
  'lab-8gb': LAB8GB_ASPECTS,
};

/** Bespoke aspect list for a place, or null to fall back to the generic recon list. */
export function getPlaceAspects(placeId: string): Aspect[] | null {
  return ADAPTERS[placeId] ?? null;
}
