import * as Device from 'expo-device';
import { Platform, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { WebBadge } from '@/components/web-badge';

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <Text className="text-xs text-oceanblue-900/70">use browser devtools</Text>;
  }
  if (Device.isDevice) {
    return (
      <Text className="text-xs text-oceanblue-900/70">
        shake device or press <Text className="font-mono bg-skyblue-100 px-1 rounded text-oceanblue">m</Text> in terminal
      </Text>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <Text className="text-xs text-oceanblue-900/70">
      press <Text className="font-mono bg-skyblue-100 px-1 rounded text-oceanblue">{shortcut}</Text>
    </Text>
  );
}

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }}>
          {/* Header Card */}
          <View className="bg-oceanblue p-6 rounded-b-3xl shadow-md items-center justify-center gap-y-4">
            <View className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-inner">
              <AnimatedIcon />
            </View>
            <Text className="text-3xl font-extrabold text-white text-center tracking-tight">
              RecApp Mobile
            </Text>
            <Text className="text-sm font-medium text-skyblue-100 text-center max-w-xs">
              Welcome to your brand new Expo & Express stack!
            </Text>
          </View>

          {/* Body Section */}
          <View className="p-6 gap-y-6">
            {/* Quick Action Cards */}
            <View className="bg-white p-5 rounded-2xl shadow-sm border border-skyblue-100">
              <Text className="text-lg font-bold text-oceanblue mb-2">
                Active Theme Palette
              </Text>
              <View className="flex-row gap-x-3 mt-2">
                <View className="flex-1 items-center p-3 rounded-xl bg-skyblue-100 border border-skyblue-200">
                  <View className="w-8 h-8 rounded-full bg-skyblue" />
                  <Text className="text-xs font-semibold text-oceanblue-900 mt-2">Sky Blue</Text>
                </View>
                <View className="flex-1 items-center p-3 rounded-xl bg-white border border-skyblue-100 shadow-xs">
                  <View className="w-8 h-8 rounded-full bg-white border border-skyblue-200" />
                  <Text className="text-xs font-semibold text-oceanblue-900 mt-2">White</Text>
                </View>
                <View className="flex-1 items-center p-3 rounded-xl bg-oceanblue/10 border border-oceanblue/20">
                  <View className="w-8 h-8 rounded-full bg-oceanblue" />
                  <Text className="text-xs font-semibold text-oceanblue mt-2">Ocean Blue</Text>
                </View>
              </View>
            </View>

            {/* Development Hints */}
            <View className="bg-white p-5 rounded-2xl shadow-sm border border-skyblue-100 gap-y-4">
              <Text className="text-lg font-bold text-oceanblue">
                Getting Started
              </Text>
              
              <View className="gap-y-3">
                <View className="border-b border-skyblue-50 pb-2">
                  <Text className="text-xs font-bold text-oceanblue-900 uppercase tracking-wide">Editing Path</Text>
                  <Text className="text-sm text-oceanblue/85 font-mono mt-1 bg-skyblue-50 p-2 rounded">src/app/index.tsx</Text>
                </View>

                <View className="border-b border-skyblue-50 pb-2">
                  <Text className="text-xs font-bold text-oceanblue-900 uppercase tracking-wide">Developer Menu</Text>
                  <View className="mt-1">{getDevMenuHint()}</View>
                </View>

                <View className="pb-1">
                  <Text className="text-xs font-bold text-oceanblue-900 uppercase tracking-wide">Fresh Start</Text>
                  <Text className="text-sm text-oceanblue/85 font-mono mt-1 bg-skyblue-50 p-2 rounded">npm run reset-project</Text>
                </View>
              </View>
            </View>

            {/* Backend Connectivity Status Mock */}
            <View className="bg-white p-5 rounded-2xl shadow-sm border border-skyblue-100 items-center justify-between flex-row">
              <View className="gap-y-1">
                <Text className="text-sm font-bold text-oceanblue-900">Backend Server</Text>
                <Text className="text-xs text-oceanblue-900/70">Connecting to http://localhost:5001...</Text>
              </View>
              <View className="bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
                <Text className="text-xs font-bold text-emerald-700">Online</Text>
              </View>
            </View>

            {Platform.OS === 'web' && (
              <View className="items-center mt-2">
                <WebBadge />
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
