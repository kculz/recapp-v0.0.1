import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Resource {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  isPublished: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['All', 'Rehab', 'Mental Health', 'Mindfulness', 'Life Skills', 'Crisis Support'];

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  Article: { emoji: '📄', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  Video:   { emoji: '🎬', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  Audio:   { emoji: '🎧', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  PDF:     { emoji: '📑', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const CATEGORY_EMOJI: Record<string, string> = {
  'Rehab': '💪',
  'Mental Health': '🧠',
  'Mindfulness': '🧘',
  'Life Skills': '🌱',
  'Crisis Support': '🆘',
  'All': '📚',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LibraryScreen() {
  const { userToken, apiUrl } = useAuth();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchResources = async (showLoader = false) => {
    if (!userToken) return;
    if (showLoader) setLoading(true);
    setErrorMsg(null);
    try {
      const params = selectedCategory !== 'All' ? `?category=${encodeURIComponent(selectedCategory)}` : '';
      const res = await fetch(`${apiUrl}/library${params}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResources(data.data.resources || []);
      } else {
        setErrorMsg(data.error || 'Failed to load resources.');
      }
    } catch {
      setErrorMsg('Network error. Check your connection.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources(true);
  }, [selectedCategory, userToken]);

  useFocusEffect(useCallback(() => { fetchResources(false); }, [selectedCategory]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchResources(false);
    setRefreshing(false);
  };

  const handleOpen = (url: string) => {
    Linking.openURL(url).catch(() => alert('Could not open this resource.'));
  };

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>

        {/* Header */}
        <View className="bg-oceanblue p-5 rounded-b-3xl shadow-md">
          <Text className="text-2xl font-extrabold text-white tracking-tight">Resource Library</Text>
          <Text className="text-xs font-semibold text-skyblue-100 mt-0.5">
            Guides, articles & videos curated for your journey
          </Text>
        </View>

        {/* Category Filter */}
        <View className="py-3 bg-white border-b border-skyblue-100 shadow-xs">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full border mr-2.5 flex-row items-center gap-x-1.5 ${
                    isActive ? 'bg-skyblue border-skyblue' : 'bg-white border-skyblue-100 active:bg-skyblue-50'
                  }`}
                >
                  <Text className="text-sm">{CATEGORY_EMOJI[cat]}</Text>
                  <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-oceanblue-900/80'}`}>
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Resource Feed */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 110, paddingTop: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />}
        >
          {errorMsg && (
            <View className="mx-4 mb-4 bg-red-50 border border-red-100 p-4 rounded-2xl">
              <Text className="text-red-700 text-sm font-medium text-center">{errorMsg}</Text>
            </View>
          )}

          {loading ? (
            <View className="flex-1 justify-center items-center py-20">
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text className="text-xs text-oceanblue-900/60 font-semibold mt-3">Loading resources...</Text>
            </View>
          ) : resources.length === 0 ? (
            <View className="flex-1 justify-center items-center px-6 py-20">
              <Text className="text-5xl mb-4">📚</Text>
              <Text className="text-xl font-bold text-oceanblue text-center">No Resources Yet</Text>
              <Text className="text-sm font-medium text-oceanblue-900/60 text-center mt-2 max-w-xs">
                Resources in this category will appear here once published by your care team.
              </Text>
            </View>
          ) : (
            <View className="px-4 gap-y-4">
              {resources.map((item) => {
                const typeInfo = TYPE_CONFIG[item.type] || TYPE_CONFIG.Article;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedResource(item)}
                    className="bg-white p-5 rounded-2xl border border-skyblue-100 shadow-sm active:opacity-90"
                  >
                    {/* Top Row */}
                    <View className="flex-row justify-between items-start mb-3">
                      <View className={`flex-row items-center gap-x-1.5 px-2.5 py-1 rounded-full border ${typeInfo.color}`}>
                        <Text className="text-xs">{typeInfo.emoji}</Text>
                        <Text className="text-[10px] font-extrabold uppercase tracking-wider">{item.type}</Text>
                      </View>
                      <View className="bg-skyblue-50 border border-skyblue-100 px-2.5 py-1 rounded-full">
                        <Text className="text-[10px] font-bold text-oceanblue-900/70">
                          {CATEGORY_EMOJI[item.category]} {item.category}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-base font-bold text-oceanblue leading-snug">{item.title}</Text>
                    {item.description ? (
                      <Text className="text-sm text-oceanblue-900/70 mt-1.5 leading-relaxed" numberOfLines={3}>
                        {item.description}
                      </Text>
                    ) : null}

                    <View className="mt-4 pt-3 border-t border-skyblue-50 flex-row items-center justify-between">
                      <Text className="text-xs text-skyblue font-bold">Tap to open →</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Resource Detail Modal */}
      <Modal
        visible={!!selectedResource}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedResource(null)}
      >
        {selectedResource && (
          <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right', 'bottom']}>
            <View className="px-5 py-4 border-b border-skyblue-100 flex-row justify-between items-center">
              <Pressable onPress={() => setSelectedResource(null)} className="active:opacity-60">
                <Text className="text-skyblue font-bold text-base">✕ Close</Text>
              </Pressable>
              <View className={`flex-row items-center gap-x-1.5 px-2.5 py-1 rounded-full border ${TYPE_CONFIG[selectedResource.type]?.color}`}>
                <Text className="text-xs">{TYPE_CONFIG[selectedResource.type]?.emoji}</Text>
                <Text className="text-[10px] font-extrabold uppercase tracking-wider">{selectedResource.type}</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }}>
              <View className="bg-skyblue-50 border border-skyblue-100 px-3 py-1.5 rounded-full self-start mb-4">
                <Text className="text-xs font-bold text-oceanblue-900/70">
                  {CATEGORY_EMOJI[selectedResource.category]} {selectedResource.category}
                </Text>
              </View>

              <Text className="text-2xl font-extrabold text-oceanblue leading-snug mb-4">
                {selectedResource.title}
              </Text>

              {selectedResource.description ? (
                <Text className="text-base text-oceanblue-900/80 leading-relaxed">
                  {selectedResource.description}
                </Text>
              ) : (
                <Text className="text-sm text-oceanblue-900/50 italic">No description provided.</Text>
              )}
            </ScrollView>

            <View className="p-5 border-t border-skyblue-100">
              <Pressable
                onPress={() => handleOpen(selectedResource.url)}
                className="bg-oceanblue active:bg-oceanblue-900 p-4 rounded-2xl items-center shadow-md"
              >
                <Text className="text-white font-extrabold text-base">Open Resource →</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}
