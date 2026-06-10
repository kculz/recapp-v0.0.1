import { useState, useEffect } from 'react';

interface Counselor {
  id: number;
  name: string;
  email: string;
}

interface IntakeViewProps {
  token: string;
  apiUrl: string;
}

export default function IntakeView({ token, apiUrl }: IntakeViewProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [clientType, setClientType] = useState<'Rehab' | 'Counseling'>('Rehab');
  const [assignedCounselorId, setAssignedCounselorId] = useState<string>('');
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loadingCounselors, setLoadingCounselors] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<{
    email: string;
    activationToken: string;
  } | null>(null);

  // Fetch counselors list on mount
  useEffect(() => {
    const fetchCounselors = async () => {
      setLoadingCounselors(true);
      try {
        const response = await fetch(`${apiUrl}/appointments/counselors`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const resData = await response.json();
        if (response.ok && resData.success) {
          setCounselors(resData.data);
          if (resData.data.length > 0) {
            setAssignedCounselorId(resData.data[0].id.toString());
          }
        }
      } catch (e) {
        console.error('Failed to load counselors:', e);
      } finally {
        setLoadingCounselors(false);
      }
    };

    fetchCounselors();
  }, [token, apiUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError('Please fill in Name and Email fields.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    setCreatedInvite(null);

    try {
      const response = await fetch(`${apiUrl}/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          email,
          role: 'Client',
          clientType,
          assignedCounselorId: assignedCounselorId ? parseInt(assignedCounselorId, 10) : null
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to submit invitation.');
      }

      setSuccessMsg('Client invitation generated successfully!');
      if (resData.data && resData.data.activationToken) {
        setCreatedInvite({
          email: resData.data.email,
          activationToken: resData.data.activationToken
        });
      }

      // Reset form fields
      setName('');
      setEmail('');
    } catch (e: any) {
      setError(e.message || 'Intake registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* View Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-oceanblue">Client Intake Panel</h2>
        <p className="text-sm text-oceanblue-900/60 leading-relaxed">
          Invite new individuals into the system. An email invitation containing the activation link will be dispatched automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Invite Form */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-skyblue-100 shadow-sm flex flex-col gap-6">
          <h3 className="text-lg font-bold text-oceanblue mb-2">Generate Client Invitation</h3>
          
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-semibold flex items-start gap-3">
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl p-4 text-xs font-semibold flex items-start gap-3">
              <span>✓</span>
              <div>{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-oceanblue-900 mb-2 uppercase tracking-wider">
                  Client Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Miller"
                  className="w-full bg-skyblue-50/30 border border-skyblue-100 focus:border-skyblue rounded-2xl py-3 px-4 text-sm font-semibold text-oceanblue outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-oceanblue-900 mb-2 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.miller@example.com"
                  className="w-full bg-skyblue-50/30 border border-skyblue-100 focus:border-skyblue rounded-2xl py-3 px-4 text-sm font-semibold text-oceanblue outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-oceanblue-900 mb-2 uppercase tracking-wider">
                  Program Track (Client Type)
                </label>
                <select
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value as 'Rehab' | 'Counseling')}
                  className="w-full bg-skyblue-50/30 border border-skyblue-100 focus:border-skyblue rounded-2xl py-3 px-4 text-sm font-semibold text-oceanblue outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="Rehab">Rehabilitation Program Client</option>
                  <option value="Counseling">Counseling Support Client</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-oceanblue-900 mb-2 uppercase tracking-wider">
                  Assigned primary Counselor
                </label>
                {loadingCounselors ? (
                  <div className="py-3 px-4 text-xs font-semibold text-oceanblue-900/40">Loading directory...</div>
                ) : (
                  <select
                    value={assignedCounselorId}
                    onChange={(e) => setAssignedCounselorId(e.target.value)}
                    className="w-full bg-skyblue-50/30 border border-skyblue-100 focus:border-skyblue rounded-2xl py-3 px-4 text-sm font-semibold text-oceanblue outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">-- Select Counselor --</option>
                    {counselors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`py-3.5 px-6 bg-skyblue hover:bg-skyblue-600 text-white font-bold rounded-2xl shadow-md transition-all self-start flex items-center justify-center gap-2 mt-2 ${
                submitting ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? 'Creating Invitation...' : 'Send System Invitation'}
            </button>
          </form>
        </div>

        {/* Development Token Helper Panel */}
        <div className="bg-gradient-to-br from-oceanblue to-skyblue-700 text-white p-8 rounded-3xl shadow-md flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Dev Flow Helper</h3>
            <p className="text-xs text-skyblue-100/90 leading-relaxed">
              When working in local development environments, invitations are written to the database. You can capture the token right here to test account activation on the mobile app or web portal without checking raw email outputs.
            </p>
          </div>

          {createdInvite ? (
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-3">
              <span className="text-[10px] text-skyblue-200 uppercase font-black tracking-wider block">
                Last Generated Invite
              </span>
              <div className="text-xs break-all font-mono">
                <span className="font-bold text-skyblue-100">User:</span> {createdInvite.email}<br/>
                <span className="font-bold text-skyblue-100">Token:</span> {createdInvite.activationToken}
              </div>
              <div className="bg-white/10 p-2 rounded-xl text-[10px] font-semibold flex items-center gap-2">
                <span>🔗</span>
                <span className="truncate">Token can be used to set password</span>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-white/10 border-dashed text-center text-xs text-skyblue-200/60 font-semibold py-8">
              Generate an invitation to display activation link
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
