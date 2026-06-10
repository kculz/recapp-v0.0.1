import React, { useCallback, useEffect, useState } from 'react';
import * as Device from 'expo-device';
import { Platform, ScrollView, View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { AnimatedIcon } from '@/components/animated-icon';
import { WebBadge } from '@/components/web-badge';
import { getAppointmentStatusMeta, isUpcomingAppointment, type AppointmentStatus } from '@/utils/appointments';

interface Appointment {
  id: number;
  appointmentDate: string;
  timeSlot: string;
  status: AppointmentStatus;
  notes?: string;
  Counselor: {
    id: number;
    name: string;
    email: string;
  };
}

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <Text className="text-xs text-oceanblue-900/70">use browser devtools</Text>;
  }
  if (Device.isDevice) {
    return (
      <Text className="text-xs text-oceanblue-900/70">
        shake device or press <Text className="font-mono bg-skyblue-100 px-1 rounded text-oceanblue">m</Text> in terminal
      </Text>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <Text className="text-xs text-oceanblue-900/70">
      press <Text className="font-mono bg-skyblue-100 px-1 rounded text-oceanblue">{shortcut}</Text>
    </Text>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, userToken, apiUrl, signOut } = useAuth();
  const socket = useSocket();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);

  // Active goal for progress widget
  const [activeGoal, setActiveGoal] = useState<{
    id: number; title: string; category: string;
    milestones: { isCompleted: boolean }[];
    isCompleted: boolean;
  } | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!userToken) return;
    setLoadingAppts(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${apiUrl}/appointments`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        setAppointments(resData.data);
      } else {
        setErrorMsg(resData.error || 'Failed to load appointments.');
      }
    } catch {
      setErrorMsg('Network error. Check server status.');
    } finally {
      setLoadingAppts(false);
    }
  }, [apiUrl, userToken]);

  const fetchUnreadCount = useCallback(async () => {
    if (!userToken) return;
    try {
      const response = await fetch(`${apiUrl}/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const resData = await response.json();
      if (response.ok && resData.success && Array.isArray(resData.data)) {
        let sum = 0;
        resData.data.forEach((c: any) => {
          sum += c.unreadCount || 0;
        });
        setUnreadCount(sum);
      }
    } catch (e) {
      console.log('Failed to fetch unread messages counts:', e);
    }
  }, [apiUrl, userToken]);

  const fetchActiveGoal = useCallback(async () => {
    if (!userToken) return;
    try {
      const res = await fetch(`${apiUrl}/progress/goals`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        const first = data.data.find((g: any) => !g.isCompleted) || data.data[0] || null;
        setActiveGoal(first);
      }
    } catch {
      // silently ignore — widget is non-critical
    }
  }, [apiUrl, userToken]);

  const loadDashboardData = useCallback(async () => {
    await Promise.all([fetchAppointments(), fetchUnreadCount(), fetchActiveGoal()]);
  }, [fetchActiveGoal, fetchAppointments, fetchUnreadCount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDashboardData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadDashboardData]);

  useEffect(() => {
    if (!socket || !user) {
      return undefined;
    }

    const handleAppointmentUpdate = (payload: any) => {
      if (payload?.clientId && payload.clientId !== user.id) {
        return;
      }

      if (!payload?.id) {
        return;
      }

      setAppointments((previous) => {
        const nextAppointment = payload as Appointment;
        const nextAppointments = previous.some((appointment) => appointment.id === payload.id)
          ? previous.map((appointment) => (appointment.id === payload.id ? nextAppointment : appointment))
          : [nextAppointment, ...previous];
        return nextAppointments;
      });

      const statusMessage =
        payload.action === 'approved'
          ? 'Your booking was approved.'
          : payload.action === 'rejected'
            ? 'Your booking was rejected.'
            : payload.action === 'cancelled'
              ? 'An appointment was cancelled.'
              : payload.message || 'Your booking was updated.';

      setLiveNotice(statusMessage);
    };

    socket.on('appointment:update', handleAppointmentUpdate);

    return () => {
      socket.off('appointment:update', handleAppointmentUpdate);
    };
  }, [socket, user]);

  useEffect(() => {
    if (!liveNotice) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setLiveNotice(null);
    }, 6000);

    return () => clearTimeout(timer);
  }, [liveNotice]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleCancelAppointment = async (apptId: number) => {
    if (!userToken) return;
    setCancellingId(apptId);
    try {
      const response = await fetch(`${apiUrl}/appointments/${apptId}/cancel`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        setAppointments(prev =>
          prev.map(appt =>
            appt.id === apptId ? { ...appt, status: 'Cancelled' } : appt
          )
        );
      } else {
        alert(resData.error || 'Failed to cancel appointment.');
      }
    } catch {
      alert('Network error. Failed to cancel session.');
    } finally {
      setCancellingId(null);
    }
  };

  const upcomingAppointments = appointments.filter((appt) => isUpcomingAppointment(appt.status));
  const hasCounselor = !!user?.assignedCounselorId;

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />
          }
        >
          {/* Header Card */}
          <View className="bg-oceanblue p-6 rounded-b-3xl shadow-md items-center justify-center gap-y-4">
            <View className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-inner">
              <AnimatedIcon />
            </View>
            <Text className="text-3xl font-extrabold text-white text-center tracking-tight">
              RecApp Client Portal
            </Text>
            <Text className="text-sm font-medium text-skyblue-100 text-center max-w-xs">
              Welcome back, {user?.name || 'User'}!
            </Text>
          </View>

          {/* Body Section */}
          <View className="p-6 gap-y-6">
            {liveNotice ? (
              <View className="bg-violet-50 border border-violet-100 p-4 rounded-2xl">
                <Text className="text-violet-700 text-sm font-semibold">{liveNotice}</Text>
              </View>
            ) : null}
            
            {/* Upcoming Appointments Widget */}
            <View className="bg-white p-5 rounded-2xl shadow-sm border border-skyblue-100">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-bold text-oceanblue">Counseling Sessions</Text>
                <Pressable
                  onPress={() => router.push('/(app)/book-session')}
                  className="bg-skyblue active:bg-skyblue-600 px-3.5 py-1.5 rounded-xl"
                >
                  <Text className="text-white text-xs font-bold">Book New</Text>
                </Pressable>
              </View>

              {errorMsg && (
                <Text className="text-xs text-red-500 font-medium my-1">{errorMsg}</Text>
              )}

              {loadingAppts && appointments.length === 0 ? (
                <ActivityIndicator size="small" color="#0ea5e9" className="py-6" />
              ) : upcomingAppointments.length === 0 ? (
                <View className="py-6 items-center">
                  <Text className="text-sm text-oceanblue-900/60 font-semibold text-center">
                    No upcoming sessions scheduled.
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(app)/book-session')}
                    className="mt-3 bg-skyblue-50 active:bg-skyblue-100 border border-skyblue-100 px-4 py-2 rounded-xl"
                  >
                    <Text className="text-skyblue font-bold text-xs">Schedule First Session</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="gap-y-3 mt-1">
                  {upcomingAppointments.map((appt) => (
                    <View
                      key={appt.id}
                      className="bg-skyblue-50/20 border border-skyblue-100 p-4 rounded-xl flex-row justify-between items-center"
                    >
                      <View className="flex-1 pr-3">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="font-bold text-oceanblue-900">{appt.Counselor.name}</Text>
                          <Text className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${getAppointmentStatusMeta(appt.status).tone}`}>
                            {getAppointmentStatusMeta(appt.status).label}
                          </Text>
                        </View>
                        <Text className="text-xs text-oceanblue-900/70 mt-1 font-semibold">
                          📅 {appt.appointmentDate}
                        </Text>
                        <Text className="text-xs text-oceanblue-900/70 mt-0.5 font-semibold">
                          ⏰ {appt.timeSlot}
                        </Text>
                      </View>
                      
                      <Pressable
                        onPress={() => handleCancelAppointment(appt.id)}
                        disabled={cancellingId === appt.id}
                        className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg active:bg-rose-100"
                      >
                        {cancellingId === appt.id ? (
                          <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                          <Text className="text-rose-600 font-bold text-[10px] uppercase">Cancel</Text>
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Progress Widget */}
            {activeGoal && (() => {
              const total = activeGoal.milestones.length;
              const done = activeGoal.milestones.filter((m) => m.isCompleted).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : activeGoal.isCompleted ? 100 : 0;
              return (
                <Pressable
                  onPress={() => router.push('/(app)/(tabs)/progress' as any)}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-skyblue-100 active:opacity-90"
                >
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-lg font-bold text-oceanblue">Active Goal 🎯</Text>
                    <Text className="text-xs font-bold text-skyblue">View all →</Text>
                  </View>
                  <Text className="text-sm font-bold text-oceanblue-900 mb-3" numberOfLines={2}>
                    {activeGoal.title}
                  </Text>
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-[10px] font-bold text-oceanblue-900/50 uppercase tracking-wider">Progress</Text>
                    <Text className="text-[10px] font-extrabold text-oceanblue">
                      {total > 0 ? `${done}/${total} milestones` : `${pct}%`}
                    </Text>
                  </View>
                  <View className="h-2.5 bg-skyblue-100 rounded-full overflow-hidden">
                    <View className="h-full bg-skyblue rounded-full" style={{ width: `${pct}%` }} />
                  </View>
                </Pressable>
              );
            })()}

            {/* Counselor Chat Widget */}
            <View className="bg-white p-5 rounded-2xl shadow-sm border border-skyblue-100 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-oceanblue mb-1">Direct Messaging</Text>
                {hasCounselor ? (
                  <Text className="text-xs text-oceanblue-900/60 font-medium">
                    Continuous 1-to-1 support line with your counselor.
                  </Text>
                ) : (
                  <Text className="text-xs text-oceanblue-900/40 italic font-medium">
                    Awaiting counselor assignment.
                  </Text>
                )}
              </View>

              <Pressable
                onPress={() => router.push('/(app)/chat')}
                className="bg-oceanblue active:bg-oceanblue-900 px-4 py-2.5 rounded-xl flex-row items-center gap-x-2"
              >
                <Text className="text-white text-xs font-bold">Open Chat</Text>
                {unreadCount > 0 && (
                  <View className="bg-red-500 rounded-full px-2 py-0.5">
                    <Text className="text-white text-[10px] font-extrabold">{unreadCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* User Profile Card */}
            <View className="bg-white p-5 rounded-2xl shadow-sm border border-skyblue-100">
              <Text className="text-lg font-bold text-oceanblue mb-3">
                Your Profile Details
              </Text>
              <View className="gap-y-2 mb-4">
                <View className="flex-row justify-between border-b border-skyblue-50 pb-2">
                  <Text className="text-sm font-medium text-oceanblue-900/70">Name</Text>
                  <Text className="text-sm font-bold text-oceanblue-900">{user?.name}</Text>
                </View>
                <View className="flex-row justify-between border-b border-skyblue-50 pb-2">
                  <Text className="text-sm font-medium text-oceanblue-900/70">Email</Text>
                  <Text className="text-sm font-bold text-oceanblue-900">{user?.email}</Text>
                </View>
                <View className="flex-row justify-between border-b border-skyblue-50 pb-2">
                  <Text className="text-sm font-medium text-oceanblue-900/70">Role</Text>
                  <Text className="text-sm font-bold text-skyblue bg-skyblue-50 px-2 py-0.5 rounded-full">{user?.role}</Text>
                </View>
                {user?.clientType && (
                  <View className="flex-row justify-between pb-1">
                    <Text className="text-sm font-medium text-oceanblue-900/70">Program Type</Text>
                    <Text className="text-sm font-bold text-oceanblue">{user?.clientType}</Text>
                  </View>
                )}
              </View>

              <Pressable
                onPress={() => signOut()}
                className="bg-red-500 active:bg-red-600 p-3 rounded-xl items-center justify-center shadow-sm"
              >
                <Text className="text-white font-bold text-base">Sign Out</Text>
              </Pressable>
            </View>

            {/* Quick Action Cards */}
            <View className="bg-white p-5 rounded-2xl shadow-sm border border-skyblue-100">
              <Text className="text-lg font-bold text-oceanblue mb-2">
                Active Theme Palette
              </Text>
              <View className="flex-row gap-x-3 mt-2">
                <View className="flex-1 items-center p-3 rounded-xl bg-skyblue-100 border border-skyblue-200">
                  <View className="w-8 h-8 rounded-full bg-skyblue" />
                  <Text className="text-xs font-semibold text-oceanblue-900 mt-2">Sky Blue</Text>
                </View>
                <View className="flex-1 items-center p-3 rounded-xl bg-white border border-skyblue-100 shadow-xs">
                  <View className="w-8 h-8 rounded-full bg-white border border-skyblue-200" />
                  <Text className="text-xs font-semibold text-oceanblue-900 mt-2">White</Text>
                </View>
                <View className="flex-1 items-center p-3 rounded-xl bg-oceanblue/10 border border-oceanblue/20">
                  <View className="w-8 h-8 rounded-full bg-oceanblue" />
                  <Text className="text-xs font-semibold text-oceanblue mt-2">Scale Blue</Text>
                </View>
              </View>
            </View>

            {/* Development Hints */}
            <View className="bg-white p-5 rounded-2xl shadow-sm border border-skyblue-100 gap-y-4">
              <Text className="text-lg font-bold text-oceanblue">
                Getting Started
              </Text>
              
              <View className="gap-y-3">
                <View className="border-b border-skyblue-50 pb-2">
                  <Text className="text-xs font-bold text-oceanblue-900 uppercase tracking-wide">Current Page</Text>
                  <Text className="text-sm text-oceanblue/85 font-mono mt-1 bg-skyblue-50 p-2 rounded">src/app/(app)/(tabs)/index.tsx</Text>
                </View>

                <View className="border-b border-skyblue-50 pb-2">
                  <Text className="text-xs font-bold text-oceanblue-900 uppercase tracking-wide">Developer Menu</Text>
                  <View className="mt-1">{getDevMenuHint()}</View>
                </View>
              </View>
            </View>

            {Platform.OS === 'web' && (
              <View className="items-center mt-2">
                <WebBadge />
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
