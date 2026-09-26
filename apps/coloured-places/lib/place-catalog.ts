export type PlaceCatalogItem = {
  id: string;
  title: string;
  shortLabel: string;
  descriptor: string;
  shortSummary: string;
  backgroundImage: string;
  accentColor: string;
  textColor: 'light' | 'dark';
};

export const PLACE_CATALOG: PlaceCatalogItem[] = [
  {
    id: 'lab-512',
    title: 'LAB 512',
    shortLabel: 'LAB 512',
    descriptor: 'Operations',
    shortSummary: 'Heavier inference and the heavy jobs — the workhorse. Mac mini, 24/7.',
    backgroundImage: '/images/lab-512.jpeg',
    accentColor: '#B5173A',
    textColor: 'light',
  },
  {
    id: 'lab-8gb',
    title: 'LAB 8GB',
    shortLabel: 'LAB 8GB',
    descriptor: 'Capital',
    shortSummary: 'The least powerful mini (8GB RAM), yet it holds the crown jewels: identity and authority. Light inference too.',
    backgroundImage: '/images/lab-8gb.png',
    accentColor: '#1D7A3A',
    textColor: 'light',
  },
  {
    id: 'lab-256',
    title: 'LAB 256',
    shortLabel: 'LAB 256',
    descriptor: 'Workbench',
    shortSummary: 'Everything is a draft until it is promoted or deployed to the LABs. Mac mini.',
    backgroundImage: '/images/lab-256.png',
    accentColor: '#1B3A5C',
    textColor: 'light',
  },
  {
    id: 'supabase',
    title: 'SUPABASE',
    shortLabel: 'SUPABASE',
    descriptor: 'Official',
    shortSummary: 'System of record. Canonical data, realtime, storage and migrations.',
    backgroundImage: '/images/supabase.jpeg',
    accentColor: '#C2611A',
    textColor: 'light',
  },
  {
    id: 'lab-id',
    title: 'POWERFARM',
    shortLabel: 'POWERFARM',
    descriptor: 'Identity',
    shortSummary: 'Principal registry, credentials, capabilities and trust resolution.',
    backgroundImage: '/images/lab-id.png',
    accentColor: '#1A1A1A',
    textColor: 'light',
  },
  {
    id: 'google-drive',
    title: 'GOOGLE DRIVE',
    shortLabel: 'G. DRIVE',
    descriptor: 'Backup',
    shortSummary: 'Preservation, archives, exported bundles and recovery surfaces.',
    backgroundImage: '/images/google-drive.png',
    accentColor: '#5B2D8E',
    textColor: 'light',
  },
  {
    id: 'apps',
    title: 'App Park',
    shortLabel: 'App Park',
    descriptor: 'Execution Surface',
    shortSummary: 'Catalog of operator apps, tools, consoles and launch surfaces.',
    backgroundImage: '/images/apps.jpeg',
    accentColor: '#B8707A',
    textColor: 'light',
  },
  {
    id: 'engine-park',
    title: 'Engine Park',
    shortLabel: 'Engine Park',
    descriptor: 'Runtime',
    shortSummary: 'Long-running engines, workers and background runtime for the fleet.',
    backgroundImage: '/images/apps.jpeg',
    accentColor: '#2C6E7A',
    textColor: 'light',
  },
  {
    id: 'workflows',
    title: 'WORK FLOWS',
    shortLabel: 'FLOWS',
    descriptor: 'Orchestration',
    shortSummary: 'Coordinated runs, approvals, retries and handoffs. This is not the app-launch surface.',
    backgroundImage: '/images/workflows.jpeg',
    accentColor: '#4A7FAA',
    textColor: 'light',
  },
  {
    id: 'settings',
    title: 'SETTINGS',
    shortLabel: 'SETTINGS',
    descriptor: 'Policy',
    shortSummary: 'System-wide policies, thresholds, flags and integration bindings.',
    backgroundImage: '/images/settings.jpeg',
    accentColor: '#5A8A65',
    textColor: 'light',
  },
];

export function getPlaceCatalogItem(id: string): PlaceCatalogItem | null {
  return PLACE_CATALOG.find((item) => item.id === id) ?? null;
}
