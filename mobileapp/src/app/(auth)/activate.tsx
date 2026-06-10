import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { AnimatedIcon } from '@/components/animated-icon';

export default function ActivateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { signUpActivation, apiUrl } = useAuth();
  
  // Read token from URL query parameters if navigated via deep link, otherwise manual input
  const [token, setToken] = useState((params.token as string) || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingActivate, setLoadingActivate] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleVerifyToken = async () => {
    if (!token.trim()) {
      setErrorMsg('Please enter an activation code.');
      return;
    }
    setErrorMsg(null);
    setLoadingVerify(true);

    try {
      const response = await fetch(`${apiUrl}/auth/verify-activation?token=${token.trim()}`);
      const resData = await response.json();

      if (response.ok && resData.success) {
        setVerifiedEmail(resData.data.email);
        setVerifiedName(resData.data.name);
      } else {
        setErrorMsg(resData.error || 'Invalid or expired activation link.');
      }
    } catch (err) {
      setErrorMsg('Network error. Check server status.');
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleActivate = async () => {
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setErrorMsg(null);
    setLoadingActivate(true);

    try {
      const result = await signUpActivation(token.trim(), password);
      if (result.success) {
        setSuccessMsg('Account activated successfully! You can now log in.');
        // Clear fields
        setPassword('');
        setConfirmPassword('');
        setVerifiedEmail(null);
        setVerifiedName(null);
        setToken('');
      } else {
        setErrorMsg(result.error || 'Activation failed.');
      }
    } catch (err) {
      setErrorMsg('Network error occurred during activation.');
    } finally {
      setLoadingActivate(false);
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
              <Text className="text-2xl font-extrabold text-oceanblue tracking-tight">Activate Account</Text>
              <Text className="text-sm font-medium text-oceanblue-900/60 mt-1 text-center">
                Set up a secure password to activate your RecApp portal invite.
              </Text>
            </View>

            {/* Main Form */}
            <View className="bg-white p-6 rounded-3xl border border-skyblue-100 shadow-xl shadow-skyblue-100/50">
              
              {errorMsg && (
                <View className="bg-red-50 border border-red-100 p-4 rounded-xl mb-4">
                  <Text className="text-red-700 text-sm font-medium text-center">{errorMsg}</Text>
                </View>
              )}

              {successMsg && (
                <View className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-4">
                  <Text className="text-emerald-700 text-sm font-medium text-center mb-3">{successMsg}</Text>
                  <Pressable
                    onPress={() => {
                      setSuccessMsg(null);
                      router.replace('/(auth)/login');
                    }}
                    className="bg-emerald-600 rounded-lg p-2.5 items-center"
                  >
                    <Text className="text-white font-bold text-sm">Proceed to Login</Text>
                  </Pressable>
                </View>
              )}

              {!verifiedEmail && !successMsg && (
                <View className="gap-y-4">
                  <Text className="text-base font-bold text-oceanblue mb-1">Enter Invitation Code</Text>
                  
                  <View className="gap-y-1">
                    <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Activation Token</Text>
                    <TextInput
                      value={token}
                      onChangeText={setToken}
                      placeholder="Paste activation code here..."
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                      className="border border-skyblue-100 bg-skyblue-50/30 text-oceanblue-900 rounded-xl p-3.5 text-base focus:border-skyblue"
                    />
                  </View>

                  <Pressable
                    onPress={handleVerifyToken}
                    disabled={loadingVerify}
                    className="bg-skyblue active:bg-skyblue-600 rounded-xl p-4 mt-2 items-center justify-center shadow-lg shadow-skyblue-400/30 flex-row"
                    style={({ pressed }) => pressed ? { opacity: 0.9 } : {}}
                  >
                    {loadingVerify ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text className="text-white font-bold text-lg">Verify Code</Text>
                    )}
                  </Pressable>
                </View>
              )}

              {verifiedEmail && !successMsg && (
                <View className="gap-y-4">
                  <View className="bg-skyblue-50 border border-skyblue-100 p-4 rounded-xl">
                    <Text className="text-xs font-bold text-oceanblue uppercase tracking-wide">Invited User</Text>
                    <Text className="text-lg font-bold text-oceanblue mt-0.5">{verifiedName}</Text>
                    <Text className="text-sm text-oceanblue-900/70">{verifiedEmail}</Text>
                  </View>

                  <View className="gap-y-1">
                    <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">New Password</Text>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="At least 8 characters"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      autoCapitalize="none"
                      className="border border-skyblue-100 bg-skyblue-50/30 text-oceanblue-900 rounded-xl p-3.5 text-base focus:border-skyblue"
                    />
                  </View>

                  <View className="gap-y-1">
                    <Text className="text-xs font-bold text-oceanblue uppercase tracking-wider">Confirm Password</Text>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Repeat your password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      autoCapitalize="none"
                      className="border border-skyblue-100 bg-skyblue-50/30 text-oceanblue-900 rounded-xl p-3.5 text-base focus:border-skyblue"
                    />
                  </View>

                  <Pressable
                    onPress={handleActivate}
                    disabled={loadingActivate}
                    className="bg-oceanblue active:bg-oceanblue-900 rounded-xl p-4 mt-2 items-center justify-center shadow-lg flex-row"
                    style={({ pressed }) => pressed ? { opacity: 0.9 } : {}}
                  >
                    {loadingActivate ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text className="text-white font-bold text-lg">Activate Account</Text>
                    )}
                  </Pressable>
                  
                  <Pressable
                    onPress={() => {
                      setVerifiedEmail(null);
                      setVerifiedName(null);
                      setErrorMsg(null);
                    }}
                    className="items-center py-2"
                  >
                    <Text className="text-skyblue font-semibold text-xs">Use a different token</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Back Button */}
            <Pressable
              onPress={() => router.replace('/(auth)/login')}
              className="mt-6 items-center"
            >
              <Text className="text-oceanblue-900/60 font-bold text-sm">
                Back to Sign In
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
