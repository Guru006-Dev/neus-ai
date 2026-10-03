export interface NavItem { label: string; to: string; needsBackend?: boolean }
export interface NavGroup { label: string | null; items: NavItem[] }

export const NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Overview', to: '/dashboard' }, { label: 'Runs', to: '/dashboard/runs' }] },
  { label: 'Intelligence', items: [{ label: 'Agents', to: '/dashboard/agents' }] },
  {
    label: 'Outputs',
    items: [
      { label: 'Knowledge', to: '/dashboard/knowledge', needsBackend: true },
      { label: 'Documentation', to: '/dashboard/documentation', needsBackend: true },
      { label: 'QA', to: '/dashboard/qa', needsBackend: true },
      { label: 'Demos', to: '/dashboard/demos', needsBackend: true },
      { label: 'Releases', to: '/dashboard/releases', needsBackend: true },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = { label: 'Settings', to: '/dashboard/settings' }
