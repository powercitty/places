/**
 * Reconciliation model — the core mental model of the product.
 *
 * Every place is a comparison between INTENT (what should exist, the
 * registered/expected state) and REALITY (what is actually observed).
 * The UI never just lists what is registered; it exposes the DIFFERENCE.
 *
 * These shapes are designed to map directly onto future Supabase tables
 * (e.g. `recon_items`, `recon_runs`, `change_events`). The mock datasets
 * below stand in for real reads until that backend lands.
 */

// ─── Reconciliation states (the visual grammar) ─────────────────────────────

export type ReconState =
  | 'healthy'       // exists, registered, config matches intent
  | 'changed'       // matches intent, but something changed recently — worth a glance
  | 'drifted'       // exists and registered, but config no longer matches intent
  | 'at_risk'       // matches intent, but a security / maintenance / compliance issue applies
  | 'missing'       // registered / expected, but not observed in reality
  | 'unexpected'    // observed in reality, but intent says it should no longer exist
  | 'unregistered'  // observed in reality, legit or not, but absent from the registry
  | 'obsolete';     // registered long ago, no longer referenced by anything

export type ReconSeverity = 'info' | 'warning' | 'critical';

export interface DriftField {
  field: string;
  expected: string;
  actual: string;
}

export interface ReconItem {
  id: string;
  name: string;
  /** Resource kind: table, bucket, node, policy, workflow, credential, route… */
  kind: string;
  state: ReconState;
  expected: boolean;
  observed: boolean;
  /** One line: what this thing is. */
  detail: string;
  /** For anomalies: why it needs attention. */
  reason?: string;
  drift?: DriftField[];
  /** Relative timestamp of last observed change, e.g. "2h ago". */
  lastChange?: string;
  severity: ReconSeverity;
}

export interface ChangeEvent {
  id: string;
  at: string; // relative, e.g. "38m ago"
  actor: string;
  message: string;
  state?: ReconState; // state this change produced, if any
}

export interface PlaceRecon {
  placeId: string;
  /** Where intent comes from (registry / IaC / migrations). */
  intentSource: string;
  /** Where reality is observed from. */
  observedSource: string;
  lastReconciled: string; // relative
  items: ReconItem[];
  changes: ChangeEvent[];
}

// ─── Grammar metadata ────────────────────────────────────────────────────────

export interface ReconStateMeta {
  label: string;
  /** Short question this state answers. */
  question: string;
  /** Hex accent used on dark surfaces. */
  color: string;
  severityRank: number; // higher = deserves attention first
}

export const RECON_STATES: Record<ReconState, ReconStateMeta> = {
  missing:      { label: 'Missing',     question: 'Should be here — but isn’t',            color: '#f87171', severityRank: 6 },
  at_risk:      { label: 'At risk',     question: 'Here — but needs care',                 color: '#fb923c', severityRank: 5 },
  drifted:      { label: 'Out of sync', question: 'Here — but not set up the way it should be', color: '#fbbf24', severityRank: 4 },
  unexpected:   { label: 'Stray',       question: 'Here — but shouldn’t be',               color: '#c084fc', severityRank: 3 },
  unregistered: { label: 'Untracked',   question: 'Here — but we’re not keeping track of it', color: '#22d3ee', severityRank: 2 },
  obsolete:     { label: 'Unused',      question: 'Kept — but nothing uses it anymore',    color: '#9ca3af', severityRank: 1 },
  changed:      { label: 'Recent',      question: 'Fine — but changed recently',           color: '#38bdf8', severityRank: 0.5 },
  healthy:      { label: 'OK',          question: 'Here, and as it should be',             color: '#34d399', severityRank: 0 },
};

/** States that represent a difference between reality and intent. */
export const ANOMALY_STATES: ReconState[] = [
  'missing',
  'at_risk',
  'drifted',
  'unexpected',
  'unregistered',
  'obsolete',
];

