import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StaffPageHeader from '@/components/staff-page-header';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { isAdminRole } from '@/utils/auth-routing';
import {
  getAppointmentStatusMeta,
  isReviewableAppointment,
  type AppointmentStatus,
} from '@/utils/appointments';

interface AppointmentRecord {
  id: number;
  appointmentDate: string;
  timeSlot: string;
  status: AppointmentStatus;
  notes?: string | null;
  action?: 'created' | 'approved' | 'rejected' | 'cancelled';
  message?: string;
  Client?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  Counselor?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

const STATUS_FILTERS: ('All' | AppointmentStatus)[] = [
  'All',
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
  'Completed',
];

const sortAppointments = (records: AppointmentRecord[]) =>
  [...records].sort((left, right) => {
    const leftDate = new Date(`${left.appointmentDate}T00:00:00`).getTime();
    const rightDate = new Date(`${right.appointmentDate}T00:00:00`).getTime();
    if (leftDate !== rightDate) {
      return rightDate - leftDate;
    }
    return right.id - left.id;
  });

export default function StaffBookingsScreen() {
  const router = useRouter();
  const socket = useSocket();
  const { userToken, apiUrl, user } = useAuth();

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'All' | AppointmentStatus>('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdmin = isAdminRole(user?.role);

  const loadAppointments = useCallback(async () => {
    if (!userToken) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${apiUrl}/appointments`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setAppointments(sortAppointments(Array.isArray(data.data) ? data.data : []));
      } else {
        setErrorMsg(data.error || 'Failed to load bookings.');
      }
    } catch {
      setErrorMsg('Network error. Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, userToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAppointments();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadAppointments]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleBookingEvent = (payload: AppointmentRecord) => {
      if (!payload?.id) {
        return;
      }

      setAppointments((previous) =>
        sortAppointments([payload, ...previous.filter((item) => item.id !== payload.id)])
      );
      setBannerMessage(payload.message || 'Booking update received.');
    };

    socket.on('booking:new', handleBookingEvent);
    socket.on('booking:update', handleBookingEvent);

    return () => {
      socket.off('booking:new', handleBookingEvent);
      socket.off('booking:update', handleBookingEvent);
    };
  }, [socket]);

  const filteredAppointments = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const normalizedStatus = appointment.status === 'Scheduled' ? 'Pending' : appointment.status;
      const matchesFilter = selectedFilter === 'All' || normalizedStatus === selectedFilter;
      const searchable = [
        appointment.Client?.name,
        appointment.Client?.email,
        appointment.Counselor?.name,
        appointment.Counselor?.email,
        appointment.notes,
        appointment.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !normalized || searchable.includes(normalized);
      return matchesFilter && matchesSearch;
    });
  }, [appointments, searchTerm, selectedFilter]);

  const pendingCount = useMemo(
    () => appointments.filter((appointment) => isReviewableAppointment(appointment.status)).length,
    [appointments]
  );

  const approveAppointment = async (appointmentId: number) => {
    if (!userToken) return;

    setActingId(appointmentId);

    try {
      const response = await fetch(`${apiUrl}/appointments/${appointmentId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setAppointments((previous) =>
          sortAppointments(
            previous.map((appointment) =>
              appointment.id === appointmentId ? data.data : appointment
            )
          )
        );
        setBannerMessage(data.message || 'Booking approved.');
      } else {
        Alert.alert('Approval failed', data.error || 'Could not approve the booking.');
      }
    } catch {
      Alert.alert('Approval failed', 'Network error. Could not approve the booking.');
    } finally {
      setActingId(null);
    }
  };

  const rejectAppointment = async (appointmentId: number) => {
    if (!userToken) return;

    setActingId(appointmentId);

    try {
      const response = await fetch(`${apiUrl}/appointments/${appointmentId}/reject`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setAppointments((previous) =>
          sortAppointments(
            previous.map((appointment) =>
              appointment.id === appointmentId ? data.data : appointment
            )
          )
        );
        setBannerMessage(data.message || 'Booking rejected.');
      } else {
        Alert.alert('Rejection failed', data.error || 'Could not reject the booking.');
      }
    } catch {
      Alert.alert('Rejection failed', 'Network error. Could not reject the booking.');
    } finally {
      setActingId(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <StaffPageHeader
          title="Bookings"
          subtitle={isAdmin ? 'Approve or reject appointment requests' : 'Your assigned bookings'}
          onBack={() => router.replace('/(staff)/dashboard')}
          rightAction={
            <Pressable
              onPress={() => void onRefresh()}
              className="px-3 py-2 rounded-xl bg-white/15 active:opacity-80"
            >
              <Text className="text-white text-xs font-extrabold">Refresh</Text>
            </Pressable>
          }
        />

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />}
        >
          {bannerMessage ? (
            <View className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <Text className="text-sm font-semibold text-emerald-700">{bannerMessage}</Text>
            </View>
          ) : null}

          {errorMsg ? (
            <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
              <Text className="text-sm font-semibold text-red-700">{errorMsg}</Text>
            </View>
          ) : null}

          <View className="rounded-3xl border border-skyblue-100 bg-white p-5 shadow-sm">
            <Text className="text-lg font-extrabold text-oceanblue">Booking queue</Text>
            <Text className="text-xs text-oceanblue-900/55 mt-1">
              {isAdmin
                ? `You have ${pendingCount} pending request${pendingCount === 1 ? '' : 's'}.`
                : 'Review your assigned schedule and booking updates here.'}
            </Text>

            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search client, counselor, date, or note"
              placeholderTextColor="#94a3b8"
              className="mt-4 rounded-2xl border border-skyblue-100 bg-skyblue-50/30 px-4 py-3 text-sm text-oceanblue"
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
              <View className="flex-row gap-2">
                {STATUS_FILTERS.map((filter) => {
                  const isActive = selectedFilter === filter;
                  return (
                    <Pressable
                      key={filter}
                      onPress={() => setSelectedFilter(filter)}
                      className={`rounded-full border px-3 py-2 ${
                        isActive ? 'bg-skyblue border-skyblue' : 'bg-white border-skyblue-100'
                      }`}
                    >
                      <Text className={`text-[10px] font-black uppercase ${isActive ? 'text-white' : 'text-oceanblue'}`}>
                        {filter}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {loading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="small" color="#0ea5e9" />
            </View>
          ) : filteredAppointments.length === 0 ? (
            <View className="mt-6 rounded-3xl border border-skyblue-100 bg-white p-6 shadow-sm items-center">
              <Text className="text-4xl">📭</Text>
              <Text className="mt-3 text-base font-extrabold text-oceanblue">No bookings found</Text>
              <Text className="mt-1 text-sm text-oceanblue-900/60 text-center leading-relaxed">
                {isAdmin
                  ? 'New session requests will appear here as soon as clients submit them.'
                  : 'Your schedule will appear here once bookings are assigned to you.'}
              </Text>
            </View>
          ) : (
            <View className="mt-6 gap-4">
              {filteredAppointments.map((appointment) => {
                const statusMeta = getAppointmentStatusMeta(appointment.status);
                const reviewable = isAdmin && isReviewableAppointment(appointment.status);

                return (
                  <View
                    key={appointment.id}
                    className="rounded-3xl border border-skyblue-100 bg-white p-5 shadow-sm"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="text-lg font-extrabold text-oceanblue">
                            {appointment.Client?.name || 'Client'}
                          </Text>
                          <Text className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusMeta.tone}`}>
                            {statusMeta.label}
                          </Text>
                        </View>
                        <Text className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-skyblue">
                          {appointment.appointmentDate} · {appointment.timeSlot}
                        </Text>
                        {isAdmin ? (
                          <Text className="mt-1 text-sm text-oceanblue-900/60">
                            Counselor: {appointment.Counselor?.name || 'Unassigned'}
                          </Text>
                        ) : null}
                        {appointment.notes ? (
                          <Text className="mt-2 text-sm leading-relaxed text-oceanblue-900/75">
                            {appointment.notes}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {reviewable ? (
                      <View className="mt-4 flex-row gap-3">
                        <Pressable
                          onPress={() => void approveAppointment(appointment.id)}
                          disabled={actingId === appointment.id}
                          className="flex-1 rounded-2xl bg-emerald-600 px-3 py-3 active:opacity-90 disabled:opacity-60"
                        >
                          {actingId === appointment.id ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text className="text-center text-xs font-extrabold text-white">Approve</Text>
                          )}
                        </Pressable>
                        <Pressable
                          onPress={() => void rejectAppointment(appointment.id)}
                          disabled={actingId === appointment.id}
                          className="flex-1 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 active:opacity-90 disabled:opacity-60"
                        >
                          <Text className="text-center text-xs font-extrabold text-rose-700">Reject</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
