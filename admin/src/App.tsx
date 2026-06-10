import { useCallback, useEffect, useRef, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import AdminShell from './components/AdminShell';
import CallOverlay from './components/CallOverlay';
import CalendarPage from './pages/CalendarPage';
import CrisisPage from './pages/CrisisPage';
import DirectoryPage from './pages/DirectoryPage';
import GroupSessionsPage from './pages/GroupSessionsPage';
import IntakePage from './pages/IntakePage';
import LibraryPage from './pages/LibraryPage';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import {
  ADMIN_ROUTE_PATHS,
  getDefaultAdminRoute,
  type AdminUser,
  type OverviewStats,
} from './utils/admin';
import { createCallRoomId, type CallPeer, type CallSession, type CallType } from './utils/call';

const API_URL = 'http://localhost:5001/api/v1';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('adminToken'));
  const [user, setUser] = useState<AdminUser | null>(() => {
    const savedUser = localStorage.getItem('adminUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [stats, setStats] = useState<OverviewStats>({
    totalClients: 0,
    totalCounselors: 0,
    pendingInvites: 0,
    activeAlerts: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [isJoiningCall, setIsJoiningCall] = useState(false);

  const currentCallRef = useRef<CallSession | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const authenticatedUser = token && user ? user : null;
  const defaultRoute = authenticatedUser ? getDefaultAdminRoute(authenticatedUser.role) : ADMIN_ROUTE_PATHS.login;

  const clearCurrentCall = useCallback(() => {
    currentCallRef.current = null;
    setCurrentCall(null);
    setIsJoiningCall(false);
  }, []);

  const handleLoginSuccess = useCallback((newToken: string, newUser: AdminUser) => {
    localStorage.setItem('adminToken', newToken);
    localStorage.setItem('adminUser', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    clearCurrentCall();
    setToken(null);
    setUser(null);
  }, [clearCurrentCall]);

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  const fetchOverviewStats = useCallback(async () => {
    if (!token || !authenticatedUser) {
      return;
    }

    setLoadingStats(true);

    try {
      const usersResponse = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersResponse.json();

      const alertsResponse = await fetch(`${API_URL}/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const alertsData = await alertsResponse.json();

      if (usersResponse.ok && usersData.success) {
        const userList: Array<{ role?: string; status?: string }> = Array.isArray(usersData.data)
          ? usersData.data
          : [];
        const clientsCount = userList.filter((entry) => entry.role === 'Client').length;
        const counselorsCount = userList.filter((entry) => entry.role === 'Counselor').length;
        const pendingCount = userList.filter((entry) => entry.status === 'Pending').length;

        let alertsCount = 0;
        if (alertsResponse.ok && alertsData.success) {
          const { posts, comments, messages } = alertsData.data;
          alertsCount = posts.length + comments.length + messages.length;
        }

        setStats({
          totalClients: clientsCount,
          totalCounselors: counselorsCount,
          pendingInvites: pendingCount,
          activeAlerts: alertsCount,
        });
      }
    } catch (error) {
      console.error('Failed to load overview statistics:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [token, authenticatedUser]);

  useEffect(() => {
    if (!authenticatedUser) {
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchOverviewStats();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [authenticatedUser, fetchOverviewStats]);

  const startCall = useCallback(
    async (peer: CallPeer, callType: CallType) => {
      if (!token || !authenticatedUser || !socketRef.current || !socketRef.current.connected) {
        alert('Call unavailable right now.');
        return;
      }

      if (currentCallRef.current) {
        alert('Finish the current call before starting another one.');
        return;
      }

      const call: CallSession = {
        roomId: createCallRoomId(authenticatedUser.id, peer.id),
        callType,
        peerId: peer.id,
        peerName: peer.name,
        peerEmail: peer.email,
        recipientId: peer.id,
        recipientName: peer.name,
        callerId: authenticatedUser.id,
        callerName: authenticatedUser.name,
        callerEmail: authenticatedUser.email,
        direction: 'outgoing',
        status: 'ringing',
        createdAt: new Date().toISOString(),
      };

      currentCallRef.current = call;
      setCurrentCall(call);

      const ack = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        socketRef.current?.emit(
          'call:invite',
          {
            roomId: call.roomId,
            callType: call.callType,
            recipientId: peer.id,
            recipientName: peer.name,
          },
          (response: { success: boolean; error?: string }) => resolve(response)
        );
      });

      if (!ack.success) {
        alert(ack.error || 'Unable to start the call.');
        clearCurrentCall();
      }
    },
    [authenticatedUser, clearCurrentCall, token]
  );

  const acceptCurrentCall = useCallback(async () => {
    const call = currentCallRef.current;

    if (!call || call.direction !== 'incoming' || !socketRef.current || !socketRef.current.connected) {
      return;
    }

    setIsJoiningCall(true);

    const ack = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      socketRef.current?.emit(
        'call:accept',
        { roomId: call.roomId },
        (response: { success: boolean; error?: string }) => resolve(response)
      );
    });

    if (!ack.success) {
      alert(ack.error || 'Unable to accept the call.');
      clearCurrentCall();
      return;
    }

    const acceptedCall: CallSession = {
      ...call,
      status: 'accepted',
    };

    currentCallRef.current = acceptedCall;
    setCurrentCall(acceptedCall);
    setIsJoiningCall(false);
  }, [clearCurrentCall]);

  const declineCurrentCall = useCallback(() => {
    const call = currentCallRef.current;

    if (!call || !socketRef.current || !socketRef.current.connected) {
      clearCurrentCall();
      return;
    }

    socketRef.current.emit('call:decline', {
      roomId: call.roomId,
      reason: 'declined',
    });
    clearCurrentCall();
  }, [clearCurrentCall]);

  const endCurrentCall = useCallback(() => {
    const call = currentCallRef.current;

    if (!call || !socketRef.current || !socketRef.current.connected) {
      clearCurrentCall();
      return;
    }

    socketRef.current.emit('call:end', {
      roomId: call.roomId,
      reason: 'ended',
    });
    clearCurrentCall();
  }, [clearCurrentCall]);

  useEffect(() => {
    if (!token || !authenticatedUser) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const serverRoot = API_URL.replace('/api/v1', '');
    const socket = io(serverRoot, {
      transports: ['websocket'],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Admin Socket] Connected. ID:', socket.id);
    });

    socket.on('crisis_alert', (payload: { userId: number; type: string; text: string }) => {
      console.warn('[Admin Socket] Crisis alert received:', payload);

      setStats((previous) => ({ ...previous, activeAlerts: previous.activeAlerts + 1 }));

      if (typeof window !== 'undefined' && 'Notification' in window) {
        const notify = () => {
          new Notification('🚨 Crisis Alert', {
            body: `Flagged ${payload.type} from user #${payload.userId}: "${payload.text.slice(0, 80)}..."`,
            icon: '/favicon.ico',
          });
        };

        if (Notification.permission === 'granted') {
          notify();
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              notify();
            }
          });
        }
      }
    });

    socket.on('call:incoming', (call: CallSession) => {
      if (call.recipientId !== authenticatedUser.id) {
        return;
      }

      if (currentCallRef.current) {
        socket.emit('call:decline', {
          roomId: call.roomId,
          reason: 'busy',
        });
        return;
      }

      const incomingCall: CallSession = {
        ...call,
        peerId: call.callerId,
        peerName: call.callerName,
        peerEmail: call.callerEmail,
        direction: 'incoming',
        status: 'ringing',
      };

      currentCallRef.current = incomingCall;
      setCurrentCall(incomingCall);
    });

    socket.on('call:accepted', (call: CallSession) => {
      const activeCall = currentCallRef.current;

      if (!activeCall || activeCall.roomId !== call.roomId) {
        return;
      }

      const acceptedCall: CallSession = {
        ...activeCall,
        status: 'accepted',
      };

      currentCallRef.current = acceptedCall;
      setCurrentCall(acceptedCall);
    });

    socket.on('call:declined', (call: CallSession & { declinedByName?: string }) => {
      if (currentCallRef.current?.roomId !== call.roomId) {
        return;
      }

      alert(`${call.declinedByName || call.peerName || 'The other participant'} declined the call.`);
      clearCurrentCall();
    });

    socket.on('call:ended', (call: CallSession & { endedByName?: string; reason?: string }) => {
      if (currentCallRef.current?.roomId !== call.roomId) {
        return;
      }

      clearCurrentCall();
    });

    socket.on('disconnect', (reason) => {
      console.log('[Admin Socket] Disconnected:', reason);
      clearCurrentCall();
    });

    return () => {
      socket.off('connect');
      socket.off('crisis_alert');
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:declined');
      socket.off('call:ended');
      socket.off('disconnect');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authenticatedUser, clearCurrentCall, token]);

  return (
    <HashRouter>
      <Routes>
        {authenticatedUser ? (
          <>
            <Route path={ADMIN_ROUTE_PATHS.login} element={<Navigate to={defaultRoute} replace />} />
            <Route
              element={
                <AdminShell
                  role={authenticatedUser.role}
                  userName={authenticatedUser.name}
                  onLogout={handleLogout}
                  onRefreshStats={fetchOverviewStats}
                  loadingStats={loadingStats}
                />
              }
            >
              <Route index element={<Navigate to={defaultRoute} replace />} />
              <Route path={ADMIN_ROUTE_PATHS.overview} element={<OverviewPage user={authenticatedUser} stats={stats} />} />
              <Route path={ADMIN_ROUTE_PATHS.intake} element={<IntakePage token={token!} apiUrl={API_URL} />} />
              <Route path={ADMIN_ROUTE_PATHS.directory} element={<DirectoryPage token={token!} apiUrl={API_URL} />} />
              <Route
                path={ADMIN_ROUTE_PATHS.calendar}
                element={<CalendarPage token={token!} apiUrl={API_URL} onStartCall={startCall} />}
              />
              <Route path={ADMIN_ROUTE_PATHS.library} element={<LibraryPage token={token!} apiUrl={API_URL} />} />
              <Route path={ADMIN_ROUTE_PATHS.groupSessions} element={<GroupSessionsPage token={token!} apiUrl={API_URL} />} />
              <Route path={ADMIN_ROUTE_PATHS.crisis} element={<CrisisPage token={token!} apiUrl={API_URL} />} />
            </Route>
            <Route path="*" element={<Navigate to={defaultRoute} replace />} />
          </>
        ) : (
          <>
            <Route path={ADMIN_ROUTE_PATHS.login} element={<LoginPage onLoginSuccess={handleLoginSuccess} apiUrl={API_URL} />} />
            <Route path="*" element={<Navigate to={ADMIN_ROUTE_PATHS.login} replace />} />
          </>
        )}
      </Routes>

      <CallOverlay
        currentCall={currentCall}
        isJoiningCall={isJoiningCall}
        onAcceptCall={acceptCurrentCall}
        onDeclineCall={declineCurrentCall}
        onEndCall={endCurrentCall}
      />
    </HashRouter>
  );
}
