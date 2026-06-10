import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import GoalCard from '@/components/GoalCard';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Milestone {
  id: number;
  label: string;
  isCompleted: boolean;
}

interface Goal {
  id: number;
  title: string;
  description?: string;
  category: string;
  targetDate?: string;
  isCompleted: boolean;
  milestones: Milestone[];
}

interface MoodPoint {
  date: string;
  mood: string;
  score: number;
}

// ─── Mood chart config ────────────────────────────────────────────────────────
const MOOD_EMOJI: Record<string, string> = {
  Happy: '😊', Calm: '😌', Hopeful: '🌅', Anxious: '😰', Sad: '😢', Angry: '😤',
};
const MOOD_COLOR: Record<string, string> = {
  Happy: '#f59e0b', Calm: '#06b6d4', Hopeful: '#10b981',
  Anxious: '#8b5cf6', Sad: '#3b82f6', Angry: '#ef4444',
};
const MAX_SCORE = 6;
const CHART_HEIGHT = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatChartDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return iso; }
}

// ─── Mini Mood Chart (pure View-based, no SVG) ────────────────────────────────
function MoodChart({ data }: { data: MoodPoint[] }) {
  if (data.length === 0) {
    return (
      <View className="items-center py-8">
        <Text className="text-4xl mb-2">📓</Text>
        <Text className="text-sm text-oceanblue-900/50 font-semibold text-center">
          Write journal entries to see your mood trend here.
        </Text>
      </View>
    );
  }

  // Show last 10 entries max
  const slice = data.slice(-10);
  const barWidth = Math.floor(100 / slice.length);

  return (
    <View>
      <View className="flex-row items-end justify-between" style={{ height: CHART_HEIGHT + 8 }}>
        {slice.map((point, i) => {
          const barH = Math.max(8, Math.round((point.score / MAX_SCORE) * CHART_HEIGHT));
          const color = MOOD_COLOR[point.mood] || '#0ea5e9';
          return (
            <View key={i} className="flex-1 items-center justify-end px-0.5">
              {/* Emoji label on top */}
              <Text style={{ fontSize: 12, marginBottom: 2 }}>{MOOD_EMOJI[point.mood] || '😐'}</Text>
              {/* Bar */}
              <View
                style={{
                  width: '80%',
                  height: barH,
                  backgroundColor: color,
                  borderRadius: 4,
                  opacity: 0.85,
                }}
              />
            </View>
          );
        })}
      </View>

      {/* X-axis labels */}
      <View className="flex-row justify-between mt-2">
        {slice.map((point, i) => (
          <View key={i} className="flex-1 items-center">
            <Text className="text-[8px] text-oceanblue-900/40 font-semibold" numberOfLines={1}>
              {formatChartDate(point.date)}
            </Text>
          </View>
        ))}
      </View>

      {/* Legend */}
      <View className="flex-row flex-wrap gap-2 mt-4">
        {Object.entries(MOOD_EMOJI).map(([mood, emoji]) => (
          <View key={mood} className="flex-row items-center gap-x-1">
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: MOOD_COLOR[mood] }} />
            <Text className="text-[10px] text-oceanblue-900/60 font-semibold">{emoji} {mood}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const router = useRouter();
  const { userToken, apiUrl } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [moodTrend, setMoodTrend] = useState<MoodPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAll = async (showLoader = false) => {
    if (!userToken) return;
    if (showLoader) setLoading(true);
    setErrorMsg(null);
    try {
      const [goalsRes, trendRes] = await Promise.all([
        fetch(`${apiUrl}/progress/goals`, { headers: { Authorization: `Bearer ${userToken}` } }),
        fetch(`${apiUrl}/progress/mood-trend?days=30`, { headers: { Authorization: `Bearer ${userToken}` } }),
      ]);
      const goalsData = await goalsRes.json();
      const trendData = await trendRes.json();

      if (goalsRes.ok && goalsData.success) setGoals(goalsData.data);
      if (trendRes.ok && trendData.success) setMoodTrend(trendData.data);
    } catch {
      setErrorMsg('Network error. Check your connection.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => { fetchAll(true); }, [userToken]);
  useFocusEffect(useCallback(() => { fetchAll(false); }, [userToken]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll(false);
    setRefreshing(false);
  };

  // ── Toggle milestone ───────────────────────────────────────────────────────
  const handleToggleMilestone = async (goalId: number, milestoneId: number) => {
    try {
      const res = await fetch(`${apiUrl}/progress/goals/${goalId}/milestones/${milestoneId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goalId
              ? {
                  ...g,
                  milestones: g.milestones.map((m) =>
                    m.id === milestoneId ? { ...m, isCompleted: data.data.isCompleted } : m
                  ),
                }
              : g
          )
        );
      }
    } catch {
      console.warn('[Progress] Failed to toggle milestone');
    }
  };

  // ── Delete goal ────────────────────────────────────────────────────────────
  const handleDeleteGoal = (goalId: number) => {
    Alert.alert('Delete Goal', 'This will permanently remove the goal and all its milestones.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${apiUrl}/progress/goals/${goalId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${userToken}` },
            });
            if (res.ok) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setGoals((prev) => prev.filter((g) => g.id !== goalId));
            }
          } catch {
            console.warn('[Progress] Failed to delete goal');
          }
        },
      },
    ]);
  };

  // ── Edit goal (navigate to editor with prefilled params) ──────────────────
  const handleEditGoal = (goal: Goal) => {
    router.push({
      pathname: '/(app)/goal-editor',
      params: {
        id: goal.id,
        title: goal.title,
        description: goal.description || '',
        category: goal.category,
        targetDate: goal.targetDate || '',
      },
    });
  };

  // ─── Stats summary ─────────────────────────────────────────────────────────
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.isCompleted).length;
  const totalMilestones = goals.reduce((s, g) => s + g.milestones.length, 0);
  const doneMilestones = goals.reduce((s, g) => s + g.milestones.filter((m) => m.isCompleted).length, 0);

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>

        {/* Header */}
        <View className="bg-oceanblue p-5 rounded-b-3xl shadow-md">
          <Text className="text-2xl font-extrabold text-white tracking-tight">My Progress</Text>
          <Text className="text-xs font-semibold text-skyblue-100 mt-0.5">
            Track goals and mood trends on your recovery journey
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 110, paddingTop: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />}
        >
          {loading ? (
            <View className="flex-1 justify-center items-center py-20">
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text className="text-xs text-oceanblue-900/60 font-semibold mt-3">Loading progress data...</Text>
            </View>
          ) : (
            <View className="px-4 gap-y-6">

              {/* ── Stats Row ── */}
              <View className="flex-row gap-x-3">
                {[
                  { label: 'Goals', value: totalGoals, sub: `${completedGoals} done`, emoji: '🎯' },
                  { label: 'Milestones', value: totalMilestones, sub: `${doneMilestones} checked`, emoji: '✅' },
                  {
                    label: 'Mood Entries',
                    value: moodTrend.length,
                    sub: 'last 30 days',
                    emoji: '📈',
                  },
                ].map((stat) => (
                  <View key={stat.label} className="flex-1 bg-white p-4 rounded-2xl border border-skyblue-100 shadow-sm items-center">
                    <Text className="text-2xl mb-1">{stat.emoji}</Text>
                    <Text className="text-2xl font-extrabold text-oceanblue">{stat.value}</Text>
                    <Text className="text-[10px] font-bold text-oceanblue-900/50 uppercase tracking-wider mt-0.5">{stat.label}</Text>
                    <Text className="text-[9px] text-oceanblue-900/40 font-semibold mt-0.5">{stat.sub}</Text>
                  </View>
                ))}
              </View>

              {/* ── Mood Trend Chart ── */}
              <View className="bg-white p-5 rounded-2xl border border-skyblue-100 shadow-sm">
                <Text className="text-base font-bold text-oceanblue mb-1">Mood Trend</Text>
                <Text className="text-xs text-oceanblue-900/50 font-semibold mb-4">
                  Based on your last {moodTrend.length} journal entries
                </Text>
                <MoodChart data={moodTrend} />
              </View>

              {/* ── Goals Section ── */}
              <View>
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-base font-bold text-oceanblue">My Goals</Text>
                  <Pressable
                    onPress={() => router.push('/(app)/goal-editor')}
                    className="bg-skyblue active:bg-skyblue-600 px-4 py-1.5 rounded-full flex-row items-center gap-x-1"
                  >
                    <Text className="text-white text-xs font-bold">+ Add Goal</Text>
                  </Pressable>
                </View>

                {errorMsg && (
                  <View className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-4">
                    <Text className="text-red-700 text-sm font-medium text-center">{errorMsg}</Text>
                  </View>
                )}

                {goals.length === 0 ? (
                  <View className="bg-white p-8 rounded-2xl border border-skyblue-100 shadow-sm items-center">
                    <Text className="text-5xl mb-3">🎯</Text>
                    <Text className="text-lg font-bold text-oceanblue text-center">Set Your First Goal</Text>
                    <Text className="text-sm font-medium text-oceanblue-900/60 text-center mt-2 max-w-xs">
                      Break your recovery journey into milestones and track your progress.
                    </Text>
                    <Pressable
                      onPress={() => router.push('/(app)/goal-editor')}
                      className="mt-4 bg-skyblue active:bg-skyblue-600 px-6 py-3 rounded-xl"
                    >
                      <Text className="text-white font-bold text-sm">Create First Goal →</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="gap-y-4">
                    {goals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onToggleMilestone={handleToggleMilestone}
                        onEdit={handleEditGoal}
                        onDelete={handleDeleteGoal}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
