import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import GroupSessionCard from '@/components/GroupSessionCard';

interface Member { id: number; userId: number; joinedAt: string; }
interface GroupSession {
  id: number; title: string; description?: string; category: string;
  sessionDate: string; timeSlot: string; maxCapacity: number; status: string;
  host?: { id: number; name: string };
  members: Member[];
}

const CATEGORIES = ['All', 'Rehab', 'Mental Health', 'Mindfulness', 'Life Skills', 'Crisis Support'];
const VIEWS = ['Discover', 'My Sessions'] as const;

export default function GroupsScreen() {
  const { userToken, apiUrl, user } = useAuth();

  const [activeView, setActiveView] = useState<typeof VIEWS[number]>('Discover');
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [mySessions, setMySessions] = useState<GroupSession[]>([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async (showLoader = false) => {
    if (!userToken) return;
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const params = category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
      const [discoverRes, myRes] = await Promise.all([
        fetch(`${apiUrl}/group-sessions${params}`, { headers: { Authorization: `Bearer ${userToken}` } }),
        fetch(`${apiUrl}/group-sessions/mine`, { headers: { Authorization: `Bearer ${userToken}` } }),
      ]);
      const discoverData = await discoverRes.json();
      const myData = await myRes.json();
      if (discoverRes.ok && discoverData.success) setSessions(discoverData.data.sessions || []);
      if (myRes.ok && myData.success) setMySessions(myData.data || []);
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(true); }, [category, userToken]);
  useFocusEffect(useCallback(() => { fetchSessions(false); }, [category]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSessions(false);
    setRefreshing(false);
  };

  const handleJoin = async (sessionId: number) => {
    setJoiningId(sessionId);
    try {
      const res = await fetch(`${apiUrl}/group-sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchSessions(false);
      } else {
        Alert.alert('Could not join', data.error || 'Failed to join session.');
      }
    } catch {
      Alert.alert('Error', 'Network error while joining session.');
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = (sessionId: number) => {
    Alert.alert('Leave Session', 'Are you sure you want to leave this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          setJoiningId(sessionId);
          try {
            const res = await fetch(`${apiUrl}/group-sessions/${sessionId}/leave`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${userToken}` },
            });
            if (res.ok) await fetchSessions(false);
          } catch {
            Alert.alert('Error', 'Network error while leaving session.');
          } finally {
            setJoiningId(null);
          }
        },
      },
    ]);
  };

  const currentSessions = activeView === 'Discover' ? sessions : mySessions;

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>

        {/* Header */}
        <View className="bg-oceanblue p-5 rounded-b-3xl shadow-md">
          <Text className="text-2xl font-extrabold text-white tracking-tight">Group Sessions</Text>
          <Text className="text-xs font-semibold text-skyblue-100 mt-0.5">
            Join recovery groups led by your care team
          </Text>
        </View>

        {/* View Toggle (Discover / My Sessions) */}
        <View className="flex-row mx-4 mt-4 bg-white border border-skyblue-100 rounded-2xl p-1 shadow-sm">
          {VIEWS.map((v) => (
            <Pressable
              key={v}
              onPress={() => setActiveView(v)}
              className={`flex-1 py-2.5 rounded-xl items-center ${activeView === v ? 'bg-oceanblue' : 'active:bg-skyblue-50'}`}
            >
              <Text className={`text-xs font-extrabold ${activeView === v ? 'text-white' : 'text-oceanblue-900/60'}`}>{v}</Text>
            </Pressable>
          ))}
        </View>

        {/* Category chips — only on Discover view */}
        {activeView === 'Discover' && (
          <View className="py-3 bg-transparent">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
              {CATEGORIES.map((cat) => {
                const isActive = category === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-full border mr-2.5 ${isActive ? 'bg-skyblue border-skyblue' : 'bg-white border-skyblue-100 active:bg-skyblue-50'}`}
                  >
                    <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-oceanblue-900/80'}`}>{cat}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Session List */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 110, paddingTop: 8, paddingHorizontal: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />}
        >
          {error && (
            <View className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-4">
              <Text className="text-red-700 text-sm font-medium text-center">{error}</Text>
            </View>
          )}

          {loading ? (
            <View className="flex-1 justify-center items-center py-20">
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text className="text-xs text-oceanblue-900/60 font-semibold mt-3">Loading sessions...</Text>
            </View>
          ) : currentSessions.length === 0 ? (
            <View className="flex-1 justify-center items-center px-6 py-20">
              <Text className="text-5xl mb-4">{activeView === 'Discover' ? '🔍' : '📋'}</Text>
              <Text className="text-xl font-bold text-oceanblue text-center">
                {activeView === 'Discover' ? 'No Sessions Found' : 'Not Joined Any Session'}
              </Text>
              <Text className="text-sm font-medium text-oceanblue-900/60 text-center mt-2 max-w-xs">
                {activeView === 'Discover'
                  ? 'Group sessions will appear here when your care team schedules them.'
                  : 'Discover sessions and tap "Join" to register.'}
              </Text>
            </View>
          ) : (
            <View className="gap-y-4">
              {currentSessions.map((s) => (
                <GroupSessionCard
                  key={s.id}
                  session={s}
                  currentUserId={user?.id ?? 0}
                  onJoin={handleJoin}
                  onLeave={handleLeave}
                  joiningId={joiningId}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
