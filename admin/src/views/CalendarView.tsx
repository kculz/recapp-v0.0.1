import { useState, useEffect, useCallback } from 'react';
import { type CallPeer, type CallType } from '../utils/call';

interface Client {
  id: number;
  name: string;
  email: string;
}

interface Appointment {
  id: number;
  clientId: number;
  counselorId: number;
  appointmentDate: string;
  timeSlot: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes: string | null;
  createdAt: string;
  Client: Client;
}

interface CalendarViewProps {
  token: string;
  apiUrl: string;
  onStartCall?: (peer: CallPeer, callType: CallType) => void;
}

export default function CalendarView({ token, apiUrl, onStartCall }: CalendarViewProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData: { success?: boolean; error?: string; data?: Appointment[] } = await response.json();
      if (response.ok && resData.success) {
        setAppointments(resData.data ?? []);
      } else {
        throw new Error(resData.error || 'Failed to fetch appointments list.');
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error occurred loading calendar.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchAppointments();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchAppointments]);

  const handleCancel = async (apptId: number) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled session? This action cannot be undone.')) {
      return;
    }

    setCancellingId(apptId);
    try {
      const response = await fetch(`${apiUrl}/appointments/${apptId}/cancel`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const resData: { success?: boolean; error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to cancel appointment.');
      }

      // Refresh list
      await fetchAppointments();
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to cancel appointment.');
    } finally {
      setCancellingId(null);
    }
  };

  const activeAppointments = appointments.filter(a => a.status === 'Scheduled');
  const pastAppointments = appointments.filter(a => a.status !== 'Scheduled');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-oceanblue">Session Scheduler</h2>
        <p className="text-sm text-oceanblue-900/60 leading-relaxed">
          Monitor your scheduled client meetings, update session schedules, and review notes before calls.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {loading && appointments.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-white border border-skyblue-100 rounded-3xl">
          <svg className="animate-spin h-8 w-8 text-skyblue" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-oceanblue-900/50 font-bold">Loading schedule...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Active Schedule list */}
          <div className="xl:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-oceanblue">Upcoming Sessions</h3>
            
            {activeAppointments.length === 0 ? (
              <div className="p-8 text-center text-xs text-oceanblue-900/40 bg-white border border-skyblue-100 border-dashed rounded-3xl font-bold py-12">
                📅 No sessions scheduled. Keep slot availability up to date.
              </div>
            ) : (
              <div className="space-y-4">
                {activeAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="bg-white p-6 rounded-3xl border border-skyblue-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-skyblue-600 bg-skyblue-50 border border-skyblue-100 px-3 py-1 rounded-full">
                          ⏰ {appt.timeSlot}
                        </span>
                        <span className="text-xs font-extrabold text-oceanblue bg-oceanblue-50/50 border border-oceanblue-100/50 px-3 py-1 rounded-full">
                          📆 {new Date(appt.appointmentDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-oceanblue-900">{appt.Client?.name}</h4>
                        <span className="text-[10px] text-oceanblue-900/50 font-semibold font-mono">{appt.Client?.email}</span>
                      </div>
                      {appt.notes && (
                        <p className="text-xs text-oceanblue-900/70 bg-skyblue-50/30 p-3 rounded-xl border border-skyblue-100/50 italic leading-relaxed">
                          "{appt.notes}"
                        </p>
                      )}
                    </div>

                    <div className="w-full md:w-auto flex flex-col gap-3">
                      {onStartCall && (
                        <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                          <button
                            onClick={() => onStartCall({ id: appt.Client.id, name: appt.Client.name, email: appt.Client.email }, 'audio')}
                            className="py-2 px-3 bg-skyblue-50 hover:bg-skyblue text-skyblue hover:text-white rounded-xl transition-colors border border-skyblue-100 text-[11px] font-bold shadow-sm"
                          >
                            📞 Audio
                          </button>
                          <button
                            onClick={() => onStartCall({ id: appt.Client.id, name: appt.Client.name, email: appt.Client.email }, 'video')}
                            className="py-2 px-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl transition-colors border border-indigo-100 text-[11px] font-bold shadow-sm"
                          >
                            📹 Video
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => handleCancel(appt.id)}
                        disabled={cancellingId === appt.id}
                        className="w-full md:w-auto py-2.5 px-4 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-colors border border-red-100 text-xs font-bold shadow-sm"
                      >
                        {cancellingId === appt.id ? 'Cancelling...' : 'Cancel Booking'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past/Cancelled list */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-oceanblue">Session History</h3>
            <div className="bg-white p-6 rounded-3xl border border-skyblue-100 shadow-sm space-y-4">
              {pastAppointments.length === 0 ? (
                <p className="text-xs text-oceanblue-900/40 text-center py-6 font-semibold">No history items record.</p>
              ) : (
                <div className="divide-y divide-skyblue-50 space-y-4">
                  {pastAppointments.slice(0, 10).map((appt) => (
                    <div key={appt.id} className="pt-4 first:pt-0 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-oceanblue-900">{appt.Client?.name}</h4>
                          <span className="text-[9px] text-oceanblue-900/50 font-mono">{new Date(appt.appointmentDate).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                          appt.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-red-50 text-red-50 border-red-100'
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-oceanblue-900/60 block font-semibold">{appt.timeSlot}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