export interface ReconCounts {
  total: number;
  expected: number;
  observed: number;
  anomalies: number;
  byState: Record<ReconState, number>;
  worstSeverity: ReconSeverity | null;
}

export function countRecon(items: ReconItem[]): ReconCounts {
  const byState = Object.fromEntries(
    (Object.keys(RECON_STATES) as ReconState[]).map((s) => [s, 0])
  ) as Record<ReconState, number>;

  let expected = 0;
  let observed = 0;
  let worst: ReconSeverity | null = null;

  for (const item of items) {
    byState[item.state] += 1;
    if (item.expected) expected += 1;
    if (item.observed) observed += 1;
    if (item.state !== 'healthy' && item.state !== 'changed') {
      if (item.severity === 'critical') worst = 'critical';
      else if (item.severity === 'warning' && worst !== 'critical') worst = 'warning';
      else if (!worst) worst = 'info';
    }
  }

  const anomalies = ANOMALY_STATES.reduce((n, s) => n + byState[s], 0);
  return { total: items.length, expected, observed, anomalies, byState, worstSeverity: worst };
}

/** Items that deserve attention, ordered worst-first. */
export function attentionItems(items: ReconItem[]): ReconItem[] {
  return items
    .filter((i) => i.state !== 'healthy' && i.state !== 'changed')
    .sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 } as const;
      const d = sev[a.severity] - sev[b.severity];
      if (d !== 0) return d;
      return RECON_STATES[b.state].severityRank - RECON_STATES[a.state].severityRank;
    });
}

// ─── Mock data (Supabase-shaped, until the backend lands) ────────────────────

const SUPABASE_ITEMS: ReconItem[] = [
  { id: 'sb-1', name: 'public.entities', kind: 'table', state: 'healthy', expected: true, observed: true, detail: 'Canonical entity registry', severity: 'info' },
  { id: 'sb-2', name: 'public.jobs', kind: 'table', state: 'healthy', expected: true, observed: true, detail: 'Job records and run state', severity: 'info' },
  { id: 'sb-3', name: 'public.recon_items', kind: 'table', state: 'missing', expected: true, observed: false, detail: 'Planned reconciliation store', reason: 'Migration 0014_recon.sql is applied in intent but the table does not exist in the project.', severity: 'critical', lastChange: '2d ago' },
  { id: 'sb-4', name: 'public.audit_log', kind: 'table', state: 'drifted', expected: true, observed: true, detail: 'Immutable audit trail', reason: 'RLS policy drifted from intent.', severity: 'warning', lastChange: '6h ago',
    drift: [
      { field: 'rls.policy.select', expected: 'role = service_role only', actual: 'anon can read' },
      { field: 'retention.days', expected: '365', actual: '90' },
    ] },
  { id: 'sb-5', name: 'exports bucket', kind: 'storage bucket', state: 'healthy', expected: true, observed: true, detail: 'Bundle exports and archives', severity: 'info' },
  { id: 'sb-6', name: 'tmp-scratch bucket', kind: 'storage bucket', state: 'unexpected', expected: false, observed: true, detail: 'Unknown bucket holding 2.1 GB', reason: 'Not in any manifest. Created outside the provisioning flow 11 days ago.', severity: 'warning', lastChange: '11d ago' },
  { id: 'sb-7', name: 'edge fn: reconcile-nightly', kind: 'edge function', state: 'at_risk', expected: true, observed: true, detail: 'Nightly intent-vs-reality sweep', reason: 'Last 3 runs failed with timeout; no successful run in 72h.', severity: 'critical', lastChange: '14h ago' },
  { id: 'sb-8', name: 'edge fn: image-proxy', kind: 'edge function', state: 'unregistered', expected: false, observed: true, detail: 'Deployed function with no registry entry', reason: 'Live and serving traffic, but absent from the function registry.', severity: 'info', lastChange: '4d ago' },
  { id: 'sb-9', name: 'public.legacy_metrics', kind: 'table', state: 'obsolete', expected: true, observed: true, detail: 'Pre-v2 metrics rollups', reason: 'Zero reads or writes in 90 days; superseded by public.signals.', severity: 'info' },
  { id: 'sb-10', name: 'realtime: jobs channel', kind: 'publication', state: 'changed', expected: true, observed: true, detail: 'Realtime publication for job updates', severity: 'info', lastChange: '38m ago' },
  { id: 'sb-11', name: 'vault: lab512-deploy-key', kind: 'secret', state: 'at_risk', expected: true, observed: true, detail: 'Deploy credential for LAB 512', reason: 'Age 397 days — past the 180-day rotation policy.', severity: 'warning' },
];

