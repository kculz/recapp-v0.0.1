import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useJournal } from '@/hooks/useJournal';
import { LocalJournal } from '@/utils/db';

const moods: { type: LocalJournal['mood']; emoji: string; label: string }[] = [
  { type: 'Calm', emoji: '🧘', label: 'Calm' },
  { type: 'Happy', emoji: '😊', label: 'Happy' },
  { type: 'Hopeful', emoji: '🌅', label: 'Hopeful' },
  { type: 'Anxious', emoji: '😰', label: 'Anxious' },
  { type: 'Sad', emoji: '😢', label: 'Sad' },
  { type: 'Angry', emoji: '😠', label: 'Angry' }
];

export default function JournalEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addJournal, editJournal } = useJournal();

  const isEditing = !!params.id;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<LocalJournal['mood']>('Calm');
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);

  // Initialize if editing
  useEffect(() => {
    if (isEditing) {
      setTitle((params.title as string) || '');
      setContent((params.content as string) || '');
      setSelectedMood((params.mood as LocalJournal['mood']) || 'Calm');
      setIsPrivate(params.isPrivate === '1');
    }
  }, [isEditing, params]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      return;
    }
    setLoading(true);

    try {
      if (isEditing) {
        const serverId = params.serverId ? parseInt(params.serverId as string, 10) : null;
        await editJournal(
          params.id as string,
          serverId,
          title.trim(),
          content.trim(),
          selectedMood,
          isPrivate,
          (params.entryDate as string) || new Date().toISOString()
        );
      } else {
        await addJournal(title.trim(), content.trim(), selectedMood, isPrivate);
      }
      router.back();
    } catch (error) {
      console.error('Error saving journal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Navigation Header */}
        <View className="px-5 py-4 border-b border-skyblue-100 flex-row justify-between items-center bg-white">
          <Pressable onPress={() => router.back()} className="active:opacity-60">
            <Text className="text-skyblue font-bold text-base">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-extrabold text-oceanblue">
            {isEditing ? 'Edit Entry' : 'New Entry'}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={loading || !title.trim() || !content.trim()}
            className={`px-4 py-2 rounded-xl bg-skyblue active:bg-skyblue-600 ${
              (!title.trim() || !content.trim()) && 'opacity-55'
            }`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-sm">Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
          <View className="gap-y-6">
            {/* Title Input */}
            <View className="gap-y-1">
              <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Give your entry a title..."
                placeholderTextColor="#94a3b8"
                className="border-b border-skyblue-100 text-oceanblue-900 font-bold text-xl py-2 focus:border-skyblue"
              />
            </View>

            {/* Mood Picker */}
            <View className="gap-y-2">
              <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">How are you feeling?</Text>
              <View className="flex-row flex-wrap gap-2.5 mt-1">
                {moods.map((item) => {
                  const isSelected = selectedMood === item.type;
                  return (
                    <Pressable
                      key={item.type}
                      onPress={() => setSelectedMood(item.type)}
                      className={`px-4 py-3 rounded-2xl border flex-row items-center gap-x-2 ${
                        isSelected
                          ? 'bg-skyblue border-skyblue text-white'
                          : 'bg-skyblue-50/20 border-skyblue-100 text-oceanblue-900'
                      }`}
                    >
                      <Text className="text-lg">{item.emoji}</Text>
                      <Text className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-oceanblue-900/80'}`}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Private Mode Toggle */}
            <View className="flex-row justify-between items-center bg-skyblue-50/20 border border-skyblue-100 p-4 rounded-2xl">
              <View className="flex-1 pr-4">
                <Text className="font-bold text-oceanblue text-sm">Private Journal</Text>
                <Text className="text-xs text-oceanblue-900/60 mt-0.5">
                  Keep this entry private to yourself. Toggle off if you wish to share it with your counselor.
                </Text>
              </View>
              <Pressable
                onPress={() => setIsPrivate(!isPrivate)}
                className={`w-14 h-8 rounded-full p-1 ${isPrivate ? 'bg-skyblue' : 'bg-slate-200'}`}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white transition-all ${
                    isPrivate ? 'self-end' : 'self-start'
                  }`}
                />
              </Pressable>
            </View>

            {/* Content Input */}
            <View className="gap-y-2 flex-1">
              <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Journal Entry</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Start typing your recovery logs, feelings, reflection steps..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                className="border border-skyblue-100 bg-skyblue-50/10 text-oceanblue-900 rounded-2xl p-4 text-base focus:border-skyblue flex-grow min-h-[200px]"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
