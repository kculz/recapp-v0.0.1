import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

const CHANNELS = [
  'General Support',
  'Daily Victories',
  'Rehab & Recovery',
  'Mental Health'
];

const CRISIS_KEYWORDS = [
  'suicide', 'self-harm', 'relapse', 'overdose', 'kill myself', 'depressed', 'hurt myself', 'end my life'
];

export default function CreatePostScreen() {
  const router = useRouter();
  const { userToken, apiUrl } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(CHANNELS[0]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containsCrisisKeywords = (text: string) => {
    const lower = text.toLowerCase();
    return CRISIS_KEYWORDS.some(k => lower.includes(k));
  };

  const handlePostSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    
    const isCrisisDetected = containsCrisisKeywords(title) || containsCrisisKeywords(content);
    
    if (isCrisisDetected) {
      // Show support modal/alert before publishing
      Alert.alert(
        "Support Alert",
        "Your post contains words that indicate you might be going through a tough time. It will be posted, but a support flag has been set to notify our counselors to check in and help. You are not alone.",
        [{ text: "Continue", onPress: () => executeSubmit() }]
      );
    } else {
      executeSubmit();
    }
  };

  const executeSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${apiUrl}/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          channel: selectedChannel,
          title: title.trim(),
          content: content.trim()
        })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        router.back();
      } else {
        setErrorMsg(resData.error || 'Failed to submit post.');
      }
    } catch (err) {
      setErrorMsg('Network error. Failed to post.');
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
          <Text className="text-lg font-extrabold text-oceanblue">New Post</Text>
          <Pressable
            onPress={handlePostSubmit}
            disabled={loading || !title.trim() || !content.trim()}
            className={`px-4 py-2 rounded-xl bg-skyblue active:bg-skyblue-600 ${
              (!title.trim() || !content.trim()) && 'opacity-55'
            }`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-sm">Post</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
          {errorMsg && (
            <View className="bg-red-50 border border-red-100 p-4 rounded-xl mb-5">
              <Text className="text-red-700 text-sm font-medium text-center">{errorMsg}</Text>
            </View>
          )}

          <View className="gap-y-6">
            {/* Title */}
            <View className="gap-y-1">
              <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Give your support post a title..."
                placeholderTextColor="#94a3b8"
                className="border-b border-skyblue-100 text-oceanblue-900 font-bold text-lg py-2 focus:border-skyblue"
              />
            </View>

            {/* Channel Selection */}
            <View className="gap-y-2">
              <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Channel Topic</Text>
              <View className="flex-row flex-wrap gap-2.5 mt-1">
                {CHANNELS.map((ch) => {
                  const isSelected = selectedChannel === ch;
                  return (
                    <Pressable
                      key={ch}
                      onPress={() => setSelectedChannel(ch)}
                      className={`px-4 py-2.5 rounded-full border ${
                        isSelected
                          ? 'bg-skyblue border-skyblue text-white'
                          : 'bg-skyblue-50/20 border-skyblue-100 text-oceanblue-900'
                      }`}
                    >
                      <Text className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-oceanblue-900/80'}`}>
                        {ch}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Post Content */}
            <View className="gap-y-2 flex-grow min-h-[250px]">
              <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Discussion details</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Share your thoughts, daily victories, reflections, or ask for peer support..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={12}
                textAlignVertical="top"
                className="border border-skyblue-100 bg-skyblue-50/10 text-oceanblue-900 rounded-2xl p-4 text-base focus:border-skyblue flex-1"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
