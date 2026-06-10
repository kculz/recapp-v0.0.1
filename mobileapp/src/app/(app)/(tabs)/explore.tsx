import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export interface PostItem {
  id: number;
  userId: number;
  channel: string;
  title: string;
  content: string;
  likesCount: number;
  flagged: boolean;
  createdAt: string;
  author: {
    id: number;
    name: string;
    role: string;
  };
  commentCount: number;
  userHasLiked: boolean;
}

const CHANNELS = [
  'General Support',
  'Daily Victories',
  'Rehab & Recovery',
  'Mental Health'
];

export default function CommunityFeedScreen() {
  const router = useRouter();
  const { userToken, apiUrl } = useAuth();

  const [selectedChannel, setSelectedChannel] = useState(CHANNELS[0]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchFeed = async (showLoader = false) => {
    if (!userToken) return;
    if (showLoader) setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(
        `${apiUrl}/feed?channel=${encodeURIComponent(selectedChannel)}`,
        {
          headers: { 'Authorization': `Bearer ${userToken}` }
        }
      );
      const resData = await response.json();
      if (response.ok && resData.success) {
        setPosts(resData.data);
      } else {
        setErrorMsg(resData.error || 'Failed to load posts feed.');
      }
    } catch (err) {
      setErrorMsg('Network error. Check server status.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Reload feed when selected channel changes
  useEffect(() => {
    fetchFeed(true);
  }, [selectedChannel]);

  // Reload feed when screen comes into focus (e.g. after adding post or returning from details)
  useFocusEffect(
    useCallback(() => {
      fetchFeed(false);
    }, [selectedChannel])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed(false);
    setRefreshing(false);
  };

  const handleLikeToggle = async (postId: number) => {
    if (!userToken) return;
    try {
      const response = await fetch(`${apiUrl}/feed/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        const { liked, likesCount } = resData.data;
        // Update local state instantly
        setPosts(prev =>
          prev.map(p =>
            p.id === postId ? { ...p, userHasLiked: liked, likesCount } : p
          )
        );
      }
    } catch (err) {
      console.log('Failed to toggle like:', err);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
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
            <Text className="text-2xl font-extrabold text-white tracking-tight">Peer Support</Text>
            <Text className="text-xs font-semibold text-skyblue-100 mt-0.5">Share hope and walk together</Text>
          </View>
        </View>

        {/* Channel Horizontal Scroller */}
        <View className="py-3 bg-white border-b border-skyblue-100 shadow-xs">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
            {CHANNELS.map((ch) => {
              const isSelected = selectedChannel === ch;
              return (
                <Pressable
                  key={ch}
                  onPress={() => setSelectedChannel(ch)}
                  className={`px-4 py-2 rounded-full border mr-2.5 ${
                    isSelected
                      ? 'bg-skyblue border-skyblue'
                      : 'bg-white border-skyblue-100 active:bg-skyblue-50/20'
                  }`}
                >
                  <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-oceanblue-900/80'}`}>
                    {ch}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Support Feed Timeline */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 110, paddingTop: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0ea5e9']} />
          }
        >
          {errorMsg && (
            <View className="mx-4 bg-red-50 border border-red-100 p-4 rounded-2xl mb-4">
              <Text className="text-red-700 text-sm font-medium text-center">{errorMsg}</Text>
            </View>
          )}

          {loading ? (
            <View className="flex-1 justify-center items-center py-20">
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text className="text-xs text-oceanblue-900/60 font-semibold mt-3">Loading discussion feed...</Text>
            </View>
          ) : posts.length === 0 ? (
            <View className="flex-1 justify-center items-center px-6 py-20">
              <Text className="text-5xl mb-4">💬</Text>
              <Text className="text-xl font-bold text-oceanblue text-center">Empty Discussion</Text>
              <Text className="text-sm font-medium text-oceanblue-900/60 text-center mt-2 max-w-xs">
                Be the first to share a post in the #{selectedChannel} channel!
              </Text>
            </View>
          ) : (
            <View className="px-4 gap-y-4">
              {posts.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    // Navigate to details page
                    router.push({
                      pathname: '/(app)/post-details',
                      params: {
                        id: item.id,
                        title: item.title,
                        content: item.content,
                        authorName: item.author.name,
                        authorRole: item.author.role,
                        date: item.createdAt,
                        likesCount: item.likesCount,
                        commentCount: item.commentCount,
                        userHasLiked: item.userHasLiked ? '1' : '0',
                        flagged: item.flagged ? '1' : '0'
                      }
                    });
                  }}
                  className="bg-white p-5 rounded-2xl border border-skyblue-100 shadow-sm shadow-skyblue-100/30"
                >
                  {/* Card Header */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center gap-x-2">
                      <View className="w-8 h-8 rounded-full bg-skyblue-100 items-center justify-center border border-skyblue-200">
                        <Text className="text-xs font-bold text-oceanblue">{item.author.name.substring(0, 1).toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text className="text-sm font-bold text-oceanblue-900">{item.author.name}</Text>
                        <Text className="text-[10px] text-oceanblue-900/60 font-semibold mt-0.5">{formatDate(item.createdAt)}</Text>
                      </View>
                    </View>

                    {/* Role Tag & Safety Flag */}
                    <View className="flex-row items-center gap-x-2">
                      {item.author.role === 'Counselor' && (
                        <View className="bg-skyblue-100 border border-skyblue-200 px-2 py-0.5 rounded-full">
                          <Text className="text-[9px] font-extrabold text-skyblue-600">Counselor</Text>
                        </View>
                      )}
                      
                      {item.flagged && (
                        <View className="bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full">
                          <Text className="text-[9px] font-extrabold text-rose-600">⚠️ Flagged</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text className="text-base font-bold text-oceanblue">{item.title}</Text>
                  <Text className="text-sm text-oceanblue-900/80 mt-1 line-clamp-4 leading-relaxed" numberOfLines={4}>
                    {item.content}
                  </Text>

                  {/* Actions Row */}
                  <View className="flex-row items-center gap-x-6 mt-4 border-t border-skyblue-50 pt-3">
                    {/* Like Action */}
                    <Pressable
                      onPress={() => handleLikeToggle(item.id)}
                      className="flex-row items-center gap-x-1.5 py-1"
                    >
                      <Text className="text-base">{item.userHasLiked ? '❤️' : '🤍'}</Text>
                      <Text className="text-xs font-bold text-oceanblue-900/70">{item.likesCount}</Text>
                    </Pressable>

                    {/* Comments Count */}
                    <View className="flex-row items-center gap-x-1.5 py-1">
                      <Text className="text-base">💬</Text>
                      <Text className="text-xs font-bold text-oceanblue-900/70">{item.commentCount} comments</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <Pressable
          onPress={() => router.push('/(app)/create-post')}
          className="absolute bottom-6 right-6 w-14 h-14 bg-skyblue active:bg-skyblue-600 rounded-full items-center justify-center shadow-lg shadow-skyblue-400/50"
        >
          <Text className="text-white text-3xl font-extrabold" style={{ marginTop: -2 }}>+</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
