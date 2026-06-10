import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { AnimatedIcon } from '@/components/animated-icon';
import { getPostLoginRoute } from '@/utils/auth-routing';

export default function MfaScreen() {
  const router = useRouter();
  const { confirmMfa } = useAuth();
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setErrorMsg('Please enter the 6-digit code.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      const result = await confirmMfa(code);
      if (result.success) {
        router.replace(getPostLoginRoute(result.user?.role));
      } else {
        setErrorMsg(result.error || 'Invalid or expired verification code.');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
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
            {/* Header */}
            <View className="items-center mb-8">
              <View className="w-20 h-20 bg-skyblue-50 rounded-full items-center justify-center border border-skyblue-100 mb-4">
                <AnimatedIcon />
              </View>
              <Text className="text-2xl font-extrabold text-oceanblue tracking-tight">Security Code</Text>
              <Text className="text-sm font-medium text-oceanblue-900/60 mt-2 text-center max-w-xs">
                We sent a 6-digit multi-factor authorization code to your email. Check your inbox (or dev server console log).
              </Text>
            </View>

            {/* Verification Form */}
            <View className="bg-white p-6 rounded-3xl border border-skyblue-100 shadow-xl shadow-skyblue-100/50">
              <Text className="text-xl font-bold text-oceanblue mb-4 text-center">Verify Identity</Text>

              {errorMsg && (
                <View className="bg-red-50 border border-red-100 p-4 rounded-xl mb-4">
                  <Text className="text-red-700 text-sm font-medium text-center">{errorMsg}</Text>
                </View>
              )}

              <View className="gap-y-4">
                {/* Code Field */}
                <View className="gap-y-2">
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    placeholder="0 0 0 0 0 0"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    textAlign="center"
                    style={{ letterSpacing: 10 }}
                    className="border border-skyblue-100 bg-skyblue-50/30 text-oceanblue-900 font-extrabold rounded-xl p-4 text-2xl tracking-widest"
                  />
                </View>

                {/* Submit */}
                <Pressable
                  onPress={handleVerify}
                  disabled={loading}
                  className="bg-skyblue active:bg-skyblue-600 rounded-xl p-4 mt-2 items-center justify-center shadow-lg shadow-skyblue-400/30 flex-row"
                  style={({ pressed }) => pressed ? { opacity: 0.9 } : {}}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-white font-bold text-lg">Verify Code</Text>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Back Button */}
            <Pressable
              onPress={() => router.replace('/(auth)/login')}
              className="mt-6 items-center"
            >
              <Text className="text-oceanblue-900/60 font-bold text-sm">
                Cancel & Go Back
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
