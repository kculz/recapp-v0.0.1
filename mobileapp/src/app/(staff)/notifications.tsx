import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StaffPageHeader from '@/components/staff-page-header';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { getAppointmentStatusMeta, type AppointmentStatus } from '@/utils/appointments';

type NotificationKind = 'booking' | 'safety';

interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  route: string;
  accent: 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';
}

const FILTERS: ('All' | NotificationKind)[] = ['All', 'booking', 'safety'];

const accentClasses: Record<NotificationItem['accent'], string> = {
  emerald: 'bg-emerald-50 border-emerald-100',
  amber: 'bg-amber-50 border-amber-100',
  rose: 'bg-rose-50 border-rose-100',
  violet: 'bg-violet-50 border-violet-100',
  sky: 'bg-skyblue-50 border-skyblue-100',
};

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const sortNotifications = (items: NotificationItem[]) =>
  [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

export default function StaffNotificationsScreen() {
  const router = useRouter();
  const socket = useSocket();
  const { userToken, apiUrl } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'All' | NotificationKind>('All');
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mergeNotification = useCallback((item: NotificationItem) => {
    setNotifications((previous) => {
      const next = [item, ...previous.filter((existing) => existing.id !== item.id || existing.kind !== item.kind)];
      return sortNotifications(next);
    });
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!userToken) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const [alertsResponse, appointmentsResponse] = await Promise.all([
        fetch(`${apiUrl}/alerts`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
        fetch(`${apiUrl}/appointments`, {
          headers: { Authorization: `Bearer ${userToken}` },
        }),
      ]);

      const alertsData = await alertsResponse.json();
      const appointmentsData = await appointmentsResponse.json();

      const nextItems: NotificationItem[] = [];

      if (alertsResponse.ok && alertsData.success) {
        (alertsData.data?.posts || []).forEach((post: any) => {
          nextItems.push({
            id: `post-${post.id}`,
            kind: 'safety',
            title: `Flagged post: ${post.title || 'Untitled post'}`,
            body: `${post.author?.name || 'A staff member'} posted content that needs review.`,
            createdAt: post.createdAt,
            route: '/(staff)/posts',
            accent: 'rose',
          });
        });

        (alertsData.data?.comments || []).forEach((comment: any) => {
          nextItems.push({
            id: `comment-${comment.id}`,
            kind: 'safety',
            title: `Flagged comment on ${comment.post?.title || 'a post'}`,
            body: `${comment.author?.name || 'A staff member'} left a message that needs review.`,
            createdAt: comment.createdAt,
            route: '/(staff)/posts',
            accent: 'amber',
          });
        });

        (alertsData.data?.messages || []).forEach((message: any) => {
          nextItems.push({
            id: `message-${message.id}`,
            kind: 'safety',
            title: `Flagged message from ${message.Sender?.name || 'a member'}`,
            body: message.messageText || 'A direct message needs review.',
            createdAt: message.createdAt,
            route: '/(staff)/messages',
            accent: 'violet',
          });
        });
      }

      if (appointmentsResponse.ok && appointmentsData.success) {
        (appointmentsData.data || []).forEach((appointment: any) => {
          if (!['Pending', 'Scheduled', 'Approved', 'Rejected', 'Cancelled'].includes(appointment.status)) {
            return;
          }

          const statusMeta = getAppointmentStatusMeta(appointment.status as AppointmentStatus);
          nextItems.push({
            id: `appointment-${appointment.id}`,
            kind: 'booking',
            title: `${statusMeta.label} · ${appointment.Client?.name || 'Client booking'}`,
            body: `${appointment.appointmentDate} · ${appointment.timeSlot}`,
            createdAt: appointment.createdAt || appointment.updatedAt || new Date().toISOString(),
            route: '/(staff)/bookings',
            accent: appointment.status === 'Rejected' || appointment.status === 'Cancelled' ? 'rose' : 'sky',
          });
        });
      }

      setNotifications(sortNotifications(nextItems));
    } catch {
      setErrorMsg('Network error. Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, userToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadNotifications]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleBookingEvent = (payload: any) => {
      if (!payload?.id) {
        return;
      }

      const statusMeta = getAppointmentStatusMeta(payload.status as AppointmentStatus);
      mergeNotification({
        id: `appointment-${payload.id}`,
        kind: 'booking',
        title: payload.action === 'created' ? `New booking request · ${payload.Client?.name || 'Client'}` : `${statusMeta.label} · ${payload.Client?.name || 'Client'}`,
        body: `${payload.appointmentDate} · ${payload.timeSlot}`,
        createdAt: payload.createdAt || payload.updatedAt || new Date().toISOString(),
        route: '/(staff)/bookings',
        accent: payload.action === 'rejected' || payload.action === 'cancelled' ? 'rose' : 'sky',
      });
      setBannerMessage(payload.message || 'Booking update received.');
    };

    const handleSafetyAlert = (payload: any) => {
      if (!payload?.id) {
        return;
      }

      mergeNotification({
        id: `${payload.type || 'alert'}-${payload.id}`,
        kind: 'safety',
        title:
          payload.type === 'message'
            ? `Flagged message from ${payload.Sender?.name || 'a member'}`
            : payload.type === 'comment'
              ? `Flagged comment on ${payload.post?.title || 'a post'}`
              : `Flagged post: ${payload.title || 'Review required'}`,
        body:
          payload.messageText ||
          payload.content ||
          'This item has been flagged for safety review.',
        createdAt: payload.createdAt || new Date().toISOString(),
        route: payload.type === 'message' ? '/(staff)/messages' : '/(staff)/posts',
        accent: payload.type === 'message' ? 'violet' : 'amber',
      });
      setBannerMessage('Safety alert received.');
    };

    socket.on('booking:new', handleBookingEvent);
    socket.on('booking:update', handleBookingEvent);
    socket.on('crisis_alert', handleSafetyAlert);

    return () => {
      socket.off('booking:new', handleBookingEvent);
      socket.off('booking:update', handleBookingEvent);
      socket.off('crisis_alert', handleSafetyAlert);
    };
  }, [mergeNotification, socket]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => selectedFilter === 'All' || item.kind === selectedFilter);
  }, [notifications, selectedFilter]);

  const summary = useMemo(
    () => ({
      bookings: notifications.filter((item) => item.kind === 'booking').length,
      safety: notifications.filter((item) => item.kind === 'safety').length,
    }),
    [notifications]
  );

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <StaffPageHeader
          title="Notifications"
          subtitle="Your live alert center"
          onBack={() => router.replace('/(staff)/dashboard')}
          rightAction={
            <Pressable
              onPress={() => void loadNotifications()}
              className="px-3 py-2 rounded-xl bg-white/15 active:opacity-80"
            >
              <Text className="text-white text-xs font-extrabold">Refresh</Text>
            </Pressable>
          }
        />

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await loadNotifications();
            setRefreshing(false);
          }} colors={['#0ea5e9']} />}
        >
          {bannerMessage ? (
            <View className="mb-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <Text className="text-sm font-semibold text-violet-700">{bannerMessage}</Text>
            </View>
          ) : null}

          {errorMsg ? (
            <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
              <Text className="text-sm font-semibold text-red-700">{errorMsg}</Text>
            </View>
          ) : null}

          <View className="rounded-3xl border border-skyblue-100 bg-white p-5 shadow-sm">
            <Text className="text-lg font-extrabold text-oceanblue">Live updates</Text>
            <Text className="text-xs text-oceanblue-900/55 mt-1">
              Booking updates and flagged content appear here in real time.
            </Text>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-skyblue-100 bg-skyblue-50/30 p-4">
                <Text className="text-[10px] font-black uppercase tracking-wider text-skyblue">Bookings</Text>
                <Text className="mt-1 text-xl font-extrabold text-oceanblue">{summary.bookings}</Text>
              </View>
              <View className="flex-1 rounded-2xl border border-skyblue-100 bg-skyblue-50/30 p-4">
                <Text className="text-[10px] font-black uppercase tracking-wider text-skyblue">Safety</Text>
                <Text className="mt-1 text-xl font-extrabold text-oceanblue">{summary.safety}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
              <View className="flex-row gap-2">
                {FILTERS.map((filter) => {
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
          ) : filteredNotifications.length === 0 ? (
            <View className="mt-6 rounded-3xl border border-skyblue-100 bg-white p-6 shadow-sm items-center">
              <Text className="text-4xl">🔕</Text>
              <Text className="mt-3 text-base font-extrabold text-oceanblue">No notifications yet</Text>
              <Text className="mt-1 text-sm text-oceanblue-900/60 text-center leading-relaxed">
                New booking requests and safety alerts will appear here as they come in.
              </Text>
            </View>
          ) : (
            <View className="mt-6 gap-4">
              {filteredNotifications.map((item) => (
                <Pressable
                  key={`${item.kind}-${item.id}`}
                  onPress={() => router.push(item.route as never)}
                  className={`rounded-3xl border p-5 shadow-sm active:opacity-90 ${accentClasses[item.accent]}`}
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-[10px] font-black uppercase tracking-wider text-oceanblue">
                        {item.kind === 'booking' ? 'Booking' : 'Safety'}
                      </Text>
                      <Text className="mt-2 text-lg font-extrabold text-oceanblue">{item.title}</Text>
                      <Text className="mt-1 text-sm leading-relaxed text-oceanblue-900/70">{item.body}</Text>
                    </View>
                    <Text className="text-[10px] font-semibold text-oceanblue-900/45">
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
