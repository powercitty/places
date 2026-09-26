import type {
  AnyInspector,
  Attention,
  CreationSession,
  DetailSection,
  JobInspector,
  LogEntry,
  LogView,
  Panel,
  PlaceDetail,
  PlaceSummary,
  SessionDeskType,
  Signal,
  StatusLight,
  Timeline,
  TimelineEvent,
} from './types';
import type { PlaceCatalogItem } from './place-catalog';
import {
  buildAppsPlaceActions,
  buildAppsPlaceDetails,
  buildAppsPlacePanels,
  buildAppsPlaceRelations,
  buildAppsPlaceStatusLights,
  buildAppsPlaceSummarySignals,
  buildAppsPlaceAttention,
} from './apps-catalog';
import { ontologyRows } from './minilab-ontology';

export function buildSoonPlaceSummary(item: PlaceCatalogItem): PlaceSummary {
  if (item.id === 'apps') {
    return {
      id: item.id,
      title: item.title,
      shortLabel: item.shortLabel,
      descriptor: item.descriptor,
      shortSummary: 'Apps is the place where operator apps, tools, consoles, and launch surfaces are opened.',
      backgroundImage: item.backgroundImage,
      accentColor: item.accentColor,
      textColor: item.textColor,
      status: 'attention',
      statusLights: buildAppsPlaceStatusLights(),
      primarySignals: buildAppsPlaceSummarySignals(),
      attention: buildAppsPlaceAttention(),
    };
  }

  if (item.id === 'workflows') {
    return {
      id: item.id,
      title: item.title,
      shortLabel: item.shortLabel,
      descriptor: item.descriptor,
      shortSummary:
        'Orchestration surface for coordinated runs and approvals. App launch belongs in Apps, not here.',
      backgroundImage: item.backgroundImage,
      accentColor: item.accentColor,
      textColor: item.textColor,
      status: 'attention',
      statusLights: [
        { label: 'Connectivity', status: 'warn' },
        { label: 'Integrity', status: 'warn' },
        { label: 'Activity', status: 'off' },
      ],
      primarySignals: [
        { label: 'Workflow slice', value: 'closed' },
        { label: 'App launching', value: 'belongs in Apps' },
        { label: 'Current truth', value: 'placeholder' },
      ],
      attention: {
        title: 'Workflow place is not the launcher',
        body: 'Use Apps to open Coding Agents. Use Workflows to supervise orchestration once runs exist.',
      },
    };
  }

  // DEMO placeholder states so the front-page visual grammar (healthy /
  // problem / offline) is visible before the control-plane + Supabase land.
  // Real status will come from deriveStatus() against the live view.
  const demoStatus: PlaceSummary['status'] =
    item.id === 'settings' ? 'healthy'
    : item.id === 'google-drive' ? 'offline'
    : item.id === 'lab-256' ? 'unknown'
    : item.id === 'engine-park' ? 'stale'
    : 'attention';

  return {
    id: item.id,
    title: item.title,
    shortLabel: item.shortLabel,
    descriptor: item.descriptor,
    shortSummary: `${item.shortSummary} SOON: this surface still needs a real query contract.`,
    backgroundImage: item.backgroundImage,
    accentColor: item.accentColor,
    textColor: item.textColor,
    status: demoStatus,
    statusLights: buildSoonStatusLights(),
    primarySignals: buildSoonSignals(),
    attention: demoStatus === 'healthy' ? null : buildSoonAttention(),
  };
}

