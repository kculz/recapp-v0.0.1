import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { AnimatedIcon } from '@/components/animated-icon';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      const result = await signIn(email.trim().toLowerCase(), password);
      if (result.success) {
        if (result.requireMfa) {
          router.replace('/(auth)/mfa');
        }
      } else {
        setErrorMsg(result.error || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMsg('Network error. Check connection to backend server.');
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
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-6 py-12">
            {/* Header / Logo */}
            <View className="items-center mb-10">
              <View className="w-24 h-24 bg-skyblue-50 rounded-full items-center justify-center shadow-sm border border-skyblue-100 mb-4">
                <AnimatedIcon />
              </View>
              <Text className="text-3xl font-extrabold text-oceanblue tracking-tight">RecApp</Text>
              <Text className="text-sm font-medium text-oceanblue-900/60 mt-1 text-center">
                Rehabilitation & Counseling Client Portal
              </Text>
            </View>

            {/* Login Card */}
            <View className="bg-white p-6 rounded-3xl border border-skyblue-100 shadow-xl shadow-skyblue-100/50">
              <Text className="text-2xl font-bold text-oceanblue mb-6">Sign In</Text>

              {errorMsg && (
                <View className="bg-red-50 border border-red-100 p-4 rounded-xl mb-4">
                  <Text className="text-red-600 text-xs font-bold uppercase tracking-wider mb-0.5">Error</Text>
                  <Text className="text-red-700 text-sm font-medium">{errorMsg}</Text>
                </View>
              )}

              <View className="gap-y-4">
                {/* Email Field */}
                <View className="gap-y-1">
                  <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Email Address</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@example.com"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="border border-skyblue-100 bg-skyblue-50/30 text-oceanblue-900 rounded-xl p-3.5 text-base focus:border-skyblue"
                  />
                </View>

                {/* Password Field */}
                <View className="gap-y-1">
                  <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Password</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    autoCapitalize="none"
                    className="border border-skyblue-100 bg-skyblue-50/30 text-oceanblue-900 rounded-xl p-3.5 text-base focus:border-skyblue"
                  />
                </View>

                {/* Submit Button */}
                <Pressable
                  onPress={handleLogin}
                  disabled={loading}
                  className="bg-skyblue active:bg-skyblue-600 rounded-xl p-4 mt-2 items-center justify-center shadow-lg shadow-skyblue-400/30 flex-row gap-x-2"
                  style={({ pressed }) => pressed ? { opacity: 0.9 } : {}}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-white font-bold text-lg">Send Verification Code</Text>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Bottom Invitation Flow Link */}
            <View className="mt-8 items-center gap-y-2">
              <Text className="text-sm text-oceanblue-900/60">Received an email invitation?</Text>
              <Pressable
                onPress={() => router.push('/(auth)/activate')}
                className="active:opacity-80"
              >
                <Text className="text-skyblue font-bold text-sm underline">Activate Invitation Code</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
