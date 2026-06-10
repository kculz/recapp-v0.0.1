import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useJournal } from '@/hooks/useJournal';
import { LocalJournal } from '@/utils/db';

const moodEmoji: Record<LocalJournal['mood'], string> = {
  Calm: '🧘',
  Happy: '😊',
  Anxious: '😰',
  Sad: '😢',
  Hopeful: '🌅',
  Angry: '😠'
};

const moodColor: Record<LocalJournal['mood'], string> = {
  Calm: 'bg-teal-50 border-teal-200 text-teal-700',
  Happy: 'bg-amber-50 border-amber-200 text-amber-700',
  Anxious: 'bg-purple-50 border-purple-200 text-purple-700',
  Sad: 'bg-blue-50 border-blue-200 text-blue-700',
  Hopeful: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Angry: 'bg-rose-50 border-rose-200 text-rose-700'
};

export default function JournalScreen() {
  const router = useRouter();
  const { journals, isSyncing, syncError, loadJournals, syncWithServer, removeJournal } = useJournal();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadJournals();
    syncWithServer();
  }, [loadJournals, syncWithServer]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncWithServer();
    setRefreshing(false);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        {/* Header */}
        <View className="bg-oceanblue p-5 rounded-b-3xl shadow-md flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-extrabold text-white tracking-tight">Recovery Journal</Text>
            <Text className="text-xs font-semibold text-skyblue-100 mt-0.5">Your private thoughts, stored securely</Text>
          </View>
          
          <Pressable
            onPress={() => syncWithServer()}
            disabled={isSyncing}
            className="bg-white/10 active:bg-white/20 p-2.5 rounded-full"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-xs font-bold px-1">Sync</Text>
            )}
          </Pressable>
        </View>

        {/* Sync Warning if exists */}
        {syncError && (
          <View className="mx-4 mt-3 bg-amber-50 border border-amber-200 p-3 rounded-xl flex-row justify-between items-center">
            <Text className="text-xs font-semibold text-amber-800 flex-1">
              Offline Mode Active. Drafts saved locally.
            </Text>
          </View>
        )}

        {/* Timeline List */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 110, paddingTop: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />
          }
        >
          {journals.length === 0 ? (
            <View className="flex-1 justify-center items-center px-6 py-20">
              <Text className="text-5xl mb-4">📓</Text>
              <Text className="text-xl font-bold text-oceanblue text-center">Start Your Journal</Text>
              <Text className="text-sm font-medium text-oceanblue-900/60 text-center mt-2 max-w-xs">
                Write down your feelings, goals, and recovery steps. Your drafts will sync automatically when you're online.
              </Text>
            </View>
          ) : (
            <View className="px-4 gap-y-4">
              {journals.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    // Navigate to editor with parameters
                    router.push({
                      pathname: '/(app)/journal-editor',
                      params: {
                        id: item.id,
                        serverId: item.server_id,
                        title: item.title,
                        content: item.content,
                        mood: item.mood,
                        isPrivate: item.isPrivate ? '1' : '0',
                        entryDate: item.entryDate
                      }
                    });
                  }}
                  className="bg-white p-5 rounded-2xl border border-skyblue-100 shadow-sm shadow-skyblue-100/30"
                >
                  <View className="flex-row justify-between items-start">
                    {/* Mood & Date */}
                    <View className="flex-row items-center gap-x-2">
                      <View className={`px-2.5 py-1 rounded-full border flex-row items-center gap-x-1 ${moodColor[item.mood]}`}>
                        <Text className="text-xs font-bold">{moodEmoji[item.mood]} {item.mood}</Text>
                      </View>
                      
                      {/* Sync Status Badge */}
                      {item.syncStatus !== 'synced' ? (
                        <View className="bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] font-bold text-amber-700 uppercase">Draft</Text>
                        </View>
                      ) : (
                        <View className="bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] font-bold text-emerald-700 uppercase">Synced</Text>
                        </View>
                      )}
                    </View>

                    {/* Delete Trigger */}
                    <Pressable
                      onPress={() => removeJournal(item.id)}
                      className="active:opacity-60 p-1"
                    >
                      <Text className="text-red-500 font-bold text-xs">Delete</Text>
                    </Pressable>
                  </View>

                  <Text className="text-lg font-bold text-oceanblue mt-3">{item.title}</Text>
                  <Text className="text-sm text-oceanblue-900/80 mt-1 line-clamp-3 leading-relaxed" numberOfLines={3}>
                    {item.content}
                  </Text>

                  <View className="flex-row justify-between items-center mt-4 border-t border-skyblue-50 pt-3">
                    <Text className="text-xs text-oceanblue-900/60 font-semibold">{formatDate(item.entryDate)}</Text>
                    {item.isPrivate && (
                      <View className="flex-row items-center gap-x-1">
                        <Text className="text-xs text-oceanblue-900/50 font-bold">🔒 Private</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <Pressable
          onPress={() => router.push('/(app)/journal-editor')}
          className="absolute bottom-6 right-6 w-14 h-14 bg-skyblue active:bg-skyblue-600 rounded-full items-center justify-center shadow-lg shadow-skyblue-400/50"
        >
          <Text className="text-white text-3xl font-extrabold" style={{ marginTop: -2 }}>+</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