export function buildSoonPlaceDetail(item: PlaceCatalogItem): PlaceDetail {
  if (item.id === 'apps') {
    const summary = buildSoonPlaceSummary(item);

    return {
      ...summary,
      overview:
        'Apps is the execution-surface place of minilab.work. It holds the catalog of operator apps, tools, consoles, and launch surfaces you open to act. Coding Agents belongs here as an app, and a spawned coding run is a session of that app, not a workflow.',
      panels: [
        {
          title: 'Coding Agents Live View',
          items: [
            { label: 'Status', value: 'unavailable', status: 'warn' },
            {
              label: 'Reason',
              value: 'No live control-plane app view is reaching this render yet',
              status: 'warn',
            },
            {
              label: 'What still works',
              value: 'Apps catalog, launch grammar, and Coding Agents entry surface',
              status: 'ok',
            },
          ],
        },
        ...buildAppsPlacePanels(),
      ],
      actions: buildAppsPlaceActions(),
      deepDetails: [
        {
          title: 'Coding Agents Live Contract',
          rows: [
            { label: 'Expected source', value: '/query/apps/coding-agents' },
            { label: 'Current state', value: 'not reaching this frontend render' },
            { label: 'What is visible', value: 'Apps place, app catalog, Coding Agents launch entry, and agent surface' },
            { label: 'What is missing', value: 'latest phase, checkpoint, terminal surface, fallback surface, and recent runs' },
          ],
        },
        ...buildAppsPlaceDetails(),
        {
          title: 'Why Apps Exists',
          rows: [
            { label: 'Question', value: 'Are the operator tools ready, coherent, and launchable?' },
            { label: 'Human feeling', value: 'This is where I open what I use to act.' },
            { label: 'Boundary', value: 'Apps launches surfaces; Workflows coordinates sequences afterwards.' },
          ],
        },
      ],
      relations: buildAppsPlaceRelations(),
    };
  }

  if (item.id === 'workflows') {
    const summary = buildSoonPlaceSummary(item);

    return {
      ...summary,
      overview:
        'Workflows is the orchestration place. It tracks coordinated runs, approvals, retries, and handoffs between places. It is intentionally not the app catalog and not where Coding Agents should be launched from.',
      panels: [
        {
          title: 'Place Contract',
          items: [
            { label: 'Role', value: 'orchestration', status: 'warn', note: 'Coordinates sequences once work exists.' },
            { label: 'App launching', value: 'belongs in Apps', status: 'idle', note: 'Coding Agents should be opened from Apps.' },
            { label: 'Founding slice', value: 'closed', status: 'warn', note: 'Workflow read/write is not open yet.' },
          ],
        },
        {
          title: 'Canonical Grammar',
          items: ontologyRows(['workflow', 'app', 'session', 'run']).map((row) => ({
            label: row.label,
            value: row.value,
            status: row.label === 'Workflow' ? 'warn' : 'idle',
            note: row.note,
          })),
        },
        {
          title: 'What Will Live Here',
          items: [
            { label: 'Active runs', value: 'future', status: 'idle' },
            { label: 'Failed steps', value: 'future', status: 'idle' },
            { label: 'Approval queue', value: 'future', status: 'idle' },
          ],
        },
      ],
      actions: [
        {
          id: 'apps',
          label: 'Open Apps place',
          description: 'Go to Apps when you want to launch Coding Agents or another execution surface.',
          variant: 'primary',
          href: '/places/apps',
        },
        {
          id: 'workflow-slice-closed',
          label: 'Workflow slice closed',
          description: 'The workflow domain exists architecturally, but its real surface is intentionally not opened yet.',
          variant: 'ghost',
          disabled: true,
        },
        {
          id: 'agent',
          label: 'Open workflows agent',
          description: 'Use the agent to discuss orchestration intent even while the canonical workflow surface is closed.',
          variant: 'secondary',
          href: '/places/workflows/agent?q=Explain the current workflow role, what is closed, and how it differs from Apps.',
        },
      ],
      deepDetails: [
        {
          title: 'Why This Place Exists',
          rows: [
            { label: 'Purpose', value: 'Turn intention into coordinated sequence' },
            { label: 'Not for', value: 'launching Coding Agents or opening app sessions' },
            { label: 'Launcher lives in', value: 'Apps' },
          ],
        },
        {
          title: 'Current State',
          rows: [
            { label: 'Slice status', value: 'founding slice intentionally closed' },
            { label: 'Placeholder policy', value: 'explicit placeholder, fake truth forbidden' },
          ],
        },
      ],
      relations: [
        { place: 'APPS', placeId: 'apps', nature: 'launches execution surfaces before orchestration begins' },
        { place: 'LAB 512', placeId: 'lab-512', nature: 'executes work once a run is admitted' },
      ],
    };
  }

  const summary = buildSoonPlaceSummary(item);

  return {
    ...summary,
    overview: `SOON: ${item.title} still needs a real backend read model. The UI is intentionally showing a placeholder instead of fake operational data.`,
    panels: [
      {
        title: 'Read Model Status',
        items: [
          { label: 'Surface', value: item.title, status: 'idle' },
          { label: 'Backend query', value: 'SOON', status: 'warn' },
          {
            label: 'Operational truth',
            value: 'not connected',
            status: 'warn',
          },
        ],
      },
    ],
    // DEMO placeholder actions so Area 1 shows a real horizontal rail before
    // the backend lands. Real actions will come from the live read model.
    actions: [
      { id: 'reconcile', label: 'Re-check now', description: 'Check this place again — compare what’s here against what should be.', variant: 'primary' },
      { id: 'intent', label: 'What should be here', description: 'The things this place is supposed to have.' },
      { id: 'reality', label: 'What’s actually here', description: 'What we can see right now.' },
      { id: 'drift', label: 'Fix what changed', description: 'Put things that drifted back the way they should be.' },
      { id: 'cleanup', label: 'Clean up', description: 'Remove things that are here but shouldn’t be.' },
      { id: 'register', label: 'Start tracking', description: 'Add things we found but aren’t keeping track of yet.' },
      { id: 'keys', label: 'Refresh keys', description: 'Renew credentials and secrets for this place.' },
      { id: 'logs', label: 'Recent activity', description: 'See what’s happened here lately.' },
      { id: 'agent', label: 'Ask the agent', description: 'Talk it through even while the data is still coming online.', variant: 'secondary', href: `/places/${item.id}/agent` },
    ],
    deepDetails: [
      {
        title: 'SOON',
        rows: [
          { label: 'Reason', value: 'No canonical query endpoint yet' },
          { label: 'Policy', value: 'Placeholder allowed, fake truth forbidden' },
        ],
      },
    ],
    relations: [],
  };
}

