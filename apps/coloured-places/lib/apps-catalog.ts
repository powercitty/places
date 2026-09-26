import type { ActionItem, Attention, DetailSection, Panel, PlaceSummary, Relation, Signal, StatusLight } from './types';
import { ontologyRows } from './minilab-ontology';

export type AppCatalogEntry = {
  id: string;
  title: string;
  role: string;
  status: 'ready' | 'partial' | 'soon';
  launchLabel: string;
  href?: string;
  query?: string;
  note: string;
  livesIn: 'apps' | 'lab-256' | 'lab-512' | 'lab-id';
};

export const APPS_CATALOG: AppCatalogEntry[] = [
  {
    id: 'coding-agents',
    title: 'Coding Agents',
    role: 'Spawn governed code sessions with terminal-backed execution.',
    status: 'partial',
    launchLabel: 'Open Coding Agents',
    href: '/places/apps/agent?q=Open the Coding Agents app. Show the current app surface, explain available execution paths, and help me spawn a coding session.',
    note: 'This is where spawned coding sessions belong. A spawned run is an app session, not a workflow.',
    livesIn: 'apps',
  },
  {
    id: 'terminal-console',
    title: 'Terminal Console',
    role: 'Inspect and continue live terminal sessions once a run has attached.',
    status: 'partial',
    launchLabel: 'Open Terminal Console',
    href: '/places/apps/agent?q=Open the Terminal Console app. Help me inspect or continue a live terminal session.',
    note: 'Terminal sessions are execution surfaces opened by apps or place agents.',
    livesIn: 'apps',
  },
  {
    id: 'identity-intake',
    title: 'Identity Intake',
    role: 'Turn text, photos, screenshots, and documents into LAB ID registration intake.',
    status: 'ready',
    launchLabel: 'Open Identity Intake',
    href: '/places/lab-id/agent?q=Open the Identity Intake app and help me prepare a governed LAB ID registration.',
    note: 'Lives under LAB ID operationally, but is still an app-like surface.',
    livesIn: 'lab-id',
  },
  {
    id: 'job-console',
    title: 'Job Console',
    role: 'Inspect proposed, admitted, running, and completed jobs.',
    status: 'partial',
    launchLabel: 'Open Job Console',
    href: '/places/lab-512/agent?q=Open the Job Console app and help me inspect current compute jobs.',
    note: 'Jobs are truth objects in the core. The app is the operator surface over them.',
    livesIn: 'lab-512',
  },
];

function appStatusLabel(status: AppCatalogEntry['status']): string {
  switch (status) {
    case 'ready':
      return 'ready';
    case 'partial':
      return 'partial';
    case 'soon':
      return 'soon';
  }
}

function appStatusPanelKind(status: AppCatalogEntry['status']): 'ok' | 'warn' | 'idle' {
  switch (status) {
    case 'ready':
      return 'ok';
    case 'partial':
      return 'warn';
    case 'soon':
      return 'idle';
  }
}

export function buildAppsPlaceSummarySignals(): Signal[] {
  const readyCount = APPS_CATALOG.filter((app) => app.status === 'ready').length;
  const partialCount = APPS_CATALOG.filter((app) => app.status === 'partial').length;
  const appSessionCount = APPS_CATALOG.filter((app) => app.id === 'coding-agents' || app.id === 'terminal-console').length;

  return [
    { label: 'Catalogued apps', value: `${APPS_CATALOG.length}` },
    { label: 'Ready now', value: `${readyCount}` },
    { label: 'Launch surfaces', value: `${appSessionCount}`, note: `${partialCount} partial` },
  ];
}

export function buildAppsPlaceStatusLights(): StatusLight[] {
  return [
    { label: 'Connectivity', status: 'on' },
    { label: 'Integrity', status: 'warn' },
    { label: 'Activity', status: 'on' },
  ];
}

export function buildAppsPlaceAttention(): Attention {
  return {
    title: 'Apps launcher',
    body: 'Apps is where you open operator apps and tools. Coding Agents launches here; Workflows remains orchestration-only.',
  };
}

export function buildAppsPlacePanels(): Panel[] {
  return [
    {
      title: 'Pinned Apps',
      items: APPS_CATALOG.slice(0, 2).map((app) => ({
        label: app.title,
        value: appStatusLabel(app.status),
        status: appStatusPanelKind(app.status),
        note: app.role,
      })),
    },
    {
      title: 'App Catalog',
      items: APPS_CATALOG.map((app) => ({
        label: app.title,
        value: app.livesIn === 'apps' ? 'apps place' : app.livesIn.replace('-', ' '),
        status: appStatusPanelKind(app.status),
        note: app.note,
      })),
    },
    {
      title: 'Canonical Grammar',
      items: ontologyRows(['place', 'app', 'session', 'run', 'terminal', 'workflow']).map((row) => ({
        label: row.label,
        value: row.value,
        status: row.label === 'Workflow' ? 'idle' : row.label === 'Terminal' ? 'warn' : 'ok',
        note: row.note,
      })),
    },
  ];
}

export function buildAppsPlaceActions(): ActionItem[] {
  return APPS_CATALOG.map((app) => ({
    id: app.id,
    label: app.launchLabel,
    description: app.role,
    variant: app.id === 'coding-agents' ? 'primary' : 'secondary',
    href: app.href,
    disabled: !app.href,
  }));
}

export function buildAppsPlaceDetails(): DetailSection[] {
  return [
    {
      title: 'Apps Contract',
      rows: [
        { label: 'Purpose', value: 'Catalog and launch the operator apps, tools, consoles, and utility surfaces of minilab.work' },
        { label: 'Coding agents', value: 'An app inside Apps, not a workflow' },
        { label: 'Spawned run', value: 'A session/run created by the Coding Agents app' },
        { label: 'Workflow role', value: 'Supervise orchestration and handoffs, not app launching' },
      ],
    },
    {
      title: 'Canonical Terms',
      rows: ontologyRows(['place', 'app', 'session', 'run', 'terminal', 'job', 'workflow']).map((row) => ({
        label: row.label,
        value: row.value,
        note: row.note,
      })),
    },
    {
      title: 'Apps State',
      rows: [
        { label: 'Pinned apps', value: 'explicit' },
        { label: 'Catalog surface', value: 'explicit' },
        { label: 'Launch grammar', value: 'explicit in UI' },
      ],
    },
    {
      title: 'Current Gaps',
      rows: [
        { label: 'Apps registry backend', value: 'frontend-explicit, backend-not-modeled' },
        { label: 'Launch health', value: 'partial' },
        { label: 'Version state', value: 'not yet backed by canonical query' },
      ],
    },
  ];
}

export function buildAppsPlaceRelations(): Relation[] {
  return [
    { place: 'LAB 512', placeId: 'lab-512', nature: 'runs compute-heavy agent work' },
    { place: 'LAB 256', placeId: 'lab-256', nature: 'cockpit and operator command surface' },
    { place: 'WORK FLOWS', placeId: 'workflows', nature: 'coordinates sequences after apps launch work' },
  ];
}

export function mergeAppsSummary(base: PlaceSummary): PlaceSummary {
  return {
    ...base,
    shortSummary: 'Catalog of operator apps, tools, consoles and launch surfaces. Coding Agents lives here; Workflows stays orchestration-only.',
    status: 'attention',
    statusLights: buildAppsPlaceStatusLights(),
    primarySignals: buildAppsPlaceSummarySignals(),
    attention: buildAppsPlaceAttention(),
  };
}
