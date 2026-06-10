import { useNavigate } from 'react-router-dom';
import { ADMIN_ROUTE_PATHS, type AdminUser, type OverviewStats, isAdminRole } from '../utils/admin';

interface OverviewPageProps {
  user: AdminUser;
  stats: OverviewStats;
}

export default function OverviewPage({ user, stats }: OverviewPageProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-r from-oceanblue to-skyblue p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-40 h-40 rounded-full bg-white/5" />
        <div className="space-y-2 max-w-xl z-10">
          <span className="text-[10px] bg-white/20 text-white uppercase font-black tracking-wider py-1 px-3 rounded-full border border-white/10">
            Welcome Back
          </span>
          <h2 className="text-3xl font-black tracking-tight mt-2">{user.name}</h2>
          <p className="text-xs text-skyblue-100/90 leading-relaxed font-semibold">
            You are logged into the clinical management dashboard. Monitor counselor assignments, schedule reviews, and safety alerts.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/25 self-stretch md:self-auto flex flex-col justify-center text-center shadow-lg z-10">
          <span className="text-[10px] text-skyblue-200 uppercase font-black tracking-wider">Session Token</span>
          <span className="text-sm font-black mt-0.5">Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-skyblue-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-skyblue-50 text-skyblue text-2xl flex items-center justify-center border border-skyblue-100/50">
            👤
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-oceanblue-900/40">Total Clients</span>
            <h4 className="text-2xl font-black text-oceanblue mt-0.5">{stats.totalClients}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-skyblue-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 text-2xl flex items-center justify-center border border-indigo-100/50">
            🩺
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-oceanblue-900/40">Counselors</span>
            <h4 className="text-2xl font-black text-oceanblue mt-0.5">{stats.totalCounselors}</h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-skyblue-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 text-2xl flex items-center justify-center border border-amber-100/50">
            ✉️
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-oceanblue-900/40">Pending Invites</span>
            <h4 className="text-2xl font-black text-oceanblue mt-0.5">{stats.pendingInvites}</h4>
          </div>
        </div>

        <button
          onClick={() => navigate(ADMIN_ROUTE_PATHS.crisis)}
          className={`bg-white p-6 rounded-3xl border shadow-sm flex items-center gap-4 hover:shadow-md transition-all text-left ${
            stats.activeAlerts > 0 ? 'border-red-200 bg-red-50/20 shadow-red-100' : 'border-skyblue-100'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center border ${
              stats.activeAlerts > 0
                ? 'bg-red-100 text-red-600 border-red-200 animate-pulse'
                : 'bg-emerald-50 text-emerald-500 border-emerald-100/50'
            }`}
          >
            🚨
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-oceanblue-900/40">Crisis Alerts</span>
            <h4 className={`text-2xl font-black mt-0.5 ${stats.activeAlerts > 0 ? 'text-red-600' : 'text-oceanblue'}`}>
              {stats.activeAlerts}
            </h4>
          </div>
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-skyblue-100 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-oceanblue">Administrative Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isAdminRole(user.role) && (
            <>
              <div className="p-5 rounded-2xl bg-skyblue-50/40 border border-skyblue-100/50 space-y-2 flex flex-col justify-between items-start">
                <span className="text-sm font-bold text-oceanblue-900">Add new Clients</span>
                <p className="text-xs text-oceanblue-900/60 leading-relaxed font-semibold">
                  Enter details to invite new rehabilitation or counseling track clients.
                </p>
                <button
                  onClick={() => navigate(ADMIN_ROUTE_PATHS.intake)}
                  className="py-1.5 px-3 bg-skyblue hover:bg-skyblue-600 text-white rounded-xl text-xs font-bold transition-colors mt-2"
                >
                  Client Intake ➜
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-skyblue-50/40 border border-skyblue-100/50 space-y-2 flex flex-col justify-between items-start">
                <span className="text-sm font-bold text-oceanblue-900">Manage Mappings</span>
                <p className="text-xs text-oceanblue-900/60 leading-relaxed font-semibold">
                  Assign counselors, modify track categories, and block/unblock client statuses.
                </p>
                <button
                  onClick={() => navigate(ADMIN_ROUTE_PATHS.directory)}
                  className="py-1.5 px-3 bg-skyblue hover:bg-skyblue-600 text-white rounded-xl text-xs font-bold transition-colors mt-2"
                >
                  Client Directory ➜
                </button>
              </div>
            </>
          )}

          {user.role === 'Counselor' && (
            <div className="p-5 rounded-2xl bg-skyblue-50/40 border border-skyblue-100/50 space-y-2 flex flex-col justify-between items-start">
              <span className="text-sm font-bold text-oceanblue-900">Manage Schedule</span>
              <p className="text-xs text-oceanblue-900/60 leading-relaxed font-semibold">
                Review appointments calendar, view client notes, or cancel sessions.
              </p>
              <button
                onClick={() => navigate(ADMIN_ROUTE_PATHS.calendar)}
                className="py-1.5 px-3 bg-skyblue hover:bg-skyblue-600 text-white rounded-xl text-xs font-bold transition-colors mt-2"
              >
                Calendar Scheduler ➜
              </button>
            </div>
          )}

          <div className="p-5 rounded-2xl bg-skyblue-50/40 border border-skyblue-100/50 space-y-2 flex flex-col justify-between items-start">
            <span className="text-sm font-bold text-oceanblue-900">Monitor Safety</span>
            <p className="text-xs text-oceanblue-900/60 leading-relaxed font-semibold">
              Review triggered keyword scans, scan texts, and mark items resolved.
            </p>
            <button
              onClick={() => navigate(ADMIN_ROUTE_PATHS.crisis)}
              className="py-1.5 px-3 bg-skyblue hover:bg-skyblue-600 text-white rounded-xl text-xs font-bold transition-colors mt-2"
            >
              Safety Alerts ➜
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