const LAB512_ITEMS: ReconItem[] = [
  { id: 'l5-1', name: 'node: lab-512-a', kind: 'node', state: 'healthy', expected: true, observed: true, detail: 'Primary inference worker', severity: 'info' },
  { id: 'l5-2', name: 'node: lab-512-b', kind: 'node', state: 'missing', expected: true, observed: false, detail: 'Secondary inference worker', reason: 'Registered 3 weeks ago; never reported a heartbeat.', severity: 'critical', lastChange: '3w ago' },
  { id: 'l5-3', name: 'profile: balanced', kind: 'inference profile', state: 'healthy', expected: true, observed: true, detail: 'qwen3-14b · default serving profile', severity: 'info' },
  { id: 'l5-4', name: 'profile: deep', kind: 'inference profile', state: 'drifted', expected: true, observed: true, detail: 'Large-model profile for long runs', reason: 'Installed model differs from the pinned intent.', severity: 'warning', lastChange: '9h ago',
    drift: [{ field: 'model', expected: 'qwen3-32b@q4_K_M', actual: 'qwen3-32b@q3_K_S' }] },
  { id: 'l5-5', name: 'ollama: whisper-large', kind: 'model', state: 'unexpected', expected: false, observed: true, detail: '14 GB model on the scratch disk', reason: 'No profile references it; disk is at 91%.', severity: 'warning' },
  { id: 'l5-6', name: 'queue: inference', kind: 'queue', state: 'changed', expected: true, observed: true, detail: 'Job queue, depth fluctuating', severity: 'info', lastChange: '12m ago' },
  { id: 'l5-7', name: 'cert: lab512.local', kind: 'certificate', state: 'at_risk', expected: true, observed: true, detail: 'TLS for the local inference endpoint', reason: 'Expires in 6 days; renewal job is not scheduled.', severity: 'critical' },
];

const LABID_ITEMS: ReconItem[] = [
  { id: 'id-1', name: 'principal: operator', kind: 'principal', state: 'healthy', expected: true, observed: true, detail: 'Primary human operator', severity: 'info' },
  { id: 'id-2', name: 'credential: clerk-prod', kind: 'credential', state: 'at_risk', expected: true, observed: true, detail: 'Human auth provider key', reason: 'Rotated in Clerk 5 days ago; LAB ID still holds the previous key.', severity: 'critical', lastChange: '5d ago' },
  { id: 'id-3', name: 'entity: runner-07', kind: 'entity', state: 'unregistered', expected: false, observed: true, detail: 'Actor observed signing job runs', reason: 'Active in job history but has no entity record.', severity: 'warning' },
  { id: 'id-4', name: 'capability: drive.write', kind: 'capability', state: 'obsolete', expected: true, observed: true, detail: 'Legacy Drive write grant', reason: 'No principal references it since the v2 capability model.', severity: 'info' },
];

const GENERIC_ITEMS: ReconItem[] = [
  { id: 'g-1', name: 'registry entry', kind: 'registration', state: 'healthy', expected: true, observed: true, detail: 'Place is registered and reachable', severity: 'info' },
  { id: 'g-2', name: 'intent manifest', kind: 'manifest', state: 'changed', expected: true, observed: true, detail: 'Declared desired state for this place', severity: 'info', lastChange: '1d ago' },
  { id: 'g-3', name: 'observer link', kind: 'observer', state: 'missing', expected: true, observed: false, detail: 'Continuous observation channel', reason: 'No observation data received; actual state cannot be verified.', severity: 'warning', lastChange: '2d ago' },
];

