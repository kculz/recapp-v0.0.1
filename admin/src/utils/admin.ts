export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface OverviewStats {
  totalClients: number;
  totalCounselors: number;
  pendingInvites: number;
  activeAlerts: number;
}

export const ADMIN_ROUTE_PATHS = {
  overview: '/overview',
  intake: '/intake',
  directory: '/directory',
  calendar: '/calendar',
  library: '/library',
  groupSessions: '/group-sessions',
  crisis: '/crisis',
  login: '/login',
} as const;

export type AdminRoutePath = (typeof ADMIN_ROUTE_PATHS)[keyof typeof ADMIN_ROUTE_PATHS];

export interface AdminNavItem {
  path: AdminRoutePath;
  label: string;
  icon: string;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { path: ADMIN_ROUTE_PATHS.overview, label: 'Overview', icon: '📊' },
  { path: ADMIN_ROUTE_PATHS.intake, label: 'Client Intake', icon: '📩' },
  { path: ADMIN_ROUTE_PATHS.directory, label: 'Client Directory', icon: '👥' },
  { path: ADMIN_ROUTE_PATHS.library, label: 'Resource Library', icon: '📚' },
  { path: ADMIN_ROUTE_PATHS.groupSessions, label: 'Group Sessions', icon: '🏥' },
  { path: ADMIN_ROUTE_PATHS.crisis, label: 'Crisis Monitor', icon: '🚨' },
];

const COUNSELOR_NAV_ITEMS: AdminNavItem[] = [
  { path: ADMIN_ROUTE_PATHS.overview, label: 'Overview', icon: '📊' },
  { path: ADMIN_ROUTE_PATHS.calendar, label: 'Session Scheduler', icon: '📅' },
  { path: ADMIN_ROUTE_PATHS.library, label: 'Resource Library', icon: '📚' },
  { path: ADMIN_ROUTE_PATHS.groupSessions, label: 'Group Sessions', icon: '🏥' },
  { path: ADMIN_ROUTE_PATHS.crisis, label: 'Crisis Monitor', icon: '🚨' },
];

export const isAdminRole = (role: string) => role === 'Admin' || role === 'SuperAdmin';

export const getAdminNavItems = (role: string) => (isAdminRole(role) ? ADMIN_NAV_ITEMS : COUNSELOR_NAV_ITEMS);

export const getDefaultAdminRoute = (role: string) =>
  role === 'Counselor' ? ADMIN_ROUTE_PATHS.calendar : ADMIN_ROUTE_PATHS.overview;

export const getAdminPageTitle = (pathname: string) => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  switch (normalizedPath) {
    case ADMIN_ROUTE_PATHS.overview:
      return 'System Dashboard';
    case ADMIN_ROUTE_PATHS.intake:
      return 'Client Intake Management';
    case ADMIN_ROUTE_PATHS.directory:
      return 'Clients & Counselors';
    case ADMIN_ROUTE_PATHS.calendar:
      return 'Counselor Calendar';
    case ADMIN_ROUTE_PATHS.library:
      return 'Resource Library';
    case ADMIN_ROUTE_PATHS.groupSessions:
      return 'Group Sessions';
    case ADMIN_ROUTE_PATHS.crisis:
      return 'Crisis Warnings Monitor';
    default:
      return 'RecApp Console';
  }
};
