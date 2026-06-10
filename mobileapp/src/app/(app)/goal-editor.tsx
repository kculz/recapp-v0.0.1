import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

const CATEGORIES = ['Sobriety', 'Mental Health', 'Physical', 'Social', 'Skill'];

const CATEGORY_EMOJI: Record<string, string> = {
  Sobriety: '🚫', 'Mental Health': '🧠', Physical: '🏃', Social: '🤝', Skill: '🌱',
};

export default function GoalEditorScreen() {
  const router = useRouter();
  const { userToken, apiUrl } = useAuth();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    description?: string;
    category?: string;
    targetDate?: string;
    milestones?: string; // JSON string
  }>();

  const isEditing = !!params.id;

  const [title, setTitle] = useState(params.title || '');
  const [description, setDescription] = useState(params.description || '');
  const [category, setCategory] = useState(params.category || 'Mental Health');
  const [targetDate, setTargetDate] = useState(params.targetDate || '');
  const [milestones, setMilestones] = useState<string[]>(
    params.milestones ? JSON.parse(params.milestones) : ['']
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMilestone = () => setMilestones((prev) => [...prev, '']);
  const removeMilestone = (i: number) => setMilestones((prev) => prev.filter((_, idx) => idx !== i));
  const updateMilestone = (i: number, val: string) =>
    setMilestones((prev) => prev.map((m, idx) => (idx === i ? val : m)));

  const handleSave = async () => {
    if (!title.trim()) { setError('Please enter a goal title.'); return; }
    setSaving(true);
    setError(null);

    const filteredMilestones = milestones.filter((m) => m.trim().length > 0);

    try {
      const url = isEditing
        ? `${apiUrl}/progress/goals/${params.id}`
        : `${apiUrl}/progress/goals`;
      const method = isEditing ? 'PATCH' : 'POST';

      const body: any = { title: title.trim(), description: description.trim(), category };
      if (targetDate.trim()) body.targetDate = targetDate.trim();
      if (!isEditing) body.milestones = filteredMilestones;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.back();
      } else {
        setError(data.error || 'Failed to save goal.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-5 py-4 border-b border-skyblue-100 flex-row justify-between items-center">
          <Pressable onPress={() => router.back()} className="active:opacity-60">
            <Text className="text-skyblue font-bold text-base">Cancel</Text>
          </Pressable>
          <Text className="text-base font-extrabold text-oceanblue">
            {isEditing ? 'Edit Goal' : 'New Goal'}
          </Text>
          <Pressable onPress={handleSave} disabled={saving} className="active:opacity-60">
            {saving ? (
              <ActivityIndicator size="small" color="#0ea5e9" />
            ) : (
              <Text className="text-skyblue font-extrabold text-base">Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {error && (
            <View className="bg-red-50 border border-red-100 p-3 rounded-xl mb-4">
              <Text className="text-red-700 text-xs font-semibold text-center">{error}</Text>
            </View>
          )}

          {/* Title */}
          <Text className="text-xs font-extrabold text-oceanblue-900/50 uppercase tracking-wider mb-2">
            Goal Title *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Stay sober for 30 days"
            placeholderTextColor="#94a3b8"
            className="bg-skyblue-50 border border-skyblue-100 text-oceanblue-900 text-base rounded-xl px-4 py-3 mb-5"
            maxLength={120}
          />

          {/* Category */}
          <Text className="text-xs font-extrabold text-oceanblue-900/50 uppercase tracking-wider mb-2">
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            <View className="flex-row gap-x-2">
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-full border flex-row items-center gap-x-1.5 ${
                    category === cat
                      ? 'bg-skyblue border-skyblue'
                      : 'bg-white border-skyblue-100 active:bg-skyblue-50'
                  }`}
                >
                  <Text className="text-sm">{CATEGORY_EMOJI[cat]}</Text>
                  <Text className={`text-xs font-bold ${category === cat ? 'text-white' : 'text-oceanblue-900/80'}`}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Description */}
          <Text className="text-xs font-extrabold text-oceanblue-900/50 uppercase tracking-wider mb-2">
            Description (optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What does achieving this goal mean to you?"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            className="bg-skyblue-50 border border-skyblue-100 text-oceanblue-900 text-sm rounded-xl px-4 py-3 mb-5"
            style={{ textAlignVertical: 'top', minHeight: 80 }}
          />

          {/* Target Date */}
          <Text className="text-xs font-extrabold text-oceanblue-900/50 uppercase tracking-wider mb-2">
            Target Date (optional, YYYY-MM-DD)
          </Text>
          <TextInput
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="e.g. 2026-08-01"
            placeholderTextColor="#94a3b8"
            className="bg-skyblue-50 border border-skyblue-100 text-oceanblue-900 text-base rounded-xl px-4 py-3 mb-5"
            keyboardType="numeric"
          />

          {/* Milestones (new goals only) */}
          {!isEditing && (
            <>
              <Text className="text-xs font-extrabold text-oceanblue-900/50 uppercase tracking-wider mb-2">
                Milestones (optional)
              </Text>
              <View className="gap-y-2 mb-3">
                {milestones.map((m, i) => (
                  <View key={i} className="flex-row items-center gap-x-2">
                    <View className="w-5 h-5 rounded-full border-2 border-skyblue-300 bg-white flex-shrink-0" />
                    <TextInput
                      value={m}
                      onChangeText={(v) => updateMilestone(i, v)}
                      placeholder={`Milestone ${i + 1}`}
                      placeholderTextColor="#94a3b8"
                      className="flex-1 bg-skyblue-50 border border-skyblue-100 text-oceanblue-900 text-sm rounded-xl px-3 py-2.5"
                    />
                    {milestones.length > 1 && (
                      <Pressable onPress={() => removeMilestone(i)} className="active:opacity-60 p-1">
                        <Text className="text-red-400 font-bold text-lg">×</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
              <Pressable
                onPress={addMilestone}
                className="flex-row items-center gap-x-2 py-2 active:opacity-60"
              >
                <View className="w-5 h-5 rounded-full bg-skyblue items-center justify-center">
                  <Text className="text-white text-xs font-extrabold">+</Text>
                </View>
                <Text className="text-skyblue text-sm font-bold">Add milestone</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
