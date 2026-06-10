import { useState, useEffect } from 'react';

interface Counselor {
  id: number;
  name: string;
  email: string;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  clientType: 'Rehab' | 'Counseling' | null;
  assignedCounselorId: number | null;
  status: 'Pending' | 'Active' | 'Deactivated';
  createdAt: string;
  Counselor?: Counselor | null;
}

interface DirectoryViewProps {
  token: string;
  apiUrl: string;
}

export default function DirectoryView({ token, apiUrl }: DirectoryViewProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal Editing States
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editCounselorId, setEditCounselorId] = useState<string>('');
  const [editClientType, setEditClientType] = useState<'Rehab' | 'Counseling'>('Rehab');
  const [editStatus, setEditStatus] = useState<'Pending' | 'Active' | 'Deactivated'>('Active');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch all users and counselors
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch users
      const usersResponse = await fetch(`${apiUrl}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const usersData = await usersResponse.json();

      // Fetch counselors
      const counselorsResponse = await fetch(`${apiUrl}/appointments/counselors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const counselorsData = await counselorsResponse.json();

      if (usersResponse.ok && usersData.success) {
        setUsers(usersData.data);
      } else {
        throw new Error(usersData.error || 'Failed to fetch user list.');
      }

      if (counselorsResponse.ok && counselorsData.success) {
        setCounselors(counselorsData.data);
      }
    } catch (e: any) {
      setError(e.message || 'Error occurred loading user list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, apiUrl]);

  // Open edit modal for user
  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditCounselorId(user.assignedCounselorId ? user.assignedCounselorId.toString() : '');
    setEditClientType(user.clientType || 'Rehab');
    setEditStatus(user.status);
    setEditError(null);
  };

  // Close modal
  const handleCloseEdit = () => {
    setEditingUser(null);
  };

  // Handle patch submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      const response = await fetch(`${apiUrl}/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          assignedCounselorId: editCounselorId ? parseInt(editCounselorId, 10) : null,
          clientType: editClientType,
          status: editStatus
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to save updates.');
      }

      // Refresh data
      await fetchData();
      handleCloseEdit();
    } catch (err: any) {
      setEditError(err.message || 'Error occurred saving updates.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Filter clients specifically
  const clients = users.filter((u) => u.role === 'Client');

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase());
    const matchesTrack = trackFilter === 'all' || client.clientType === trackFilter;
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesTrack && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-oceanblue">Client Directory</h2>
        <p className="text-sm text-oceanblue-900/60 leading-relaxed">
          Manage program assignments, review counselor pairings, and handle user status activation or deactivations.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-6 rounded-3xl border border-skyblue-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-80 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-oceanblue-900/40 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-skyblue-50/40 border border-skyblue-100 focus:border-skyblue rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold text-oceanblue outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap w-full md:w-auto gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black text-oceanblue-900/40 tracking-wider">Track</span>
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="bg-skyblue-50/40 border border-skyblue-100 rounded-xl px-3 py-2 text-xs font-semibold text-oceanblue outline-none cursor-pointer"
            >
              <option value="all">All Tracks</option>
              <option value="Rehab">Rehabilitation</option>
              <option value="Counseling">Counseling</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black text-oceanblue-900/40 tracking-wider">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-skyblue-50/40 border border-skyblue-100 rounded-xl px-3 py-2 text-xs font-semibold text-oceanblue outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Active">Active</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-semibold flex items-center gap-3">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* Client list Table */}
      <div className="bg-white rounded-3xl border border-skyblue-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-skyblue" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs text-oceanblue-900/50 font-bold">Querying directory...</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-20 text-center text-xs text-oceanblue-900/40 font-bold">
            No clients match the specified search filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-skyblue-50/50 border-b border-skyblue-100/55 text-[10px] font-black text-oceanblue-900 uppercase tracking-wider">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Program Track</th>
                  <th className="py-4 px-6">Assigned Counselor</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Date Added</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-skyblue-100/40 text-xs font-semibold text-oceanblue-900">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-skyblue-50/20 transition-colors">
                    <td className="py-4 px-6 font-bold">{client.name}</td>
                    <td className="py-4 px-6 font-mono text-[11px] text-oceanblue-900/70">{client.email}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                        client.clientType === 'Rehab'
                          ? 'bg-amber-50 text-amber-600 border-amber-100'
                          : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                      }`}>
                        {client.clientType}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {client.Counselor ? (
                        <span className="font-bold text-oceanblue-900">{client.Counselor.name}</span>
                      ) : (
                        <span className="text-oceanblue-900/40 italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                        client.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : client.status === 'Pending'
                          ? 'bg-yellow-50 text-yellow-600 border-yellow-100'
                          : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-oceanblue-900/50">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="py-1.5 px-3 bg-skyblue/10 hover:bg-skyblue text-skyblue hover:text-white rounded-lg transition-colors border border-skyblue/20 text-[11px] font-bold"
                      >
                        ⚙ Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Client Modal Overlay */}
      {editingUser && (
        <div className="fixed inset-0 bg-oceanblue-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-skyblue-100 shadow-2xl p-8 flex flex-col gap-6 relative">
            <button
              onClick={handleCloseEdit}
              className="absolute right-6 top-6 text-oceanblue-900/40 hover:text-oceanblue text-lg font-bold"
            >
              ✕
            </button>

            <div>
              <h3 className="text-lg font-bold text-oceanblue">Manage Client Details</h3>
              <p className="text-xs text-oceanblue-900/50 mt-1 font-semibold">
                Editing: <span className="text-oceanblue font-bold">{editingUser.name}</span> ({editingUser.email})
              </p>
            </div>

            {editError && (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-semibold">
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-oceanblue-900 mb-2 uppercase tracking-wider">
                  Program Track (Client Type)
                </label>
                <select
                  value={editClientType}
                  onChange={(e) => setEditClientType(e.target.value as 'Rehab' | 'Counseling')}
                  className="w-full bg-skyblue-50/40 border border-skyblue-100 focus:border-skyblue rounded-2xl py-3 px-4 text-sm font-semibold text-oceanblue outline-none cursor-pointer"
                >
                  <option value="Rehab">Rehabilitation</option>
                  <option value="Counseling">Counseling</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-oceanblue-900 mb-2 uppercase tracking-wider">
                  Assign Counselor
                </label>
                <select
                  value={editCounselorId}
                  onChange={(e) => setEditCounselorId(e.target.value)}
                  className="w-full bg-skyblue-50/40 border border-skyblue-100 focus:border-skyblue rounded-2xl py-3 px-4 text-sm font-semibold text-oceanblue outline-none cursor-pointer"
                >
                  <option value="">-- No Counselor Assigned --</option>
                  {counselors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-oceanblue-900 mb-2 uppercase tracking-wider">
                  User Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-skyblue-50/40 border border-skyblue-100 focus:border-skyblue rounded-2xl py-3 px-4 text-sm font-semibold text-oceanblue outline-none cursor-pointer"
                >
                  <option value="Pending">Pending Invitation</option>
                  <option value="Active">Active Account</option>
                  <option value="Deactivated">Deactivated (Blocks Access)</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4 border-t border-skyblue-50">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className={`flex-1 py-3 px-6 bg-skyblue hover:bg-skyblue-600 text-white font-bold rounded-2xl shadow-md transition-colors flex items-center justify-center ${
                    editSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {editSubmitting ? 'Saving changes...' : 'Save Configuration'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="py-3 px-6 bg-skyblue-50 hover:bg-skyblue-100 text-oceanblue font-bold rounded-2xl transition-colors border border-skyblue-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
