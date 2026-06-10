import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  ActivityIndicator, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
interface SupportPerson {
  id: number;
  name: string;
  email: string;
  status: 'Pending' | 'Active' | 'Revoked';
  supporter?: { id: number; name: string; email: string; status: string };
}

interface Milestone { id: number; label: string; isCompleted: boolean; }
interface Goal {
  id: number; title: string; category: string;
  targetDate?: string; isCompleted: boolean; milestones: Milestone[];
}
interface MoodPoint { date: string; mood: string; score: number; }
interface ClientData {
  client: { id: number; name: string };
  goals: Goal[];
  moodTrend: MoodPoint[];
}

// ─── Mood config ─────────────────────────────────────────────────────────────
const MOOD_EMOJI: Record<string, string> = {
  Happy: '😊', Calm: '😌', Hopeful: '🌅', Anxious: '😰', Sad: '😢', Angry: '😤',
};
const MOOD_COLOR: Record<string, string> = {
  Happy: '#f59e0b', Calm: '#06b6d4', Hopeful: '#10b981',
  Anxious: '#8b5cf6', Sad: '#3b82f6', Angry: '#ef4444',
};
const MAX_SCORE = 6;
const CHART_H = 80;

// ─── Mini Mood Chart (pure-View, no SVG) ─────────────────────────────────────
function MiniMoodChart({ data }: { data: MoodPoint[] }) {
  if (data.length === 0) {
    return (
      <View className="items-center py-4">
        <Text className="text-sm text-oceanblue-900/50 font-semibold">No mood entries yet.</Text>
      </View>
    );
  }
  const slice = data.slice(-7);
  return (
    <View>
      <View className="flex-row items-end justify-between" style={{ height: CHART_H + 6 }}>
        {slice.map((p, i) => {
          const h = Math.max(6, Math.round((p.score / MAX_SCORE) * CHART_H));
          return (
            <View key={i} className="flex-1 items-center justify-end px-0.5">
              <Text style={{ fontSize: 11, marginBottom: 2 }}>{MOOD_EMOJI[p.mood] || '😐'}</Text>
              <View style={{ width: '80%', height: h, backgroundColor: MOOD_COLOR[p.mood] || '#0ea5e9', borderRadius: 4, opacity: 0.85 }} />
            </View>
          );
        })}
      </View>
      <View className="flex-row justify-between mt-1">
        {slice.map((p, i) => (
          <View key={i} className="flex-1 items-center">
            <Text className="text-[8px] text-oceanblue-900/40 font-semibold" numberOfLines={1}>
              {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Status badge config ──────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Active:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  Revoked: 'bg-slate-100 text-slate-400 border-slate-200',
};
const STATUS_EMOJI: Record<string, string> = {
  Pending: '⏳', Active: '✅', Revoked: '⛔',
};

// ─── Client View (for SupportPerson role) ────────────────────────────────────
function SupportPersonView({ userToken, apiUrl }: { userToken: string; apiUrl: string }) {
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/family/my-client`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setData(json.data);
      else setError(json.error || 'Failed to load client data.');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch_(); }, []);

  if (loading) return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#0ea5e9" />
    </View>
  );
  if (error || !data) return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-5xl mb-4">💙</Text>
      <Text className="text-sm text-red-500 font-semibold text-center">{error || 'No client linked.'}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 110, paddingTop: 20, paddingHorizontal: 16 }}>
      {/* Welcome card */}
      <View className="bg-oceanblue p-5 rounded-2xl mb-5 shadow-md">
        <Text className="text-xl font-extrabold text-white">Supporting {data.client.name} 💙</Text>
        <Text className="text-xs text-skyblue-100 font-semibold mt-1">
          You're an important part of their recovery journey. Here's their progress.
        </Text>
      </View>

      {/* Goals */}
      <View className="mb-5">
        <Text className="text-base font-bold text-oceanblue mb-3">🎯 Their Goals</Text>
        {data.goals.length === 0 ? (
          <View className="bg-white p-6 rounded-2xl border border-skyblue-100 items-center">
            <Text className="text-sm text-oceanblue-900/50 font-semibold">No goals set yet.</Text>
          </View>
        ) : (
          <View className="gap-y-3">
            {data.goals.map((g) => {
              const total = g.milestones.length;
              const done = g.milestones.filter((m) => m.isCompleted).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : g.isCompleted ? 100 : 0;
              return (
                <View key={g.id} className="bg-white p-4 rounded-2xl border border-skyblue-100 shadow-sm">
                  <Text className={`text-sm font-bold leading-snug ${g.isCompleted ? 'text-emerald-700 line-through' : 'text-oceanblue'}`}>
                    {g.title}
                  </Text>
                  <View className="mt-2.5">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-[10px] font-bold text-oceanblue-900/50 uppercase tracking-wider">Progress</Text>
                      <Text className="text-[10px] font-extrabold text-oceanblue">
                        {total > 0 ? `${done}/${total}` : `${pct}%`}
                      </Text>
                    </View>
                    <View className="h-2 bg-skyblue-100 rounded-full overflow-hidden">
                      <View
                        className={`h-full rounded-full ${g.isCompleted ? 'bg-emerald-500' : 'bg-skyblue'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Mood Trend */}
      <View className="bg-white p-5 rounded-2xl border border-skyblue-100 shadow-sm mb-5">
        <Text className="text-base font-bold text-oceanblue mb-1">📈 Mood Trend (Last 7 days)</Text>
        <Text className="text-xs text-oceanblue-900/50 font-semibold mb-4">
          Based on their journal entries
        </Text>
        <MiniMoodChart data={data.moodTrend} />
      </View>

      {/* Privacy note */}
      <View className="bg-skyblue-50 border border-skyblue-100 p-4 rounded-2xl mb-4">
        <Text className="text-xs text-oceanblue-900/60 font-semibold text-center leading-relaxed">
          🔒 You can only see goals and mood trends. Journal entries and counselling conversations are private.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Client View (for Client role — manage network) ──────────────────────────
function ClientFamilyView({ userToken, apiUrl }: { userToken: string; apiUrl: string }) {
  const [network, setNetwork] = useState<SupportPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNetwork = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/family/network`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setNetwork(data.data || []);
      else setError(data.error || 'Failed to load network.');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNetwork(true); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNetwork(false);
    setRefreshing(false);
  };

  const handleInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError('Name and email are required.');
      return;
    }
    setInviting(true);
    setInviteError(null);
    try {
      const res = await fetch(`${apiUrl}/family/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ name: inviteName.trim(), email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInviteSuccess(true);
        setInviteName('');
        setInviteEmail('');
        fetchNetwork(false);
      } else {
        setInviteError(data.error || 'Failed to send invite.');
      }
    } catch {
      setInviteError('Network error.');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = (sp: SupportPerson) => {
    Alert.alert(
      'Remove Support Person',
      `Remove ${sp.name} from your support network? They will lose access to your progress.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${apiUrl}/family/network/${sp.id}/revoke`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${userToken}` },
              });
              if (res.ok) fetchNetwork(false);
            } catch { console.warn('[Family] revoke failed'); }
          },
        },
      ]
    );
  };

  if (loading) return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#0ea5e9" />
    </View>
  );

  return (
    <>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 110, paddingTop: 20, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />}
      >
        {/* Explainer */}
        <View className="bg-white border border-skyblue-100 rounded-2xl p-5 mb-5 shadow-sm">
          <Text className="text-base font-bold text-oceanblue mb-1.5">Your Support Network 💙</Text>
          <Text className="text-sm text-oceanblue-900/70 leading-relaxed">
            Invite a family member or trusted friend to view your progress goals and mood trends. 
            They won't see your journal entries or counselling messages.
          </Text>
        </View>

        {error && (
          <View className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-4">
            <Text className="text-red-700 text-sm font-medium text-center">{error}</Text>
          </View>
        )}

        {/* Network list */}
        {network.length === 0 ? (
          <View className="bg-white p-8 rounded-2xl border border-skyblue-100 shadow-sm items-center mb-5">
            <Text className="text-4xl mb-3">💙</Text>
            <Text className="text-lg font-bold text-oceanblue text-center">No supporters yet</Text>
            <Text className="text-sm text-oceanblue-900/60 text-center mt-2 max-w-xs">
              Invite someone you trust to cheer you on during your recovery.
            </Text>
          </View>
        ) : (
          <View className="gap-y-3 mb-5">
            {network.map((sp) => (
              <View key={sp.id} className="bg-white p-5 rounded-2xl border border-skyblue-100 shadow-sm flex-row items-center gap-x-4">
                <View className="w-12 h-12 rounded-full bg-skyblue-100 items-center justify-center flex-shrink-0">
                  <Text className="text-xl">{STATUS_EMOJI[sp.status]}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-oceanblue">{sp.name}</Text>
                  <Text className="text-xs text-oceanblue-900/60 font-semibold mt-0.5">{sp.email}</Text>
                  <View className={`mt-1.5 self-start px-2 py-0.5 rounded-full border ${STATUS_STYLE[sp.status]}`}>
                    <Text className="text-[10px] font-extrabold uppercase tracking-wider">{sp.status}</Text>
                  </View>
                </View>
                {sp.status !== 'Revoked' && (
                  <Pressable onPress={() => handleRevoke(sp)} className="active:opacity-60 p-2">
                    <Text className="text-red-400 text-xs font-bold">Remove</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Invite FAB */}
        <Pressable
          onPress={() => { setShowModal(true); setInviteSuccess(false); setInviteError(null); }}
          className="bg-oceanblue active:bg-oceanblue-900 p-4 rounded-2xl items-center shadow-md"
        >
          <Text className="text-white font-extrabold text-base">+ Invite a Support Person</Text>
        </Pressable>
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right', 'bottom']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
            <View className="px-5 py-4 border-b border-skyblue-100 flex-row justify-between items-center">
              <Pressable onPress={() => setShowModal(false)} className="active:opacity-60">
                <Text className="text-skyblue font-bold text-base">✕ Close</Text>
              </Pressable>
              <Text className="text-base font-extrabold text-oceanblue">Invite Someone</Text>
              <View className="w-16" />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {inviteSuccess ? (
                <View className="items-center py-12">
                  <Text className="text-5xl mb-4">💙</Text>
                  <Text className="text-xl font-bold text-oceanblue text-center">Invite Sent!</Text>
                  <Text className="text-sm text-oceanblue-900/60 text-center mt-2 max-w-xs">
                    They'll receive an email with instructions to join your support network.
                  </Text>
                  <Pressable onPress={() => setShowModal(false)} className="mt-6 bg-skyblue px-8 py-3 rounded-xl">
                    <Text className="text-white font-bold text-sm">Done</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="gap-y-4">
                  <View className="bg-skyblue-50 border border-skyblue-100 p-4 rounded-2xl">
                    <Text className="text-xs text-oceanblue-900/70 font-semibold leading-relaxed">
                      💙 They'll be able to see your goals and mood trends only. Private content stays private.
                    </Text>
                  </View>

                  {inviteError && (
                    <View className="bg-red-50 border border-red-100 p-3 rounded-xl">
                      <Text className="text-red-700 text-xs font-semibold text-center">{inviteError}</Text>
                    </View>
                  )}

                  <View>
                    <Text className="text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-2">Their Name *</Text>
                    <TextInput
                      value={inviteName}
                      onChangeText={setInviteName}
                      placeholder="e.g. Sarah Johnson"
                      placeholderTextColor="#94a3b8"
                      className="bg-skyblue-50 border border-skyblue-100 text-oceanblue-900 text-base rounded-xl px-4 py-3"
                    />
                  </View>

                  <View>
                    <Text className="text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-2">Their Email *</Text>
                    <TextInput
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      placeholder="e.g. sarah@example.com"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="bg-skyblue-50 border border-skyblue-100 text-oceanblue-900 text-base rounded-xl px-4 py-3"
                    />
                  </View>

                  <Pressable
                    onPress={handleInvite}
                    disabled={inviting}
                    className="bg-oceanblue active:bg-oceanblue-900 p-4 rounded-2xl items-center mt-2 disabled:opacity-50"
                  >
                    {inviting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text className="text-white font-extrabold text-base">Send Invite 💙</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FamilyScreen() {
  const { userToken, apiUrl, user } = useAuth();
  const isSupportPerson = user?.role === 'SupportPerson';

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        {/* Header */}
        <View className="bg-oceanblue p-5 rounded-b-3xl shadow-md">
          <Text className="text-2xl font-extrabold text-white tracking-tight">
            {isSupportPerson ? 'My Person 💙' : 'Support Network'}
          </Text>
          <Text className="text-xs font-semibold text-skyblue-100 mt-0.5">
            {isSupportPerson
              ? 'See the progress of the person you are supporting'
              : 'Invite family and friends to support your recovery'}
          </Text>
        </View>

        {isSupportPerson ? (
          <SupportPersonView userToken={userToken!} apiUrl={apiUrl} />
        ) : (
          <ClientFamilyView userToken={userToken!} apiUrl={apiUrl} />
        )}
      </SafeAreaView>
    </View>
  );
}