export function buildSoonInspector(type: string, id: string): AnyInspector | null {
  const now = new Date().toISOString();

  if (type === 'job') {
    return {
      id,
      type: 'job',
      canonicalName: `JOB ${id}`,
      descriptor: 'SOON placeholder inspector',
      status: 'attention',
      createdAt: now,
      updatedAt: now,
      workflowId: undefined,
      workerNode: 'SOON',
      inputSummary: 'SOON: live job inspector not wired for this object yet.',
      outputSummary: 'SOON',
      errorMessage: 'SOON: this inspector still needs a canonical backend route.',
    };
  }

  if (type === 'project') {
    return {
      id,
      type: 'project',
      canonicalName: `PROJECT ${id}`,
      descriptor: 'SOON placeholder inspector',
      status: 'attention',
      createdAt: now,
      updatedAt: now,
      officialStatus: 'draft',
      dataSource: 'SOON',
      schemaVersion: '0',
      migrations: { applied: 0, pending: 0, lastApplied: now },
    };
  }

  if (type === 'workflow') {
    return {
      id,
      type: 'workflow',
      canonicalName: `WORKFLOW ${id}`,
      descriptor: 'Founding slice closed',
      status: 'attention',
      createdAt: now,
      updatedAt: now,
      triggerType: 'manual',
      steps: 0,
      publishState: 'draft',
      inputSource: 'Founding slice closed',
      outputTarget: 'Founding slice closed',
      lastRunStatus: 'attention',
    };
  }

  if (type === 'entity') {
    return {
      id,
      type: 'entity',
      canonicalName: `ENTITY ${id}`,
      descriptor: 'SOON placeholder inspector',
      status: 'attention',
      createdAt: now,
      updatedAt: now,
      role: 'SOON',
      capabilities: ['SOON'],
      credentials: [{ label: 'SOON', validity: 'pending', status: 'warn' }],
      trustLinks: [{ target: 'SOON', mechanism: 'pending' }],
    };
  }

  if (type === 'terminal_session') {
    return {
      id,
      type: 'terminal_session',
      canonicalName: `TERMINAL ${id}`,
      descriptor: 'SOON placeholder inspector',
      status: 'attention',
      createdAt: now,
      updatedAt: now,
      terminalKind: 'spawned_run_terminal',
      terminalStatus: 'pending',
      connectable: false,
      transcriptPreview: [{ stream: 'stdout', text: 'SOON: terminal session inspector not wired yet.' }],
    };
  }

  return null;
}

export function buildLiveJobInspector(
  id: string,
  job?: Record<string, unknown>,
  latestRun?: Record<string, unknown>
): JobInspector {
  const status = mapJobStatus(String(job?.status ?? latestRun?.status ?? 'queued'));

  return {
    id,
    type: 'job',
    canonicalName: String(job?.kind ?? `JOB ${id.slice(0, 8)}`),
    descriptor: 'Live control-plane inspector',
    status,
    createdAt: String(job?.created_at ?? new Date().toISOString()),
    updatedAt: String(job?.updated_at ?? new Date().toISOString()),
    ownedBy: typeof job?.requested_by_entity_id === 'string' ? String(job.requested_by_entity_id) : undefined,
    linkedPlace: 'lab-512',
    workflowId: typeof job?.related_workflow_id === 'string' ? String(job.related_workflow_id) : undefined,
    workerNode: typeof latestRun?.node_id === 'string' ? String(latestRun.node_id) : undefined,
    startedAt: typeof latestRun?.started_at === 'string' ? String(latestRun.started_at) : undefined,
    completedAt: typeof latestRun?.finished_at === 'string' ? String(latestRun.finished_at) : undefined,
    exitCode: status === 'healthy' ? 0 : undefined,
    errorMessage:
      status === 'warning' || status === 'degraded'
        ? 'SOON: richer job failure mapping not implemented yet.'
        : undefined,
    inputSummary: 'Live job payload loaded from control plane.',
    outputSummary:
      typeof latestRun?.summary === 'string'
        ? String(latestRun.summary)
        : 'SOON: richer output summaries pending.',
  };
}

