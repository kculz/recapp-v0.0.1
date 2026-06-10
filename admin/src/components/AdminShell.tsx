import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { getAdminPageTitle } from '../utils/admin';

interface AdminShellProps {
  role: string;
  userName: string;
  onLogout: () => void;
  onRefreshStats: () => void;
  loadingStats: boolean;
}

export default function AdminShell({ role, userName, onLogout, onRefreshStats, loadingStats }: AdminShellProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-skyblue-50 flex h-screen overflow-hidden">
      <Sidebar role={role} userName={userName} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-skyblue-100/55 py-4 px-8 flex justify-between items-center shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-oceanblue tracking-tight uppercase">
              {getAdminPageTitle(location.pathname)}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRefreshStats}
              disabled={loadingStats}
              className="p-2 text-oceanblue-900/40 hover:text-oceanblue rounded-lg hover:bg-skyblue-50 transition-colors disabled:cursor-wait"
              title="Refresh Stats"
            >
              🔄
            </button>
            <span className="bg-skyblue-100/60 text-skyblue-700 text-[10px] px-3 py-1.5 rounded-full font-black border border-skyblue-200/40 uppercase">
              Portal Mode
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
