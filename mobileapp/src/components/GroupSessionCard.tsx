import React, { useState } from 'react';
import {
  View, Text, Pressable, Animated,
  Platform, UIManager, LayoutAnimation,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Member { id: number; userId: number; }
interface GroupSession {
  id: number;
  title: string;
  description?: string;
  category: string;
  sessionDate: string;
  timeSlot: string;
  maxCapacity: number;
  status: string;
  host?: { id: number; name: string };
  members: Member[];
}

interface Props {
  session: GroupSession;
  currentUserId: number;
  onJoin: (id: number) => void;
  onLeave: (id: number) => void;
  joiningId: number | null;
}

const CATEGORY_EMOJI: Record<string, string> = {
  'Rehab': '💪', 'Mental Health': '🧠', 'Mindfulness': '🧘',
  'Life Skills': '🌱', 'Crisis Support': '🆘',
};

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  Open:      { label: '🟢 Open',      style: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  Full:      { label: '🔴 Full',      style: 'bg-red-100 text-red-700 border-red-200' },
  Completed: { label: '✅ Completed', style: 'bg-blue-100 text-blue-700 border-blue-200' },
  Cancelled: { label: '⛔ Cancelled', style: 'bg-slate-100 text-slate-500 border-slate-200' },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

export default function GroupSessionCard({ session, currentUserId, onJoin, onLeave, joiningId }: Props) {
  const [expanded, setExpanded] = useState(false);

  const isJoined = session.members.some((m) => m.userId === currentUserId);
  const memberCount = session.members.length;
  const pct = Math.min(100, Math.round((memberCount / session.maxCapacity) * 100));
  const isActive = session.status === 'Open' || session.status === 'Full';
  const statusInfo = STATUS_CONFIG[session.status] || STATUS_CONFIG.Open;
  const isLoading = joiningId === session.id;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
      session.status === 'Cancelled' ? 'opacity-60 border-slate-100' : 'border-skyblue-100'
    }`}>
      <Pressable onPress={toggleExpanded} className="p-5 active:opacity-80">
        {/* Top row */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="bg-skyblue-50 border border-skyblue-100 px-2.5 py-1 rounded-full flex-row items-center gap-x-1">
            <Text className="text-xs">{CATEGORY_EMOJI[session.category] || '📅'}</Text>
            <Text className="text-[10px] font-bold text-oceanblue-900/70">{session.category}</Text>
          </View>
          <View className={`px-2.5 py-1 rounded-full border ${statusInfo.style}`}>
            <Text className="text-[10px] font-extrabold uppercase tracking-wider">{statusInfo.label}</Text>
          </View>
        </View>

        {/* Title */}
        <Text className="text-base font-bold text-oceanblue leading-snug">{session.title}</Text>

        {/* Date / Time / Host */}
        <View className="flex-row flex-wrap gap-x-3 gap-y-1 mt-2">
          <Text className="text-xs text-oceanblue-900/60 font-semibold">📅 {formatDate(session.sessionDate)}</Text>
          <Text className="text-xs text-oceanblue-900/60 font-semibold">⏰ {session.timeSlot}</Text>
          {session.host && (
            <Text className="text-xs text-oceanblue-900/60 font-semibold">👤 {session.host.name}</Text>
          )}
        </View>

        {/* Capacity bar */}
        <View className="mt-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-[10px] font-bold text-oceanblue-900/50 uppercase tracking-wider">Capacity</Text>
            <Text className="text-[10px] font-extrabold text-oceanblue">{memberCount} / {session.maxCapacity}</Text>
          </View>
          <View className="h-2 bg-skyblue-100 rounded-full overflow-hidden">
            <View
              className={`h-full rounded-full ${pct >= 100 ? 'bg-red-400' : pct >= 75 ? 'bg-amber-400' : 'bg-skyblue'}`}
              style={{ width: `${pct}%` }}
            />
          </View>
        </View>

        {expanded && session.description ? (
          <Text className="text-sm text-oceanblue-900/70 mt-3 leading-relaxed">{session.description}</Text>
        ) : null}

        <Text className="text-xs text-skyblue font-bold mt-2 text-right">
          {expanded ? '▲ Less' : '▼ More'}
        </Text>
      </Pressable>

      {/* Join / Leave Action */}
      {isActive && (
        <View className="border-t border-skyblue-50">
          {isJoined ? (
            <Pressable
              onPress={() => onLeave(session.id)}
              disabled={isLoading}
              className="py-3 items-center active:bg-red-50"
            >
              <Text className="text-xs font-bold text-red-500">
                {isLoading ? 'Leaving...' : '🚪 Leave Session'}
              </Text>
            </Pressable>
          ) : session.status === 'Open' ? (
            <Pressable
              onPress={() => onJoin(session.id)}
              disabled={isLoading}
              className="py-3 items-center bg-oceanblue active:bg-oceanblue-900"
            >
              <Text className="text-xs font-bold text-white">
                {isLoading ? 'Joining...' : '+ Join Session'}
              </Text>
            </Pressable>
          ) : (
            <View className="py-3 items-center">
              <Text className="text-xs font-bold text-red-400">Session Full</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
