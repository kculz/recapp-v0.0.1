import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { isStaffRole } from '@/utils/auth-routing';

export const unstable_settings = {
  initialRouteName: 'dashboard',
};

export default function StaffLayout() {
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

  if (!isStaffRole(user?.role)) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="calls" />
      <Stack.Screen name="resources" />
      <Stack.Screen name="posts" />
    </Stack>
  );
}