const RECON_DATA: Record<string, { items: ReconItem[]; changes: ChangeEvent[]; intentSource: string; observedSource: string }> = {
  supabase: {
    intentSource: 'migrations + manifests',
    observedSource: 'live project inspection',
    items: SUPABASE_ITEMS,
    changes: [
      { id: 'c1', at: '38m ago', actor: 'operator', message: 'realtime publication re-enabled on jobs channel', state: 'changed' },
      { id: 'c2', at: '6h ago', actor: 'unknown', message: 'audit_log RLS policy changed outside migration flow', state: 'drifted' },
      { id: 'c3', at: '14h ago', actor: 'system', message: 'reconcile-nightly run failed: timeout after 30s', state: 'at_risk' },
      { id: 'c4', at: '11d ago', actor: 'unknown', message: 'bucket tmp-scratch appeared outside provisioning', state: 'unexpected' },
    ],
  },
  'lab-512': {
    intentSource: 'node registry + profiles',
    observedSource: 'node heartbeats + disk scan',
    items: LAB512_ITEMS,
    changes: [
      { id: 'c1', at: '12m ago', actor: 'system', message: 'inference queue depth rose to 14 jobs', state: 'changed' },
      { id: 'c2', at: '9h ago', actor: 'operator', message: 'deep profile model re-pulled at lower quantization', state: 'drifted' },
      { id: 'c3', at: '3w ago', actor: 'system', message: 'lab-512-b registered, awaiting first heartbeat', state: 'missing' },
    ],
  },
  'lab-id': {
    intentSource: 'principal registry',
    observedSource: 'auth provider + job history',
    items: LABID_ITEMS,
    changes: [
      { id: 'c1', at: '5d ago', actor: 'clerk', message: 'clerk-prod key rotated upstream', state: 'at_risk' },
      { id: 'c2', at: '1w ago', actor: 'system', message: 'runner-07 first seen signing job runs', state: 'unregistered' },
    ],
  },
  // DEMO: a place that fully matches intent — nothing exists that shouldn't,
  // nothing is missing — so the card stays clean with no "!".
  settings: {
    intentSource: 'policy manifest',
    observedSource: 'live policy inspection',
    items: [
      { id: 'set-1', name: 'policy: thresholds', kind: 'policy', state: 'healthy', expected: true, observed: true, detail: 'System-wide alert thresholds', severity: 'info' },
      { id: 'set-2', name: 'policy: feature flags', kind: 'policy', state: 'healthy', expected: true, observed: true, detail: 'Integration bindings and flags', severity: 'info' },
      { id: 'set-3', name: 'registry entry', kind: 'registration', state: 'healthy', expected: true, observed: true, detail: 'Place is registered and reachable', severity: 'info' },
    ],
    changes: [],
  },
};

const GENERIC_CHANGES: ChangeEvent[] = [
  { id: 'g1', at: '1d ago', actor: 'operator', message: 'intent manifest updated', state: 'changed' },
  { id: 'g2', at: '2d ago', actor: 'system', message: 'observer link stopped reporting', state: 'missing' },
];

/** Read the reconciliation view for a place. Mock-backed for now. */
export function getPlaceRecon(placeId: string): PlaceRecon {
  const entry = RECON_DATA[placeId];
  if (entry) {
    return { placeId, lastReconciled: '6m ago', ...entry };
  }
  return {
    placeId,
    intentSource: 'place manifest',
    observedSource: 'periodic observation',
    lastReconciled: '2d ago',
    items: GENERIC_ITEMS,
    changes: GENERIC_CHANGES,
  };
}

/** Anomaly count used by the landing grid delta badge. */
export function getPlaceAnomalyCount(placeId: string): number {
  return countRecon(getPlaceRecon(placeId).items).anomalies;
}
