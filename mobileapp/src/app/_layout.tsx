import React, { useEffect } from 'react';
import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CallProvider } from '@/context/CallContext';
import { SocketProvider } from '@/context/SocketContext';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { initDatabase } from '@/utils/db';
import { isStaffRole } from '@/utils/auth-routing';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Initialize offline SQLite database on app boot
    initDatabase().catch((e) => console.error('SQLite initialization failed:', e));
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <CallProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AnimatedSplashOverlay />
            <RootNavigator />
          </ThemeProvider>
        </CallProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { userToken, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!userToken}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={!!userToken && isStaffRole(user?.role)}>
        <Stack.Screen name="(staff)" />
      </Stack.Protected>

      <Stack.Protected guard={!!userToken && !isStaffRole(user?.role)}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
