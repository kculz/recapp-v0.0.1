import { useState, useEffect } from 'react';

interface GroupSession {
  id: number;
  title: string;
  description?: string;
  category: string;
  sessionDate: string;
  timeSlot: string;
  maxCapacity: number;
  status: string;
  host?: { id: number; name: string };
  members: { id: number; userId: number }[];
}

const CATEGORIES = ['Rehab', 'Mental Health', 'Mindfulness', 'Life Skills', 'Crisis Support'];
const TIME_SLOTS = [
  '09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM',
  '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM'
];

const STATUS_BADGE: Record<string, string> = {
  Open:      'bg-emerald-100 text-emerald-700',
  Full:      'bg-amber-100 text-amber-700',
  Completed: 'bg-blue-100 text-blue-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const BLANK_FORM = {
  title: '', description: '', category: 'Mental Health',
  sessionDate: '', timeSlot: TIME_SLOTS[0], maxCapacity: 10,
};

interface Props { token: string; apiUrl: string; }

export default function GroupSessionsView({ token, apiUrl }: Props) {
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = filterStatus !== 'All' ? `?status=${filterStatus}` : '';
      const res = await fetch(`${apiUrl}/group-sessions${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setSessions(data.data.sessions || []);
    } catch { console.error('[GroupSessions Admin] fetch failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSessions(); }, [filterStatus]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.sessionDate || !form.timeSlot) {
      setError('Title, date, and time slot are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/group-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, maxCapacity: Number(form.maxCapacity) }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setForm(BLANK_FORM);
        fetchSessions();
      } else {
        setError(data.error || 'Failed to create session.');
      }
    } catch { setError('Network error.'); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this group session?')) return;
    try {
      await fetch(`${apiUrl}/group-sessions/${id}/cancel`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'Cancelled' } : s));
    } catch { console.error('[GroupSessions Admin] cancel failed'); }
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-oceanblue">👥 Group Sessions</h2>
          <p className="text-xs text-oceanblue-900/50 font-semibold mt-0.5">
            Create and manage group recovery sessions for clients.
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(null); }}
          className="px-4 py-2 bg-skyblue hover:bg-skyblue-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          + Create Session
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['All', 'Open', 'Full', 'Completed', 'Cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              filterStatus === s
                ? 'bg-skyblue border-skyblue text-white'
                : 'bg-white border-skyblue-100 text-oceanblue-900/70 hover:bg-skyblue-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-skyblue-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-6 h-6 border-2 border-skyblue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 text-oceanblue-900/40 font-semibold text-sm">
            No sessions found. Create your first group session!
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-skyblue-100 bg-skyblue-50/30">
                <th className="text-left px-6 py-3 text-[10px] font-black text-oceanblue-900/40 uppercase tracking-widest">Session</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-oceanblue-900/40 uppercase tracking-widest">Date / Time</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-oceanblue-900/40 uppercase tracking-widest">Capacity</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-oceanblue-900/40 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const pct = Math.min(100, Math.round((s.members.length / s.maxCapacity) * 100));
                return (
                  <tr key={s.id} className="border-b border-skyblue-50 hover:bg-skyblue-50/20 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-oceanblue-900 leading-snug">{s.title}</p>
                      <p className="text-xs text-oceanblue-900/50 mt-0.5">{s.category} · Host: {s.host?.name || '—'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-bold text-oceanblue-900">{formatDate(s.sessionDate)}</p>
                      <p className="text-xs text-oceanblue-900/60 mt-0.5">{s.timeSlot}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-extrabold text-oceanblue mb-1">{s.members.length} / {s.maxCapacity}</p>
                      <div className="w-20 h-1.5 bg-skyblue-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? 'bg-red-400' : 'bg-skyblue'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${STATUS_BADGE[s.status] || 'bg-slate-100 text-slate-500'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {s.status !== 'Cancelled' && s.status !== 'Completed' && (
                        <button
                          onClick={() => handleCancel(s.id)}
                          className="px-3 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Session Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-skyblue-100 flex justify-between items-center">
              <h3 className="text-base font-black text-oceanblue">Create Group Session</h3>
              <button onClick={() => setShowModal(false)} className="text-oceanblue-900/40 hover:text-oceanblue text-xl font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-semibold p-3 rounded-xl">{error}</div>}

              <div>
                <label className="block text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-1.5">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Monday Morning Mindfulness Group"
                  className="w-full border border-skyblue-100 rounded-xl px-4 py-2.5 text-sm text-oceanblue-900 focus:outline-none focus:border-skyblue bg-skyblue-50/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-skyblue-100 rounded-xl px-4 py-2.5 text-sm text-oceanblue-900 focus:outline-none focus:border-skyblue bg-skyblue-50/30"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-1.5">Max Capacity</label>
                  <input
                    type="number"
                    value={form.maxCapacity}
                    onChange={(e) => setForm({ ...form, maxCapacity: Number(e.target.value) })}
                    min={2} max={50}
                    className="w-full border border-skyblue-100 rounded-xl px-4 py-2.5 text-sm text-oceanblue-900 focus:outline-none focus:border-skyblue bg-skyblue-50/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-1.5">Date *</label>
                  <input
                    type="date"
                    value={form.sessionDate}
                    onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
                    className="w-full border border-skyblue-100 rounded-xl px-4 py-2.5 text-sm text-oceanblue-900 focus:outline-none focus:border-skyblue bg-skyblue-50/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-1.5">Time Slot *</label>
                  <select
                    value={form.timeSlot}
                    onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                    className="w-full border border-skyblue-100 rounded-xl px-4 py-2.5 text-sm text-oceanblue-900 focus:outline-none focus:border-skyblue bg-skyblue-50/30"
                  >
                    {TIME_SLOTS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="What will clients discuss or practice in this session?"
                  className="w-full border border-skyblue-100 rounded-xl px-4 py-2.5 text-sm text-oceanblue-900 focus:outline-none focus:border-skyblue bg-skyblue-50/30 resize-none"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-skyblue-100 text-oceanblue-900/60 rounded-xl text-sm font-bold hover:bg-skyblue-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2.5 bg-skyblue hover:bg-skyblue-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
