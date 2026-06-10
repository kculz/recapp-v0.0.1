import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

interface CommentItem {
  id: number;
  postId: number;
  userId: number;
  content: string;
  flagged: boolean;
  createdAt: string;
  author: {
    id: number;
    name: string;
    role: string;
  };
}

const CRISIS_KEYWORDS = [
  'suicide', 'self-harm', 'relapse', 'overdose', 'kill myself', 'depressed', 'hurt myself', 'end my life'
];

export default function PostDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userToken, apiUrl } = useAuth();

  const postId = parseInt(params.id as string, 10);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  
  const [liked, setLiked] = useState(params.userHasLiked === '1');
  const [likesCount, setLikesCount] = useState(parseInt(params.likesCount as string || '0', 10));

  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchComments = async () => {
    if (!userToken || isNaN(postId)) return;
    setLoadingComments(true);
    try {
      const response = await fetch(`${apiUrl}/feed/${postId}/comments`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        setComments(resData.data);
      }
    } catch (e) {
      console.error('Failed to fetch comment threads:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [userToken, postId]);

  const handleLikeToggle = async () => {
    if (!userToken || isNaN(postId)) return;
    try {
      const response = await fetch(`${apiUrl}/feed/${postId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        const { liked: activeLiked, likesCount: activeCount } = resData.data;
        setLiked(activeLiked);
        setLikesCount(activeCount);
      }
    } catch (err) {
      console.log('Failed to toggle like:', err);
    }
  };

  const containsCrisisKeywords = (text: string) => {
    const lower = text.toLowerCase();
    return CRISIS_KEYWORDS.some(k => lower.includes(k));
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;

    const isCrisisDetected = containsCrisisKeywords(commentText);
    
    if (isCrisisDetected) {
      Alert.alert(
        "Support Alert",
        "Your comment contains words of concern. It will be posted, but counselors will be notified to review and offer support if needed. Please remember we are here to support you.",
        [{ text: "Continue", onPress: () => executeCommentSubmit() }]
      );
    } else {
      executeCommentSubmit();
    }
  };

  const executeCommentSubmit = async () => {
    setSubmittingComment(true);
    setErrorMsg(null);
    const draftText = commentText.trim();
    setCommentText('');

    try {
      const response = await fetch(`${apiUrl}/feed/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ content: draftText })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        // Refresh list
        await fetchComments();
      } else {
        setErrorMsg(resData.error || 'Failed to submit comment.');
        setCommentText(draftText);
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to add comment.');
      setCommentText(draftText);
    } finally {
      setSubmittingComment(false);
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
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Navigation Header */}
        <View className="px-5 py-4 border-b border-skyblue-100 flex-row justify-between items-center bg-white">
          <Pressable onPress={() => router.back()} className="active:opacity-60">
            <Text className="text-skyblue font-bold text-base">Back</Text>
          </Pressable>
          <Text className="text-lg font-extrabold text-oceanblue">Discussion</Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1 bg-skyblue-50"
          contentContainerStyle={{ paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Content Card */}
          <View className="bg-white p-5 rounded-b-3xl border-b border-skyblue-100 shadow-xs mb-4">
            {/* Author details */}
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-x-2">
                <View className="w-8 h-8 rounded-full bg-skyblue-100 items-center justify-center border border-skyblue-200">
                  <Text className="text-xs font-bold text-oceanblue">
                    {(params.authorName as string || 'U').substring(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text className="text-sm font-bold text-oceanblue-900">{params.authorName}</Text>
                  <Text className="text-[10px] text-oceanblue-900/60 font-semibold mt-0.5">
                    {formatDate(params.date as string)}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-x-2">
                {params.authorRole === 'Counselor' && (
                  <View className="bg-skyblue-100 border border-skyblue-200 px-2 py-0.5 rounded-full">
                    <Text className="text-[9px] font-extrabold text-skyblue-600">Counselor</Text>
                  </View>
                )}
                {params.flagged === '1' && (
                  <View className="bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full">
                    <Text className="text-[9px] font-extrabold text-rose-600">⚠️ Flagged</Text>
                  </View>
                )}
              </View>
            </View>

            <Text className="text-xl font-bold text-oceanblue mt-2">{params.title}</Text>
            <Text className="text-sm text-oceanblue-900/80 mt-2.5 leading-relaxed">{params.content}</Text>

            {/* Like Action */}
            <Pressable
              onPress={handleLikeToggle}
              className="flex-row items-center mt-5 border-t border-skyblue-50 pt-3 py-1"
            >
              <Text className="text-lg mr-2">{liked ? '❤️' : '🤍'}</Text>
              <Text className="text-xs font-bold text-oceanblue-900/70">{likesCount} likes</Text>
            </Pressable>
          </View>

          {/* Comment Thread List */}
          <View className="px-4 gap-y-3">
            <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider mb-1">
              Comments ({comments.length})
            </Text>

            {loadingComments ? (
              <ActivityIndicator size="small" color="#0ea5e9" className="py-6" />
            ) : comments.length === 0 ? (
              <View className="bg-white p-5 rounded-2xl border border-skyblue-100 items-center">
                <Text className="text-sm font-semibold text-oceanblue-900/50">No replies yet.</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View
                  key={comment.id}
                  className="bg-white p-4 rounded-2xl border border-skyblue-100 shadow-sm shadow-skyblue-100/30"
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-row items-center gap-x-2">
                      <Text className="text-xs font-bold text-oceanblue-900">{comment.author.name}</Text>
                      {comment.author.role === 'Counselor' && (
                        <View className="bg-skyblue-100 px-1.5 py-0.5 rounded">
                          <Text className="text-[8px] font-extrabold text-skyblue-600 uppercase">Counselor</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[9px] text-oceanblue-900/50 font-semibold">
                      {formatDate(comment.createdAt)}
                    </Text>
                  </View>

                  <Text className="text-sm text-oceanblue-900">{comment.content}</Text>

                  {comment.flagged && (
                    <View className="bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full mt-2 self-start flex-row items-center">
                      <Text className="text-[8px] font-bold text-rose-600">⚠️ Flagged Content</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {errorMsg && (
          <View className="bg-red-50 border-t border-red-100 p-2.5">
            <Text className="text-red-700 text-xs font-semibold text-center">{errorMsg}</Text>
          </View>
        )}

        {/* Comment Entry Footer */}
        <View className="p-4 border-t border-skyblue-100 bg-white flex-row items-center gap-x-3">
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Write a reply..."
            placeholderTextColor="#94a3b8"
            className="flex-1 bg-skyblue-50/20 border border-skyblue-100 text-oceanblue-900 text-base rounded-2xl px-4 py-3.5 focus:border-skyblue"
            onSubmitEditing={handleCommentSubmit}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={handleCommentSubmit}
            disabled={submittingComment || !commentText.trim()}
            className={`bg-oceanblue active:bg-oceanblue-900 w-12 h-12 rounded-full items-center justify-center shadow-md ${
              (!commentText.trim() || submittingComment) && 'opacity-55'
            }`}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white font-extrabold text-base">→</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
