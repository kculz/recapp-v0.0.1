export default function App() {
  return (
    <div className="min-h-screen bg-skyblue-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-oceanblue text-white shadow-md py-4 px-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-oceanblue font-extrabold text-lg shadow-sm">
            R
          </div>
          <h1 className="text-xl font-bold tracking-tight">RecApp Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-skyblue-600/30 text-skyblue-100 text-xs px-3 py-1 rounded-full font-semibold border border-skyblue-400/20">
            Phase 1 Setup
          </span>
          <span className="bg-white text-oceanblue text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
            v1.0.0
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        {/* Hero Welcome banner */}
        <div className="bg-gradient-to-r from-oceanblue to-skyblue-700 p-8 rounded-3xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-3xl font-extrabold tracking-tight">Rehabilitation & Counseling Client Portal</h2>
            <p className="text-sm text-skyblue-100/90 leading-relaxed">
              Welcome to the administrative control center. This panel handles therapist scheduling, client intake operations, progress chart reviews, and safety escalations.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 self-stretch md:self-auto flex flex-col justify-center">
            <span className="text-xs text-skyblue-200 uppercase font-bold tracking-wider">System Status</span>
            <span className="text-lg font-bold">All Modules Active</span>
          </div>
        </div>

        {/* Dashboard Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Intake Card */}
          <div className="bg-white p-6 rounded-2xl border border-skyblue-100 shadow-sm flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-skyblue-100 flex items-center justify-center text-skyblue-700 text-2xl">
                👤
              </div>
              <h3 className="text-lg font-bold text-oceanblue">Client Registration</h3>
              <p className="text-xs text-oceanblue-900/60 leading-relaxed">
                Add clients to the invitation-only system. Generates an email activation link valid for 48 hours.
              </p>
            </div>
            <button className="bg-skyblue text-white text-xs font-semibold py-2 px-4 rounded-xl hover:bg-skyblue-600 transition-colors self-start shadow-sm mt-2">
              Register Client
            </button>
          </div>

          {/* Booking Card */}
          <div className="bg-white p-6 rounded-2xl border border-skyblue-100 shadow-sm flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-oceanblue/10 flex items-center justify-center text-oceanblue text-2xl">
                📅
              </div>
              <h3 className="text-lg font-bold text-oceanblue">Session Scheduler</h3>
              <p className="text-xs text-oceanblue-900/60 leading-relaxed">
                Manage counseling time slots, review recurring clinic schedules, and open emergency video/audio call streams.
              </p>
            </div>
            <button className="bg-oceanblue text-white text-xs font-semibold py-2 px-4 rounded-xl hover:bg-oceanblue-900 transition-colors self-start shadow-sm mt-2">
              Manage Calendar
            </button>
          </div>

          {/* Safety Card */}
          <div className="bg-white p-6 rounded-2xl border border-skyblue-100 shadow-sm flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 text-2xl">
                🚨
              </div>
              <h3 className="text-lg font-bold text-oceanblue">Crisis Alerts</h3>
              <p className="text-xs text-oceanblue-900/60 leading-relaxed">
                Review triggers flagged by NLP-based keyword checks in community feeds or counselor direct chats.
              </p>
            </div>
            <span className="bg-red-50 border border-red-100 text-red-600 text-xs px-3 py-1 rounded-full font-bold self-start mt-2">
              0 Active Alerts
            </span>
          </div>
        </div>

        {/* Database Status Info */}
        <div className="bg-white p-6 rounded-2xl border border-skyblue-100 shadow-sm flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-lg">
              ✓
            </div>
            <div>
              <h4 className="text-sm font-bold text-oceanblue-900">Database Engine connected</h4>
              <p className="text-xs text-oceanblue-900/50">Sequelize mapped to PostgreSQL at port 5432</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <span className="text-xs text-oceanblue-900/40 block">App Version</span>
              <span className="text-sm font-bold text-oceanblue">v1.0.0</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
