import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { isStaffRole } from '@/utils/auth-routing';

export default function AppLayout() {
  const { userToken, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!userToken) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isStaffRole(user?.role)) {
    return <Redirect href="/dashboard" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="book-session" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="create-post" />
      <Stack.Screen name="post-details" />
      <Stack.Screen name="goal-editor" />
      <Stack.Screen name="journal-editor" />
    </Stack>
  );
}
