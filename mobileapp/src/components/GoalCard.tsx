import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

interface GoalCardProps {
  goal: Goal;
  onToggleMilestone: (goalId: number, milestoneId: number) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: number) => void;
}

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string }> = {
  Sobriety:       { emoji: '🚫', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  'Mental Health':{ emoji: '🧠', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  Physical:       { emoji: '🏃', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  Social:         { emoji: '🤝', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  Skill:          { emoji: '🌱', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export default function GoalCard({ goal, onToggleMilestone, onEdit, onDelete }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);

  const total = goal.milestones.length;
  const done = goal.milestones.filter((m) => m.isCompleted).length;
  const progress = total > 0 ? (done / total) * 100 : goal.isCompleted ? 100 : 0;

  const catConfig = CATEGORY_CONFIG[goal.category] || { emoji: '🎯', color: 'bg-skyblue-100 text-skyblue border-skyblue-200' };

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  const formatDate = (d?: string) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
  };

  return (
    <View className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${goal.isCompleted ? 'border-emerald-200' : 'border-skyblue-100'}`}>
      {/* Card Header */}
      <Pressable onPress={toggle} className="p-5 active:opacity-80">
        <View className="flex-row justify-between items-start mb-3">
          <View className={`flex-row items-center gap-x-1.5 px-2.5 py-1 rounded-full border ${catConfig.color}`}>
            <Text className="text-xs">{catConfig.emoji}</Text>
            <Text className="text-[10px] font-extrabold uppercase tracking-wider">{goal.category}</Text>
          </View>
          {goal.isCompleted && (
            <View className="bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full">
              <Text className="text-[10px] font-extrabold text-emerald-700 uppercase">✓ Complete</Text>
            </View>
          )}
        </View>

        <Text className={`text-base font-bold leading-snug ${goal.isCompleted ? 'text-emerald-700 line-through' : 'text-oceanblue'}`}>
          {goal.title}
        </Text>

        {goal.targetDate && (
          <Text className="text-xs text-oceanblue-900/50 font-semibold mt-1">
            🗓 Target: {formatDate(goal.targetDate)}
          </Text>
        )}

        {/* Progress Bar */}
        <View className="mt-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-[10px] font-bold text-oceanblue-900/50 uppercase tracking-wider">Progress</Text>
            <Text className="text-[10px] font-extrabold text-oceanblue">
              {total > 0 ? `${done}/${total}` : goal.isCompleted ? '100%' : '0%'}
            </Text>
          </View>
          <View className="h-2 bg-skyblue-100 rounded-full overflow-hidden">
            <View
              className={`h-full rounded-full ${goal.isCompleted ? 'bg-emerald-500' : 'bg-skyblue'}`}
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>

        {total > 0 && (
          <Text className="text-xs text-skyblue font-bold mt-2 text-right">
            {expanded ? '▲ Collapse' : '▼ Show milestones'}
          </Text>
        )}
      </Pressable>

      {/* Milestones (expandable) */}
      {expanded && total > 0 && (
        <View className="px-5 pb-4 border-t border-skyblue-50 pt-3 gap-y-2">
          {goal.milestones.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => onToggleMilestone(goal.id, m.id)}
              className="flex-row items-center gap-x-3 py-1 active:opacity-70"
            >
              <View className={`w-5 h-5 rounded-full border-2 items-center justify-center flex-shrink-0 ${
                m.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-skyblue-300 bg-white'
              }`}>
                {m.isCompleted && <Text className="text-white text-[10px] font-extrabold">✓</Text>}
              </View>
              <Text className={`text-sm flex-1 leading-snug ${
                m.isCompleted ? 'text-oceanblue-900/40 line-through' : 'text-oceanblue-900/80 font-semibold'
              }`}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Action Row */}
      <View className="flex-row border-t border-skyblue-50">
        <Pressable
          onPress={() => onEdit(goal)}
          className="flex-1 py-3 items-center active:bg-skyblue-50"
        >
          <Text className="text-xs font-bold text-skyblue">✏️ Edit</Text>
        </Pressable>
        <View className="w-px bg-skyblue-50" />
        <Pressable
          onPress={() => onDelete(goal.id)}
          className="flex-1 py-3 items-center active:bg-red-50"
        >
          <Text className="text-xs font-bold text-red-500">🗑 Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}