export function buildSoonTimeline(type: string, id: string): Timeline {
  return {
    objectId: id,
    objectType: normalizeTimelineObjectType(type),
    objectLabel: `${type.toUpperCase()} ${id}`,
    events: [
      {
        id: `${id}-soon`,
        timestamp: new Date().toISOString(),
        actor: 'control-plane',
        actorType: 'system',
        message: 'SOON: timeline backend not wired for this surface yet.',
        severity: 'warning',
        linkedObjectId: id,
        linkedObjectType: normalizeTimelineObjectType(type),
        linkedObjectLabel: `${type.toUpperCase()} ${id}`,
      },
    ],
  };
}

export function buildSoonLogView(sourceType: string, sourceId: string): LogView {
  const entry: LogEntry = {
    id: `${sourceType}-${sourceId}-soon`,
    timestamp: new Date().toISOString(),
    level: 'warn',
    source: 'minilab.work',
    message: 'SOON: log streaming is not wired for this surface yet.',
    traceId: 'SOON',
  };

  return {
    sourceId,
    sourceType: sourceType === 'node' ? 'node' : 'job',
    sourceLabel: `${sourceType.toUpperCase()} ${sourceId}`,
    entries: [entry],
    hasMore: false,
  };
}

export function buildSoonSession(
  id: string,
  deskType: SessionDeskType = inferDeskTypeFromSessionId(id)
): CreationSession {
  const now = new Date().toISOString();

  return {
    id,
    deskType,
    title: `${deskLabel(deskType)} session`,
    description: 'SOON: governed creation sessions are not wired to the control plane yet.',
    phase: 'intent',
    status: 'waiting',
    intent: 'SOON: this desk still needs a canonical creation-session backend.',
    fields: [
      {
        id: 'soon',
        label: 'SOON',
        type: 'text',
        required: false,
        value: 'Creation bureaucracy pending',
        description: 'This is an explicit placeholder until the real creation session API exists.',
      },
    ],
    warnings: [
      {
        id: 'soon-warning',
        severity: 'critical',
        title: 'SOON',
        body: 'This session is a placeholder. No canonical object will be created from this UI yet.',
        canProceed: false,
      },
    ],
    proposal: null,
    result: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildSoonStatusLights(): StatusLight[] {
  return [
    { label: 'Connectivity', status: 'warn' },
    { label: 'Integrity', status: 'warn' },
    { label: 'Activity', status: 'off' },
  ];
}

export function buildSoonSignals(): Signal[] {
  return [
    { label: 'Runtime data', value: 'SOON' },
    { label: 'Control plane', value: 'not wired' },
    { label: 'Status', value: 'placeholder' },
  ];
}

export function buildSoonAttention(): Attention {
  return {
    title: 'SOON',
    body: 'This surface is intentionally placeholder-only until its real backend contract exists.',
  };
}

export function mapJobStatus(status: string): JobInspector['status'] {
  const normalized = status.toLowerCase();
  if (normalized === 'done') return 'healthy';
  if (normalized === 'running') return 'syncing';
  if (normalized === 'queued') return 'warning';
  if (normalized === 'failed' || normalized === 'error') return 'degraded';
  return 'attention';
}

export function normalizeTimelineObjectType(type: string): Timeline['objectType'] {
  if (type === 'entity') return 'entity';
  if (type === 'project') return 'project';
  return 'job';
}

export function severityFromEvent(kind: string): TimelineEvent['severity'] {
  const normalized = kind.toLowerCase();
  if (normalized.includes('fail') || normalized.includes('error')) return 'error';
  if (normalized.includes('warn') || normalized.includes('block')) return 'warning';
  if (normalized.includes('done') || normalized.includes('complete') || normalized.includes('publish')) return 'success';
  return 'info';
}

export function inferDeskTypeFromSessionId(id: string): SessionDeskType {
  if (id.includes('lab-id')) return 'lab-id';
  if (id.includes('supabase')) return 'supabase';
  if (id.includes('workflows')) return 'workflows';
  return 'lab-512';
}

export function deskLabel(deskType: SessionDeskType): string {
  if (deskType === 'lab-id') return 'LAB ID';
  if (deskType === 'supabase') return 'SUPABASE';
  if (deskType === 'workflows') return 'WORK FLOWS';
  return 'LAB 512';
}
