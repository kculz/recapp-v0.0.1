import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import StaffPageHeader from '@/components/staff-page-header';

interface PostItem {
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

const CHANNELS = ['General Support', 'Daily Victories', 'Rehab & Recovery', 'Mental Health'];
const CRISIS_KEYWORDS = ['suicide', 'self-harm', 'relapse', 'overdose', 'kill myself', 'depressed', 'hurt myself', 'end my life'];

const containsCrisisKeywords = (text: string) => {
  const normalizedText = text.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => normalizedText.includes(keyword));
};

export default function StaffPostsScreen() {
  const router = useRouter();
  const { userToken, apiUrl } = useAuth();

  const [selectedChannel, setSelectedChannel] = useState(CHANNELS[0]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);

  const fetchFeed = useCallback(async () => {
    if (!userToken) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${apiUrl}/feed?channel=${encodeURIComponent(selectedChannel)}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setPosts(Array.isArray(data.data) ? data.data : []);
      } else {
        setErrorMsg(data.error || 'Failed to load staff posts.');
      }
    } catch {
      setErrorMsg('Network error. Could not load the feed.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, selectedChannel, userToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchFeed();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchFeed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  };

  const handleSubmitPost = async () => {
    if (!userToken || !title.trim() || !content.trim()) {
      return;
    }

    const draftTitle = title.trim();
    const draftContent = content.trim();

    const executeSubmit = async () => {
      setSubmitting(true);
      setErrorMsg(null);

      try {
        const response = await fetch(`${apiUrl}/feed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            channel: selectedChannel,
            title: draftTitle,
            content: draftContent,
          }),
        });
        const data = await response.json();

        if (response.ok && data.success) {
          setTitle('');
          setContent('');
          await fetchFeed();
        } else {
          setErrorMsg(data.error || 'Failed to submit post.');
        }
      } catch {
        setErrorMsg('Network error. Could not submit the post.');
      } finally {
        setSubmitting(false);
      }
    };

    if (containsCrisisKeywords(draftTitle) || containsCrisisKeywords(draftContent)) {
      Alert.alert(
        'Support Alert',
        'This post contains language that may need a support follow-up. It will still be published and flagged for review.',
        [{ text: 'Continue', onPress: () => void executeSubmit() }]
      );
      return;
    }

    await executeSubmit();
  };

  const handleLikeToggle = async (postId: number) => {
    if (!userToken) return;

    try {
      const response = await fetch(`${apiUrl}/feed/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        const { liked, likesCount } = data.data;
        setPosts((previous) =>
          previous.map((post) =>
            post.id === postId ? { ...post, userHasLiked: liked, likesCount } : post
          )
        );
      }
    } catch {
      setErrorMsg('Could not update the like status.');
    }
  };

  const formattedPosts = useMemo(() => {
    return posts.map((post) => ({
      ...post,
      preview: post.content.length > 140 ? `${post.content.slice(0, 140)}...` : post.content,
    }));
  }, [posts]);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <StaffPageHeader
          title="Posts"
          subtitle="Create community updates"
          onBack={() => router.replace('/(staff)/dashboard')}
          rightAction={
            <Pressable
              onPress={() => void handleRefresh()}
              className="px-3 py-2 rounded-xl bg-white/15 active:opacity-80"
            >
              <Text className="text-white text-xs font-extrabold">Refresh</Text>
            </Pressable>
          }
        />

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0ea5e9']} />}
        >
          {errorMsg ? (
            <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
              <Text className="text-sm font-semibold text-red-700">{errorMsg}</Text>
            </View>
          ) : null}

          <View className="rounded-3xl border border-skyblue-100 bg-white p-5 shadow-sm">
            <Text className="text-lg font-extrabold text-oceanblue">New post</Text>
            <Text className="text-xs text-oceanblue-900/55 mt-1">
              Share announcements, encouragement, and practical support with the community.
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
              <View className="flex-row gap-2">
                {CHANNELS.map((channel) => {
                  const isActive = selectedChannel === channel;
                  return (
                    <Pressable
                      key={channel}
                      onPress={() => setSelectedChannel(channel)}
                      className={`rounded-full border px-3 py-2 ${
                        isActive ? 'bg-skyblue border-skyblue' : 'bg-white border-skyblue-100'
                      }`}
                    >
                      <Text className={`text-[10px] font-black uppercase ${isActive ? 'text-white' : 'text-oceanblue'}`}>
                        {channel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor="#94a3b8"
              className="mt-4 rounded-2xl border border-skyblue-100 bg-skyblue-50/30 px-4 py-3 text-sm text-oceanblue"
            />

            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Write your message..."
              placeholderTextColor="#94a3b8"
              multiline
              className="mt-3 rounded-2xl border border-skyblue-100 bg-skyblue-50/30 px-4 py-3 text-sm text-oceanblue"
            />

            <Pressable
              onPress={() => void handleSubmitPost()}
              disabled={submitting || !title.trim() || !content.trim()}
              className={`mt-4 rounded-2xl px-4 py-4 ${
                submitting || !title.trim() || !content.trim() ? 'bg-skyblue-200' : 'bg-skyblue'
              }`}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-center text-sm font-extrabold text-white">Publish post</Text>
              )}
            </Pressable>
          </View>

          <View className="mt-6">
            <Text className="text-lg font-extrabold text-oceanblue">Latest posts</Text>
            <Text className="text-xs text-oceanblue-900/55 mt-0.5">
              {loading ? 'Loading feed...' : `${formattedPosts.length} post${formattedPosts.length === 1 ? '' : 's'} in ${selectedChannel}`}
            </Text>

            {loading ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="small" color="#0ea5e9" />
              </View>
            ) : formattedPosts.length === 0 ? (
              <Text className="py-10 text-center text-sm font-semibold text-oceanblue-900/40">
                No posts found for this channel.
              </Text>
            ) : (
              <View className="mt-4 gap-3">
                {formattedPosts.map((post) => (
                  <Pressable
                    key={post.id}
                    onPress={() => setSelectedPost(post)}
                    className="rounded-3xl border border-skyblue-100 bg-white p-4 shadow-sm active:opacity-90"
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="text-base font-extrabold text-oceanblue">{post.title}</Text>
                          {post.flagged ? (
                            <Text className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black uppercase text-rose-700">
                              Flagged
                            </Text>
                          ) : null}
                        </View>
                        <Text className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-skyblue">
                          {post.author.name} · {post.author.role} · {formatDate(post.createdAt)}
                        </Text>
                        <Text className="mt-2 text-sm text-oceanblue-900/70" numberOfLines={3}>
                          {post.preview}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row items-center justify-between gap-3">
                      <View className="flex-row items-center gap-3">
                        <Text className="text-xs font-bold text-oceanblue-900/50">
                          ❤️ {post.likesCount}
                        </Text>
                        <Text className="text-xs font-bold text-oceanblue-900/50">
                          💬 {post.commentCount}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => void handleLikeToggle(post.id)}
                        className={`rounded-2xl border px-3 py-2 ${
                          post.userHasLiked ? 'border-rose-200 bg-rose-50' : 'border-skyblue-100 bg-skyblue-50'
                        }`}
                      >
                        <Text className={`text-xs font-extrabold ${post.userHasLiked ? 'text-rose-700' : 'text-skyblue'}`}>
                          {post.userHasLiked ? 'Unlike' : 'Like'}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <Modal
          visible={!!selectedPost}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedPost(null)}
        >
          {selectedPost ? (
            <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right', 'bottom']}>
              <View className="flex-row items-center justify-between border-b border-skyblue-100 px-5 py-4">
                <Pressable onPress={() => setSelectedPost(null)} className="active:opacity-70">
                  <Text className="text-skyblue font-bold">✕ Close</Text>
                </Pressable>
                <Text className="text-lg font-extrabold text-oceanblue">Post details</Text>
                <View className="w-16" />
              </View>

              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <Text className="text-[10px] font-black uppercase tracking-wider text-skyblue">
                  {selectedPost.channel}
                </Text>
                <Text className="mt-2 text-2xl font-extrabold text-oceanblue">{selectedPost.title}</Text>
                <Text className="mt-2 text-xs font-semibold uppercase tracking-wider text-oceanblue-900/55">
                  {selectedPost.author.name} · {selectedPost.author.role}
                </Text>
                <Text className="mt-4 text-sm leading-relaxed text-oceanblue-900/80">
                  {selectedPost.content}
                </Text>
              </ScrollView>
            </SafeAreaView>
          ) : null}
        </Modal>
      </SafeAreaView>
    </View>
  );
}
