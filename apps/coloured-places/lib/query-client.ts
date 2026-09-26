/**
 * Query Client — frontend seam for read-model operations.
 *
 * Live control-plane reads are used where the backend already has an honest contract.
 * Everything else returns explicit SOON placeholders instead of fake operational data.
 */

import type {
  AnyInspector,
  CreationSession,
  LogEntry,
  LogView,
  PlaceDetail,
  PlaceSummary,
  Timeline,
} from './types';
import { getPlaceCatalogItem, PLACE_CATALOG, type PlaceCatalogItem } from './place-catalog';
import { normalizeTerminalSessionInspector } from './terminal-session-inspector';
import {
  buildAppsPlaceActions,
  buildAppsPlaceDetails,
  buildAppsPlacePanels,
  buildAppsPlaceRelations,
} from './apps-catalog';
import {
  buildLiveJobInspector,
  buildSoonInspector,
  buildSoonLogView,
  buildSoonPlaceDetail,
  buildSoonPlaceSummary,
  buildSoonSession,
  buildSoonTimeline,
  normalizeTimelineObjectType,
  severityFromEvent,
} from './soon';

type LivePlaceView = {
  place: string;
  title: string;
  summary: string;
  data: Record<string, unknown>;
};

type LiveAppView = {
  app: string;
  title: string;
  summary: string;
  data: Record<string, unknown>;
};

type LiveInspectorView = {
  kind: string;
  id: string;
  body: Record<string, unknown>;
};

type LiveTimelineEntry = {
  at: string;
  kind: string;
  summary: string;
};

type LiveRecentJob = {
  id: string;
  kind: string;
  status: string;
  target_node_id?: string | null;
  created_at: string;
  updated_at: string;
};

const LIVE_PLACE_IDS = new Set(['apps', 'lab-id', 'lab-256', 'lab-8gb', 'lab-512', 'supabase']);
const LIVE_INSPECTOR_KINDS = new Set(['entity', 'job', 'creation_session', 'terminal_session']);

class QueryClient {
  async listPlaces(): Promise<PlaceSummary[]> {
    const livePlaces = await fetchLivePlaces();

    return PLACE_CATALOG.map((item) => {
      const live = livePlaces.get(item.id);
      return live ? mergeLivePlaceSummary(item, live) : buildSoonPlaceSummary(item);
    });
  }

  async getPlace(placeId: string): Promise<PlaceDetail | null> {
    const item = getPlaceCatalogItem(placeId);
    if (!item) return null;

    if (placeId === 'apps') {
      const [live, appView] = await Promise.all([
        fetchLivePlace(placeId),
        fetchLiveApp('coding-agents'),
      ]);
      return live ? mergeLivePlaceDetail(item, live, appView) : buildSoonPlaceDetail(item);
    }

    const live = await fetchLivePlace(placeId);
    return live ? mergeLivePlaceDetail(item, live, null) : buildSoonPlaceDetail(item);
  }

  async getInspector(type: string, id: string): Promise<AnyInspector | null> {
    const normalized = type.trim().toLowerCase();
    const live = await fetchLiveInspector(normalized, id);

    if (live && normalized === 'entity') {
      const entity = live.body.entity as Record<string, unknown> | undefined;
      const relations = Array.isArray(live.body.relations) ? live.body.relations : [];
      return buildLiveEntityInspector(id, entity, relations as Record<string, unknown>[]);
    }

    if (live && normalized === 'job') {
      const job = live.body.job as Record<string, unknown> | undefined;
      const latestRun = live.body.latest_run as Record<string, unknown> | undefined;
      return buildLiveJobInspector(id, job, latestRun);
    }

    if (live && normalized === 'terminal_session') {
      const terminal = live.body.terminal_session as Record<string, unknown> | undefined;
      return normalizeTerminalSessionInspector(id, terminal);
    }

    if (normalized === 'job' && looksLikeUuid(id)) {
      return null;
    }

    return buildSoonInspector(normalized, id);
  }

  async listInspectors(type: string): Promise<AnyInspector[]> {
    const normalized = type.trim().toLowerCase();
    const soon = buildSoonInspector(normalized, `${normalized}-soon`);
    return soon ? [soon] : [];
  }

  async getTimeline(objectType: string, objectId: string): Promise<Timeline | null> {
    const normalized = objectType.trim().toLowerCase();
    const liveEntries = await fetchLiveTimeline(normalized, objectId);

    if (liveEntries) {
      return {
        objectId,
        objectType: normalizeTimelineObjectType(normalized),
        objectLabel: `${normalized.toUpperCase()} ${objectId}`,
        events: liveEntries.map((entry, index) => ({
          id: `${objectId}-${index}`,
          timestamp: entry.at,
          actor: 'control-plane',
          actorType: 'system',
          message: entry.summary,
          severity: severityFromEvent(entry.kind),
          linkedObjectId: objectId,
          linkedObjectType: normalizeTimelineObjectType(normalized),
          linkedObjectLabel: `${normalized.toUpperCase()} ${objectId}`,
          metadata: { event_kind: entry.kind },
        })),
      };
    }

    if ((normalized === 'job' || normalized === 'project') && looksLikeUuid(objectId)) {
      return null;
    }

    return buildSoonTimeline(normalized, objectId);
  }

  async getLogView(sourceType: string, sourceId: string): Promise<LogView | null> {
    if (sourceType.trim().toLowerCase() === 'job') {
      const live = await fetchLiveInspector('job', sourceId);
      if (live) {
        return buildLiveJobLogView(sourceId, live.body);
      }
      if (looksLikeUuid(sourceId)) {
        return null;
      }
    }

    return buildSoonLogView(sourceType, sourceId);
  }

  async getSession(id: string): Promise<CreationSession | null> {
    const live = await fetchLiveInspector('creation_session', id);
    if (live) {
      return buildLiveCreationSession(live.body.session as Record<string, unknown> | undefined, id);
    }

    if (looksLikeUuid(id)) {
      return null;
    }

    return buildSoonSession(id);
  }

  async listSessions(): Promise<CreationSession[]> {
    return ['lab-id', 'supabase', 'workflows', 'lab-512'].map((deskType) =>
      buildSoonSession(`session-${deskType}-soon`)
    );
  }
}

async function fetchLivePlaces(): Promise<Map<string, LivePlaceView>> {
  const liveEntries = await Promise.all(
    Array.from(LIVE_PLACE_IDS).map(async (placeId) => {
      const live = await fetchLivePlace(placeId);
      return live ? ([placeId, live] as const) : null;
    })
  );

  return new Map(
    liveEntries.filter((entry): entry is readonly [string, LivePlaceView] => Boolean(entry))
  );
}

async function fetchLivePlace(placeId: string): Promise<LivePlaceView | null> {
  if (!LIVE_PLACE_IDS.has(placeId)) {
    return null;
  }

  try {
    const response = await fetch(`${controlPlaneBaseUrl()}/query/places/${placeId}`, {
      headers: {
        Authorization: `Bearer ${controlPlaneToken()}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    return (await response.json()) as LivePlaceView;
  } catch {
    return null;
  }
}

async function fetchLiveApp(appId: string): Promise<LiveAppView | null> {
  try {
    const response = await fetch(`${controlPlaneBaseUrl()}/query/apps/${appId}`, {
      headers: {
        Authorization: `Bearer ${controlPlaneToken()}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    return (await response.json()) as LiveAppView;
  } catch {
    return null;
  }
}

async function fetchLiveInspector(type: string, id: string): Promise<LiveInspectorView | null> {
  const routeKind = normalizeInspectorKind(type);
  if (!LIVE_INSPECTOR_KINDS.has(routeKind) || !looksLikeUuid(id)) {
    return null;
  }

  try {
    const response = await fetch(`${controlPlaneBaseUrl()}/query/inspectors/${routeKind}/${id}`, {
      headers: {
        Authorization: `Bearer ${controlPlaneToken()}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    return (await response.json()) as LiveInspectorView;
  } catch {
    return null;
  }
}

async function fetchLiveTimeline(type: string, id: string): Promise<LiveTimelineEntry[] | null> {
  if (!(type === 'job' || type === 'project' || type === 'entity') || !looksLikeUuid(id)) {
    return null;
  }

  const liveKind = type === 'project' ? 'job' : type;

  try {
    const response = await fetch(`${controlPlaneBaseUrl()}/query/timelines/${liveKind}/${id}`, {
      headers: {
        Authorization: `Bearer ${controlPlaneToken()}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    return (await response.json()) as LiveTimelineEntry[];
  } catch {
    return null;
  }
}

function mergeLivePlaceSummary(item: PlaceCatalogItem, live: LivePlaceView): PlaceSummary {
  if (item.id === 'apps') {
    return {
      id: item.id,
      title: item.title,
      shortLabel: item.shortLabel,
      descriptor: item.descriptor,
      shortSummary: live.summary,
      backgroundImage: item.backgroundImage,
      accentColor: item.accentColor,
      textColor: item.textColor,
      status: deriveStatus(item.id, live),
      statusLights: deriveStatusLights(live),
      primarySignals: deriveSignals(item.id, live),
      attention: deriveAttention(item.id, live),
    };
  }

  return {
    id: item.id,
    title: live.title,
    shortLabel: live.title,
    descriptor: item.descriptor,
    shortSummary: live.summary,
    backgroundImage: item.backgroundImage,
    accentColor: item.accentColor,
    textColor: item.textColor,
    status: deriveStatus(item.id, live),
    statusLights: deriveStatusLights(live),
    primarySignals: deriveSignals(item.id, live),
    attention: deriveAttention(item.id, live),
  };
}

function mergeLivePlaceDetail(
  item: PlaceCatalogItem,
  live: LivePlaceView,
  appView: LiveAppView | null
): PlaceDetail {
  if (item.id === 'apps') {
    const summary = mergeLivePlaceSummary(item, live);
    const recentJobs = readRecentJobs(live);
    const codingAgentsPanels = appView
      ? [codingAgentsLivePanel(appView), codingAgentsRecentRunsPanel(appView)].filter(
          (panel): panel is PlaceDetail['panels'][number] => Boolean(panel)
        )
      : [codingAgentsUnavailablePanel()];
    const codingAgentsDetails = appView
      ? [codingAgentsLiveDetails(appView), codingAgentsHealthDetails(appView), codingAgentsContextHelperDetails(appView), codingAgentsTruthPostureDetails(appView)].filter(
          (detail): detail is PlaceDetail['deepDetails'][number] => Boolean(detail)
        )
      : [codingAgentsUnavailableDetails()];
    const codingAgentsActions = appView ? buildCodingAgentsActions(appView) : [];

    return {
      ...summary,
      overview: live.summary,
      panels: [
        appsLiveSnapshotPanel(live),
        ...codingAgentsPanels,
        ...buildAppsPlacePanels(),
        ...(recentJobs.length > 0 ? [recentJobsPanel(recentJobs)] : []),
      ],
      actions: [...codingAgentsActions, ...buildAppsPlaceActions(), ...recentJobActions(recentJobs)],
      deepDetails: [
        appsLiveDetails(live),
        ...codingAgentsDetails,
        ...buildAppsPlaceDetails(),
      ],
      relations: buildAppsPlaceRelations(),
    };
  }

  const summary = mergeLivePlaceSummary(item, live);
  const recentJobs = readRecentJobs(live);
  const runtimePanel = readRuntimePanel(item.id, live);
  const runtimeDetails = readRuntimeDetails(item.id, live);
  const defaultAgentAction = {
    id: 'agent',
    label: 'Open agent shell',
    variant: 'primary' as const,
    href: `/places/${item.id}/agent`,
  };
  const labIdActions =
    item.id === 'lab-id'
      ? [
          {
            id: 'lab-id-intake',
            label: 'Start identity intake',
            variant: 'primary' as const,
            href: '/places/lab-id/agent?q=Help me register a new principal, entity, or credential in LAB ID.',
          },
          {
            id: 'lab-id-photo',
            label: 'Register from photo or document',
            variant: 'secondary' as const,
            href: '/places/lab-id/agent?q=Read the attached photo, scan, PDF, or screenshot and prepare a LAB ID registration intake.',
          },
          {
            id: 'lab-id-creation',
            label: 'Open identity creation desk',
            variant: 'secondary' as const,
            href: '/creation-sessions/new?desk=lab-id',
          },
        ]
      : [defaultAgentAction];

  return {
    ...summary,
    overview: live.summary,
    panels: [
      snapshotPanel(live),
      ...(runtimePanel ? [runtimePanel] : []),
      ...(recentJobs.length > 0 ? [recentJobsPanel(recentJobs)] : []),
    ],
    actions: [...labIdActions, ...recentJobActions(recentJobs)],
    deepDetails: [snapshotDetails(live), ...(runtimeDetails ? [runtimeDetails] : [])],
    relations: [],
  };
}

function deriveStatus(placeId: string, live: LivePlaceView): PlaceSummary['status'] {
  const pending = readNumber(live, 'pending_commands');
  const queued = readNumber(live, 'queued_jobs');
  const online = readNumber(live, 'online_nodes');
  const identityTablesPresent = readBoolean(readObject(live.data, 'operator_binding'), 'token_present');

  if (placeId === 'lab-id') {
    const rootExists = readBoolean(live.data as Record<string, unknown>, 'lab_auth_reference_root_exists');
    const tablesPresent = readBoolean(live.data as Record<string, unknown>, 'identity_tables_present');
    if (rootExists === false) return 'offline';
    if (tablesPresent === false || identityTablesPresent === false) return 'warning';
    return 'healthy';
  }

  if (placeId === 'apps') {
    const catalogCount = readNumber(live, 'catalog_count');
    const running = readNumber(live, 'running_jobs');
    const partialApps = readNumber(live, 'partial_apps');
    if (catalogCount === 0) return 'offline';
    if (partialApps > 0) return 'warning';
    if (running > 0) return 'syncing';
    return 'healthy';
  }

  if (online === 0) return 'offline';
  if (placeId === 'lab-8gb' && pending > 0) return 'warning';
  if (placeId === 'lab-512' && queued > 0) return 'syncing';
  return 'healthy';
}

function deriveStatusLights(live: LivePlaceView): PlaceSummary['statusLights'] {
  const placeKind = readString(live.data, 'place_kind');
  if (placeKind === 'apps') {
    const partialApps = readNumber(live, 'partial_apps');
    const running = readNumber(live, 'running_jobs');
    return [
      { label: 'Connectivity', status: 'on' },
      { label: 'Integrity', status: partialApps > 0 ? 'warn' : 'on' },
      { label: 'Activity', status: running > 0 ? 'warn' : 'on' },
    ];
  }

  const pending = readNumber(live, 'pending_commands');
  const running = readNumber(live, 'running_jobs');

  return [
    { label: 'Connectivity', status: 'on' },
    { label: 'Integrity', status: 'on' },
    { label: 'Activity', status: pending > 0 || running > 0 ? 'warn' : 'on' },
  ];
}

function deriveSignals(placeId: string, live: LivePlaceView): PlaceSummary['primarySignals'] {
  const queued = readNumber(live, 'queued_jobs');
  const running = readNumber(live, 'running_jobs');
  const completed = readNumber(live, 'completed_jobs');
  const pending = readNumber(live, 'pending_commands');
  const online = readNumber(live, 'online_nodes');

  if (placeId === 'lab-256') {
    return [
      { label: 'Nodes online', value: `${online}` },
      { label: 'Queued jobs', value: `${queued}` },
      { label: 'Pending commands', value: `${pending}` },
    ];
  }

  if (placeId === 'lab-8gb') {
    return [
      { label: 'Running jobs', value: `${running}` },
      { label: 'Pending commands', value: `${pending}` },
      { label: 'Completed jobs', value: `${completed}` },
    ];
  }

  if (placeId === 'lab-512') {
    return [
      { label: 'Queue depth', value: `${queued} jobs` },
      { label: 'Running jobs', value: `${running}` },
      { label: 'Completed jobs', value: `${completed}` },
    ];
  }

  if (placeId === 'lab-id') {
    return [
      {
        label: 'Identity tables',
        value: readBoolean(live.data as Record<string, unknown>, 'identity_tables_present') ? 'present' : 'bootstrap-only',
      },
      {
        label: 'Job actors',
        value: `${readNumber(live, 'job_actor_entities')}`,
      },
      {
        label: 'Runtime actors',
        value: `${readNumber(live, 'runtime_actor_entities')}`,
      },
    ];
  }

  if (placeId === 'apps') {
    return [
      { label: 'Catalogued apps', value: `${readNumber(live, 'catalog_count')}` },
      { label: 'Agent sessions', value: `${readNumber(live, 'agent_sessions')}` },
      { label: 'Live terminals', value: `${readNumber(live, 'connectable_terminals')}` },
    ];
  }

  return [
    { label: 'Nodes online', value: `${online}` },
    { label: 'Pending commands', value: `${pending}` },
    { label: 'Snapshot', value: 'live' },
  ];
}

function deriveAttention(placeId: string, live: LivePlaceView) {
  const pending = readNumber(live, 'pending_commands');
  const queued = readNumber(live, 'queued_jobs');

  if (placeId === 'lab-8gb' && pending > 0) {
    return {
      title: 'Pending edge commands',
      body: `${pending} commands are still waiting at the edge surface.`,
    };
  }

  if (placeId === 'lab-512' && queued > 0) {
    return {
      title: 'Queued compute work',
      body: `${queued} jobs are queued for LAB 512.`,
    };
  }

  if (placeId === 'lab-id') {
    const rootExists = readBoolean(live.data as Record<string, unknown>, 'lab_auth_reference_root_exists');
    const tablesPresent = readBoolean(live.data as Record<string, unknown>, 'identity_tables_present');
    if (rootExists === false) {
      return {
        title: 'LAB AUTH missing',
        body: 'The LAB AUTH reference root is missing, so LAB ID cannot anchor identity bootstrap correctly.',
      };
    }
    if (tablesPresent === false) {
      return {
        title: 'Identity still bootstrap-only',
        body: 'LAB ID exists as bootstrap/auth context, but canonical identity tables are not materialized yet.',
      };
    }
  }

  if (placeId === 'apps') {
    const partialApps = readNumber(live, 'partial_apps');
    if (partialApps > 0) {
      return {
        title: 'Apps still partial',
        body: `${partialApps} launch surfaces are still partial, even though the Apps contract is now canonical.`,
      };
    }
  }

  return null;
}

function appsLiveSnapshotPanel(live: LivePlaceView): PlaceDetail['panels'][number] {
  return {
    title: 'Apps Snapshot',
    items: [
      { label: 'Catalogued apps', value: `${readNumber(live, 'catalog_count')}`, status: 'ok' },
      { label: 'Ready apps', value: `${readNumber(live, 'ready_apps')}`, status: 'ok' },
      {
        label: 'Partial apps',
        value: `${readNumber(live, 'partial_apps')}`,
        status: readNumber(live, 'partial_apps') > 0 ? 'warn' : 'ok',
      },
      { label: 'Agent sessions', value: `${readNumber(live, 'agent_sessions')}`, status: 'ok' },
      { label: 'Agent runs', value: `${readNumber(live, 'agent_runs')}`, status: 'ok' },
      {
        label: 'Live terminals',
        value: `${readNumber(live, 'connectable_terminals')}`,
        status: readNumber(live, 'connectable_terminals') > 0 ? 'ok' : 'idle',
      },
    ],
  };
}

function appsLiveDetails(live: LivePlaceView): PlaceDetail['deepDetails'][number] {
  const launchContract = readObject(live.data, 'launch_contract');
  return {
    title: 'Canonical Apps State',
    rows: [
      { label: 'Ecosystem', value: readString(live.data, 'ecosystem') ?? 'minilab.work' },
      { label: 'Place kind', value: readString(live.data, 'place_kind') ?? 'apps' },
      { label: 'Catalog size', value: `${readNumber(live, 'catalog_count')}` },
      { label: 'Agent sessions', value: `${readNumber(live, 'agent_sessions')}` },
      { label: 'Agent runs', value: `${readNumber(live, 'agent_runs')}` },
      { label: 'Live terminals', value: `${readNumber(live, 'connectable_terminals')}` },
      {
        label: 'Launcher truth',
        value: readBoolean(launchContract, 'apps_is_launcher') ? 'apps' : 'unknown',
      },
      {
        label: 'Workflow launcher',
        value: readBoolean(launchContract, 'workflow_is_launcher') ? 'yes' : 'no',
      },
    ],
  };
}

function codingAgentsLivePanel(appView: LiveAppView): PlaceDetail['panels'][number] {
  const latestRun = readRecordArray(appView.data, 'recent_runs')[0] ?? {};
  const latestPhase = readString(appView.data, 'latest_phase') ?? 'not_started';
  const latestCheckpoint = readNullableObject(appView.data, 'latest_checkpoint');
  const latestTerminalSurface = readNullableObject(appView.data, 'latest_terminal_surface');
  const effectivePolicy = readNullableObject(latestRun, 'effective_policy_json');
  const inference = readNullableObject(effectivePolicy ?? {}, 'inference');
  const terminalSurface = readObject(appView.data, 'terminal_surface');

  return {
    title: 'Coding Agents',
    items: [
      { label: 'Summary', value: appView.summary, status: 'ok' },
      { label: 'Latest phase', value: startCase(latestPhase), status: phaseStatus(latestPhase) },
      {
        label: 'Checkpoint',
        value: readString(latestCheckpoint ?? {}, 'summary') ?? 'Awaiting next checkpoint',
        status: phaseStatus(latestPhase),
      },
      {
        label: 'Profile',
        value: startCase(readString(inference ?? {}, 'profile_id') ?? 'balanced'),
        status: 'ok',
      },
      {
        label: 'Terminal',
        value: startCase(readString(latestTerminalSurface ?? {}, 'attachment_state') ?? 'not_attached'),
        status: terminalAttachmentStatus(readString(latestTerminalSurface ?? {}, 'attachment_state')),
        note: `${readNumber(terminalSurface, 'connectable_terminal_count')} connectable`,
      },
    ],
  };
}

function codingAgentsRecentRunsPanel(appView: LiveAppView): PlaceDetail['panels'][number] | null {
  const recentRuns = readRecordArray(appView.data, 'recent_runs');
  if (recentRuns.length === 0) return null;

  return {
    title: 'Coding Runs',
    items: recentRuns.slice(0, 4).map((run) => {
      const runId = readString(run, 'id') ?? 'unknown';
      const phase = readString(run, 'phase') ?? 'unknown';
      const terminalSurface = readNullableObject(run, 'terminal_surface');
      const checkpoint = readNullableObject(run, 'checkpoint_json');

      return {
        label: shortUuid(runId),
        value: startCase(phase),
        note:
          readString(checkpoint ?? {}, 'summary') ??
          startCase(readString(terminalSurface ?? {}, 'attachment_state') ?? 'not_attached'),
        status: phaseStatus(phase),
      };
    }),
  };
}

function codingAgentsUnavailablePanel(): PlaceDetail['panels'][number] {
  return {
    title: 'Coding Agents Live View',
    items: [
      { label: 'Status', value: 'unavailable', status: 'warn' },
      {
        label: 'Reason',
        value: 'No app-scoped query response is reaching the frontend right now',
        status: 'warn',
      },
      {
        label: 'What still works',
        value: 'Apps catalog, launch grammar, and Coding Agents entry surface',
        status: 'ok',
      },
    ],
  };
}

function buildCodingAgentsActions(appView: LiveAppView): PlaceDetail['actions'] {
  const actions: PlaceDetail['actions'] = [
    {
      id: 'coding-agents-open',
      label: 'Open Coding Agents',
      description: appView.summary,
      variant: 'primary',
      href: '/places/apps/agent?q=Open Coding Agents. Show my active sessions, latest runs, terminal posture, and the right next action.',
    },
  ];

  const latestTerminal = readNullableObject(appView.data, 'latest_terminal_surface');
  const terminalSessionId = readString(latestTerminal ?? {}, 'terminal_session_id');
  if (terminalSessionId) {
    actions.push({
      id: 'coding-agents-terminal',
      label: 'Open latest terminal',
      description: 'Inspect the most recent terminal attached to a coding run.',
      variant: 'secondary',
      href: `/inspectors/terminal-sessions/${terminalSessionId}`,
    });
  }

  return actions;
}

function codingAgentsLiveDetails(appView: LiveAppView): PlaceDetail['deepDetails'][number] {
  const latestRun = readRecordArray(appView.data, 'recent_runs')[0] ?? {};
  const effectivePolicy = readNullableObject(latestRun, 'effective_policy_json');
  const inference = readNullableObject(effectivePolicy ?? {}, 'inference');
  const terminal = readNullableObject(effectivePolicy ?? {}, 'terminal');
  const fallback = readNullableObject(latestRun, 'fallback_json');
  const latestCheckpoint = readNullableObject(appView.data, 'latest_checkpoint');
  const health = readObject(appView.data, 'health');

  return {
    title: 'Coding Agents State',
    rows: [
      { label: 'App', value: appView.title },
      { label: 'Summary', value: appView.summary },
      { label: 'Latest phase', value: startCase(readString(appView.data, 'latest_phase') ?? 'not_started') },
      { label: 'Checkpoint', value: readString(latestCheckpoint ?? {}, 'summary') ?? 'No checkpoint summary yet' },
      { label: 'Execution mode', value: startCase(readString(effectivePolicy ?? {}, 'execution_mode') ?? 'spawned_coding_agent') },
      { label: 'Inference profile', value: startCase(readString(inference ?? {}, 'profile_id') ?? 'balanced') },
      { label: 'Execution substrate', value: startCase(readString(inference ?? {}, 'execution_substrate') ?? 'apps_runtime') },
      { label: 'Terminal bootstrap', value: readBoolean(terminal ?? {}, 'bootstrap_on_launch') ? 'requested on launch' : 'manual only' },
      { label: 'Fallback', value: startCase(readString(fallback ?? {}, 'strategy') ?? 'not_needed') },
      { label: 'Active sessions', value: `${readNumber(health, 'active_session_count')}` },
      { label: 'Recent runs', value: `${readNumber(health, 'recent_run_count')}` },
    ],
  };
}

function codingAgentsHealthDetails(appView: LiveAppView): PlaceDetail['deepDetails'][number] {
  const terminalSurface = readObject(appView.data, 'terminal_surface');
  const fallbackSurface = readObject(appView.data, 'fallback_surface');
  const health = readObject(appView.data, 'health');

  return {
    title: 'Coding Agents Health',
    rows: [
      { label: 'Connectable terminals', value: `${readNumber(terminalSurface, 'connectable_terminal_count')}` },
      { label: 'Pending terminal attach', value: `${readNumber(terminalSurface, 'pending_run_count')}` },
      { label: 'Attached terminals', value: `${readNumber(terminalSurface, 'attached_run_count')}` },
      { label: 'Recoverable terminal failures', value: `${readNumber(terminalSurface, 'failed_but_recoverable_run_count')}` },
      { label: 'Active fallback runs', value: `${readNumber(fallbackSurface, 'active_run_count')}` },
      { label: 'Recovered fallback runs', value: `${readNumber(fallbackSurface, 'recovered_run_count')}` },
      { label: 'Resumable terminal runs', value: `${readNumber(health, 'resumable_terminal_runs')}` },
      { label: 'Requested terminal runs', value: `${readNumber(health, 'requested_terminal_runs')}` },
    ],
  };
}

function codingAgentsContextHelperDetails(appView: LiveAppView): PlaceDetail['deepDetails'][number] | null {
  const contextHealth = readNullableObject(appView.data, 'latest_context_health');
  const status = readString(contextHealth ?? {}, 'status') ?? 'unknown';
  if (status === 'healthy') return null;

  const recommendedRecovery = readStringArray(contextHealth ?? {}, 'recommended_recovery');
  const preservedTruth = readStringArray(contextHealth ?? {}, 'preserved_truth');

  return {
    title: 'Context Health Hint',
    rows: [
      { label: 'Status', value: startCase(status) },
      {
        label: 'What this means',
        value: readString(contextHealth ?? {}, 'human_signal') ?? 'This thread may need a reset or a tighter recap.',
      },
      {
        label: 'What still counts',
        value: preservedTruth.length > 0 ? preservedTruth.join(', ') : 'latest checkpoint and persisted runtime state',
      },
      {
        label: 'What to do now',
        value: recommendedRecovery.length > 0 ? recommendedRecovery[0] : 'restate the task compactly or start fresh',
      },
    ],
  };
}

function codingAgentsTruthPostureDetails(appView: LiveAppView): PlaceDetail['deepDetails'][number] {
  const scopeLens = readObject(appView.data, 'scope_lens');
  const canonicalSources = readRecordArray(appView.data, 'canonical_sources');
  const evidenceContract = readObject(appView.data, 'evidence_contract');

  const primarySource =
    canonicalSources.map((source) => readString(source, 'label')).find((label): label is string => Boolean(label)) ??
    'Canonical source registry';

  return {
    title: 'Coding Agents Truth Posture',
    rows: [
      {
        label: 'What counts here',
        value: readBoolean(scopeLens, 'canonical_preferred') ? 'canonical sources and live runtime truth' : 'mixed sources',
      },
      {
        label: 'What this excludes',
        value: readBoolean(scopeLens, 'workflow_excluded') ? 'workflow orchestration owns no initial spawn here' : 'workflow coordination may apply',
      },
      {
        label: 'Where truth comes from',
        value: primarySource,
      },
      {
        label: 'How answers should behave',
        value: readString(evidenceContract, 'mode') === 'evidence_first' ? 'evidence-first when claims matter' : 'standard operator guidance',
      },
    ],
  };
}

function codingAgentsUnavailableDetails(): PlaceDetail['deepDetails'][number] {
  return {
    title: 'Coding Agents Live Contract',
    rows: [
      { label: 'Expected source', value: '/query/apps/coding-agents' },
      { label: 'Current state', value: 'not reaching this frontend render' },
      { label: 'What is visible', value: 'Apps place, app catalog, Coding Agents launch entry, and agent surface' },
      { label: 'What is missing', value: 'latest phase, checkpoint, terminal surface, fallback surface, and recent runs' },
    ],
  };
}

function snapshotPanel(live: LivePlaceView): PlaceDetail['panels'][number] {
  return {
    title: 'Live Snapshot',
    items: [
      { label: 'Place', value: live.title, status: 'ok' },
      { label: 'Online nodes', value: `${readNumber(live, 'online_nodes')}`, status: 'ok' },
      { label: 'Queued jobs', value: `${readNumber(live, 'queued_jobs')}`, status: 'idle' },
      { label: 'Running jobs', value: `${readNumber(live, 'running_jobs')}`, status: 'ok' },
      { label: 'Completed jobs', value: `${readNumber(live, 'completed_jobs')}`, status: 'ok' },
      {
        label: 'Pending commands',
        value: `${readNumber(live, 'pending_commands')}`,
        status: readNumber(live, 'pending_commands') > 0 ? 'warn' : 'ok',
      },
    ],
  };
}

function snapshotDetails(live: LivePlaceView): PlaceDetail['deepDetails'][number] {
  return {
    title: 'Live Control Plane',
    rows: [
      { label: 'Summary', value: live.summary },
      { label: 'Online nodes', value: `${readNumber(live, 'online_nodes')}` },
      { label: 'Queued jobs', value: `${readNumber(live, 'queued_jobs')}` },
      { label: 'Running jobs', value: `${readNumber(live, 'running_jobs')}` },
      { label: 'Completed jobs', value: `${readNumber(live, 'completed_jobs')}` },
      { label: 'Pending commands', value: `${readNumber(live, 'pending_commands')}` },
    ],
  };
}

function recentJobsPanel(recentJobs: LiveRecentJob[]): PlaceDetail['panels'][number] {
  return {
    title: 'Recent Jobs',
    items: recentJobs.slice(0, 5).map((job) => ({
      label: `${job.kind} · ${shortUuid(job.id)}`,
      value: job.status,
      note: shortTimestamp(job.updated_at),
      status: jobStatusToPanelStatus(job.status),
    })),
  };
}

function recentJobActions(recentJobs: LiveRecentJob[]): PlaceDetail['actions'] {
  return recentJobs.slice(0, 3).map((job, index) => ({
    id: `recent-job-${index}`,
    label: `Inspect ${job.kind} · ${shortUuid(job.id)}`,
    variant: 'secondary' as const,
    href: `/inspectors/jobs/${job.id}`,
  }));
}

function readRuntimePanel(
  placeId: string,
  live: LivePlaceView
): PlaceDetail['panels'][number] | null {
  if (placeId === 'lab-id') {
    const operatorBinding = readObject(live.data, 'operator_binding');
    const nodeTokens = readObject(live.data, 'node_auth_tokens_present');
    return {
      title: 'Identity Bootstrap',
      items: [
        {
          label: 'LAB AUTH root',
          value: readBoolean(live.data, 'lab_auth_reference_root_exists') ? 'present' : 'missing',
          note: readString(live.data, 'lab_auth_reference_root') ?? 'no root configured',
          status: readBoolean(live.data, 'lab_auth_reference_root_exists') ? 'ok' : 'warn',
        },
        {
          label: 'Operator binding',
          value: readBoolean(operatorBinding, 'token_present') ? 'present' : 'missing',
          note: readString(operatorBinding, 'entity_id') ?? 'no entity binding',
          status: readBoolean(operatorBinding, 'token_present') ? 'ok' : 'warn',
        },
        {
          label: 'Node auth',
          value:
            readBoolean(nodeTokens, 'lab256') && readBoolean(nodeTokens, 'lab8gb') && readBoolean(nodeTokens, 'lab512')
              ? 'present'
              : 'incomplete',
          note: 'LAB 256 / LAB 8GB / LAB 512 bootstrap tokens',
          status:
            readBoolean(nodeTokens, 'lab256') && readBoolean(nodeTokens, 'lab8gb') && readBoolean(nodeTokens, 'lab512')
              ? 'ok'
              : 'warn',
        },
      ],
    };
  }

  if (placeId !== 'lab-512') return null;

  const profiles = readRuntimeProfiles(live);
  if (profiles.length === 0) return null;

  return {
    title: 'Inference Runtime',
    items: profiles.map((profile) => ({
      label: startCase(profile.name),
      value: profile.model,
      note: profile.available ? 'available on LAB 512' : 'not installed on LAB 512',
      status: profile.available ? 'ok' : 'warn',
    })),
  };
}

function readRuntimeDetails(
  placeId: string,
  live: LivePlaceView
): PlaceDetail['deepDetails'][number] | null {
  if (placeId === 'lab-id') {
    const operatorBinding = readObject(live.data, 'operator_binding');
    const rows: PlaceDetail['deepDetails'][number]['rows'] = [
      { label: 'Human auth provider', value: readString(live.data, 'human_auth_provider') ?? 'unknown' },
      { label: 'Canonical truth', value: readString(live.data, 'canonical_truth_provider') ?? 'unknown' },
      { label: 'Identity service', value: readString(live.data, 'identity_service_status') ?? 'unknown' },
      { label: 'Clerk domain', value: readString(live.data, 'clerk_domain') ?? 'not configured' },
      { label: 'Supabase project ref', value: readString(live.data, 'supabase_project_ref') ?? 'not configured' },
      { label: 'Operator user id', value: readString(operatorBinding, 'user_id') ?? 'not configured' },
      { label: 'Operator entity id', value: readString(operatorBinding, 'entity_id') ?? 'not configured' },
    ];
    return {
      title: 'Identity State',
      rows,
    };
  }

  if (placeId !== 'lab-512') return null;

  const runtime = readObject(live.data, 'runtime_metadata_json');
  const agentRuntime = readObject(runtime, 'agent_runtime');
  const profiles = readRuntimeProfiles(live);
  if (Object.keys(agentRuntime).length === 0 && profiles.length === 0) return null;

  const rows: PlaceDetail['deepDetails'][number]['rows'] = [];
  const nodeId = readString(live.data, 'node_id');
  if (nodeId) {
    rows.push({ label: 'Inference node', value: nodeId });
  }

  const ollamaStatus = readString(agentRuntime, 'ollama_status');
  if (ollamaStatus) {
    rows.push({ label: 'Ollama status', value: ollamaStatus });
  }

  const ollamaError = readString(agentRuntime, 'ollama_error');
  if (ollamaError) {
    rows.push({ label: 'Ollama error', value: ollamaError });
  }

  profiles.forEach((profile) => {
    rows.push({
      label: `${startCase(profile.name)} profile`,
      value: `${profile.model} · ${profile.available ? 'available' : 'missing'}`,
    });
  });

  return rows.length > 0
    ? {
        title: 'Runtime Profiles',
        rows,
      }
    : null;
}

function readRuntimeProfiles(
  live: LivePlaceView
): Array<{ name: string; model: string; available: boolean }> {
  const runtime = readObject(live.data, 'runtime_metadata_json');
  const agentRuntime = readObject(runtime, 'agent_runtime');
  const profiles = readObject(agentRuntime, 'inference_profiles');

  return Object.entries(profiles)
    .map(([name, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      const record = value as Record<string, unknown>;
      const model = readString(record, 'model');
      const available = readBoolean(record, 'available');
      if (!model || available == null) return null;
      return { name, model, available };
    })
    .filter((profile): profile is { name: string; model: string; available: boolean } => Boolean(profile));
}

function readRecentJobs(live: LivePlaceView): LiveRecentJob[] {
  const value = live.data.recent_jobs;
  if (!Array.isArray(value)) return [];

  const jobs = value
    .map((entry): LiveRecentJob | null => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const id = readString(record, 'id');
      const kind = readString(record, 'kind');
      const status = readString(record, 'status');
      const createdAt = readString(record, 'created_at');
      const updatedAt = readString(record, 'updated_at');
      if (!id || !kind || !status || !createdAt || !updatedAt) return null;

      return {
        id,
        kind,
        status,
        target_node_id: readNullableString(record, 'target_node_id'),
        created_at: createdAt,
        updated_at: updatedAt,
      };
    })
    .filter((job): job is LiveRecentJob => Boolean(job));

  return jobs;
}

function phaseStatus(value: string): 'ok' | 'warn' | 'error' | 'idle' {
  switch (value) {
    case 'dispatching':
    case 'running':
      return 'warn';
    case 'reviewing':
    case 'awaiting_input':
    case 'completed':
      return 'ok';
    case 'failed':
      return 'error';
    default:
      return 'idle';
  }
}

function terminalAttachmentStatus(
  value: string | null
): 'ok' | 'warn' | 'error' | 'idle' {
  switch (value) {
    case 'attached':
      return 'ok';
    case 'pending':
      return 'warn';
    case 'failed':
      return 'error';
    default:
      return 'idle';
  }
}

function buildLiveCreationSession(
  session: Record<string, unknown> | undefined,
  id: string
): CreationSession {
  const deskType = mapDeskType(readString(session ?? {}, 'place'));
  const kind = readString(session ?? {}, 'kind') ?? 'object';
  const warnings = readStringArray(session ?? {}, 'warnings').map((warning, index) => ({
    id: `${id}-warning-${index}`,
    severity: 'caution' as const,
    title: 'Warning',
    body: warning,
    canProceed: true,
  }));
  const missingFields = readRecordArray(session ?? {}, 'missing_fields').map((field, index) => ({
    id: readString(field, 'key') ?? `${id}-field-${index}`,
    label: readString(field, 'label') ?? `Field ${index + 1}`,
    type: 'text' as const,
    required: readBoolean(field, 'required') ?? true,
    value: readDraftValue(session ?? {}, readString(field, 'key')),
    description: 'Imported from canonical creation session state.',
  }));
  const draftFields = Object.entries(readObject(session ?? {}, 'draft')).map(([key, value]) => ({
    id: `${id}-draft-${key}`,
    label: startCase(key),
    type: 'text' as const,
    required: false,
    value: stringifyDraftValue(value),
    description: 'Captured in canonical session draft.',
  }));
  const fields = mergeSessionFields(missingFields, draftFields);
  const proposedActions = readRecordArray(session ?? {}, 'proposed_actions');
  const resultRefs = readRecordArray(session ?? {}, 'result_refs');
  const rawStatus = readString(session ?? {}, 'status') ?? 'Collecting';

  return {
    id,
    deskType,
    title: `${deskLabel(deskType)} ${kind}`.trim(),
    description: `Canonical ${kind} creation session.`,
    phase: mapCreationPhase(rawStatus, missingFields.length, proposedActions.length, resultRefs.length),
    status: mapCreationStatus(rawStatus),
    intent: readString(session ?? {}, 'user_intent') ?? 'No intent recorded.',
    fields,
    warnings,
    proposal:
      proposedActions.length > 0
        ? {
            summary: readString(proposedActions[0], 'summary') ?? 'Canonical proposed action ready for review.',
            objectType: kind,
            objectLabel: readString(proposedActions[0], 'action_type') ?? kind,
            fields: fields.slice(0, 6).map((field) => ({
              label: field.label,
              value: typeof field.value === 'boolean' ? String(field.value) : String(field.value ?? '—'),
            })),
            estimatedImpact: warnings.length > 0 ? `${warnings.length} warning(s) require review.` : 'No active warnings.',
          }
        : null,
    result:
      resultRefs.length > 0 || rawStatus === 'Completed' || rawStatus === 'Failed'
        ? {
            success: rawStatus === 'Completed',
            objectId: readString(resultRefs[0] ?? {}, 'id') ?? undefined,
            objectType: readString(resultRefs[0] ?? {}, 'domain') ?? undefined,
            objectLabel: readString(resultRefs[0] ?? {}, 'label') ?? undefined,
            message:
              rawStatus === 'Completed'
                ? 'Canonical creation session completed.'
                : rawStatus === 'Failed'
                  ? 'Creation session failed during execution.'
                  : 'Creation session produced canonical references.',
          }
        : null,
    createdAt: readString(session ?? {}, 'created_at') ?? new Date().toISOString(),
    updatedAt: readString(session ?? {}, 'updated_at') ?? new Date().toISOString(),
  };
}

function buildLiveEntityInspector(
  id: string,
  entity?: Record<string, unknown>,
  relations: Record<string, unknown>[] = []
): AnyInspector {
  const kind = String(entity?.kind ?? 'entity');
  const canonicalName = String(entity?.canonical_name ?? `ENTITY ${id.slice(0, 8)}`);
  const aliasCount = Array.isArray(entity?.aliases) ? entity.aliases.length : 0;
  const trustLinks = relations.map((relation) => ({
    target:
      String(relation.target_entity_id ?? '') === id
        ? String(relation.source_entity_id ?? 'unknown')
        : String(relation.target_entity_id ?? 'unknown'),
    mechanism: String(relation.relation_type ?? 'linked'),
  }));
  const registrationContext = entity ? readNullableObject(entity, 'registration_context') : null;
  const provenance = [
    readString(registrationContext ?? {}, 'medium')
      ? { label: 'Intake medium', value: startCase(readString(registrationContext ?? {}, 'medium') ?? 'unknown') }
      : null,
    readString(registrationContext ?? {}, 'source_label')
      ? { label: 'Source label', value: readString(registrationContext ?? {}, 'source_label') ?? '' }
      : null,
    readString(registrationContext ?? {}, 'source_reference')
      ? { label: 'Source reference', value: readString(registrationContext ?? {}, 'source_reference') ?? '' }
      : null,
    readString(registrationContext ?? {}, 'surface')
      ? { label: 'Registered via', value: readString(registrationContext ?? {}, 'surface') ?? '' }
      : null,
  ].filter((value): value is { label: string; value: string } => Boolean(value));

  return {
    id,
    type: 'entity',
    canonicalName,
    descriptor: 'Live LAB ID inspector',
    status: 'healthy',
    createdAt: String(entity?.created_at ?? new Date().toISOString()),
    updatedAt: String(entity?.updated_at ?? new Date().toISOString()),
    role: startCase(kind),
    capabilities:
      Array.isArray(entity?.capabilities) && entity.capabilities.length > 0
        ? entity.capabilities.map((capability) => String(capability))
        : ['Identity registered'],
    credentials: [
      {
        label: 'Canonical registration',
        validity: aliasCount > 0 ? `${aliasCount} alias(es)` : 'canonical only',
        status: 'ok',
      },
    ],
    trustLinks,
    provenance,
  };
}

function buildLiveJobLogView(sourceId: string, body: Record<string, unknown>): LogView {
  const job = readObject(body, 'job');
  const latestRun = readNullableObject(body, 'latest_run');
  const artifacts = readRecordArray(body, 'artifacts');
  const entries: LogEntry[] = [];

  const jobCreatedAt = readString(job, 'created_at');
  if (jobCreatedAt) {
    entries.push({
      id: `${sourceId}-created`,
      timestamp: jobCreatedAt,
      level: 'info' as const,
      source: 'control-plane',
      message: `Job ${readString(job, 'kind') ?? shortUuid(sourceId)} registered in canonical state.`,
      jobId: sourceId,
      traceId: shortUuid(sourceId),
    });
  }

  const startedAt = readString(latestRun ?? {}, 'started_at');
  if (startedAt) {
    entries.push({
      id: `${sourceId}-started`,
      timestamp: startedAt,
      level: 'info' as const,
      source: 'worker',
      message: `Execution started on ${readString(latestRun ?? {}, 'node_id') ?? 'assigned node'}.`,
      jobId: sourceId,
      traceId: shortUuid(sourceId),
    });
  }

  const runSummary = readString(latestRun ?? {}, 'summary');
  const finishedAt = readString(latestRun ?? {}, 'finished_at') ?? readString(job, 'updated_at');
  if (runSummary && finishedAt) {
    entries.push({
      id: `${sourceId}-summary`,
      timestamp: finishedAt,
      level: mapLogLevel(readString(latestRun ?? {}, 'status')),
      source: 'worker',
      message: runSummary,
      jobId: sourceId,
      traceId: shortUuid(sourceId),
    });
  }

  artifacts.forEach((artifact, index) => {
    const timestamp = readString(artifact, 'created_at') ?? readString(job, 'updated_at') ?? new Date().toISOString();
    const kind = readString(artifact, 'kind') ?? 'artifact';
    const storagePath = readString(artifact, 'storage_path') ?? 'unknown';
    entries.push({
      id: `${sourceId}-artifact-${index}`,
      timestamp,
      level: kind === 'log_manifest' ? 'info' as const : 'debug' as const,
      source: 'artifacts',
      message:
        kind === 'log_manifest'
          ? `Log manifest recorded at ${storagePath}.`
          : `Artifact recorded: ${kind} -> ${storagePath}`,
      jobId: sourceId,
      traceId: shortUuid(sourceId),
    });
  });

  if (entries.length === 0) {
    entries.push({
      id: `${sourceId}-no-stream`,
      timestamp: new Date().toISOString(),
      level: 'warn',
      source: 'minilab.work',
      message: 'No live log stream or manifest is available for this job yet.',
      jobId: sourceId,
      traceId: shortUuid(sourceId),
    });
  }

  return {
    sourceId,
    sourceType: 'job',
    sourceLabel: readString(job, 'kind') ?? `JOB ${shortUuid(sourceId)}`,
    entries: entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    hasMore: false,
  };
}

function readNumber(source: LivePlaceView | Record<string, unknown>, key: string): number {
  const record: Record<string, unknown> =
    'place' in source && 'summary' in source && 'data' in source
      ? (source.data as Record<string, unknown>)
      : source;
  const value = record[key];
  return typeof value === 'number' ? value : 0;
}

function readObject(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNullableObject(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = record[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key];
  return typeof value === 'boolean' ? value : null;
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function readRecordArray(record: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = record[key];
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    : [];
}

function readDraftValue(record: Record<string, unknown>, key: string | null): string | boolean | undefined {
  if (!key) return undefined;
  const draft = readObject(record, 'draft');
  const value = draft[key];
  return typeof value === 'string' || typeof value === 'boolean' ? value : stringifyDraftValue(value);
}

function stringifyDraftValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return undefined;
  return JSON.stringify(value);
}

function shortUuid(value: string): string {
  return value.slice(0, 8);
}

function shortTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function jobStatusToPanelStatus(status: string): 'ok' | 'warn' | 'error' | 'idle' {
  switch (status.toLowerCase()) {
    case 'done':
      return 'ok';
    case 'running':
      return 'warn';
    case 'failed':
    case 'cancelled':
      return 'error';
    default:
      return 'idle';
  }
}

function mapCreationPhase(
  status: string,
  missingFieldCount: number,
  proposedActionCount: number,
  resultRefCount: number
): CreationSession['phase'] {
  switch (status) {
    case 'Collecting':
      return missingFieldCount > 0 ? 'missing-fields' : 'draft';
    case 'Normalizing':
    case 'Validating':
      return missingFieldCount > 0 ? 'missing-fields' : proposedActionCount > 0 ? 'proposal' : 'warnings';
    case 'AwaitingConfirmation':
      return 'proposal';
    case 'Executing':
      return 'confirmation';
    case 'Completed':
    case 'Failed':
      return resultRefCount > 0 || status === 'Completed' ? 'result' : 'warnings';
    default:
      return 'intent';
  }
}

function mapCreationStatus(status: string): CreationSession['status'] {
  switch (status) {
    case 'Collecting':
      return 'active';
    case 'Normalizing':
    case 'Validating':
    case 'AwaitingConfirmation':
      return 'waiting';
    case 'Executing':
      return 'confirmed';
    case 'Completed':
      return 'completed';
    case 'Failed':
      return 'failed';
    default:
      return 'waiting';
  }
}

function mapDeskType(place: string | null): CreationSession['deskType'] {
  switch (place) {
    case 'lab-id':
    case 'supabase':
    case 'workflows':
    case 'lab-512':
      return place;
    default:
      return 'supabase';
  }
}

function mergeSessionFields(
  missingFields: CreationSession['fields'],
  draftFields: CreationSession['fields']
): CreationSession['fields'] {
  const byId = new Map<string, CreationSession['fields'][number]>();
  [...missingFields, ...draftFields].forEach((field) => {
    if (!byId.has(field.id)) byId.set(field.id, field);
  });
  return Array.from(byId.values());
}

function startCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function deskLabel(deskType: CreationSession['deskType']): string {
  switch (deskType) {
    case 'lab-id':
      return 'LAB ID';
    case 'supabase':
      return 'SUPABASE';
    case 'workflows':
      return 'WORK FLOWS';
    case 'lab-512':
      return 'LAB 512';
  }
}

function mapLogLevel(status: string | null): 'debug' | 'info' | 'warn' | 'error' | 'fatal' {
  switch ((status ?? '').toLowerCase()) {
    case 'done':
      return 'info';
    case 'running':
      return 'info';
    case 'failed':
      return 'error';
    case 'cancelled':
      return 'warn';
    default:
      return 'debug';
  }
}

function normalizeInspectorKind(type: string): string {
  switch (type.trim().toLowerCase()) {
    case 'jobs':
      return 'job';
    case 'creation-session':
    case 'creation-sessions':
    case 'creation_sessions':
      return 'creation_session';
    default:
      return type.trim().toLowerCase();
  }
}

function controlPlaneBaseUrl(): string {
  return (process.env.MODES_CONTROL_PLANE_BASE_URL ?? 'http://127.0.0.1:8080').replace(/\/+$/, '');
}

function controlPlaneToken(): string {
  const token = process.env.LAB_ID_OPERATOR_TOKEN ?? process.env.MODES_DEV_OPERATOR_TOKEN;
  if (!token) {
    throw new Error('LAB_ID_OPERATOR_TOKEN or MODES_DEV_OPERATOR_TOKEN is required for live control-plane reads.');
  }
  return token;
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const queryClient = new QueryClient();
