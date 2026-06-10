import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useCalls } from '@/context/CallContext';
import { useSocket } from '@/context/SocketContext';
import { CALLS_ENABLED } from '@/utils/jitsi';

// ─── Emoji tray configuration ────────────────────────────────────────────────
const EMOJI_GROUPS = [
  { label: 'Feelings', emojis: ['😊', '😢', '😰', '😤', '😌', '🥺', '😔', '😁', '🙂', '😐'] },
  { label: 'Support',  emojis: ['❤️', '🙏', '💪', '🌟', '✨', '💙', '🤝', '🌈', '💫', '🫂'] },
  { label: 'Reactions', emojis: ['👍', '👎', '🎉', '🔥', '💯', '🙌', '👏', '🤔', '😮', '😆'] },
  { label: 'Health',   emojis: ['🧘', '💤', '🥗', '💊', '🏃', '🌿', '🫀', '🧠', '🛌', '☀️'] },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  messageText: string;
  isRead: boolean;
  createdAt: string;
}

interface Counselor {
  id: number;
  name: string;
  email: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const router = useRouter();
  const { userToken, apiUrl, user } = useAuth();
  const socket = useSocket();
  const { startCall, currentCall, isLaunchingCall } = useCalls();
  const scrollViewRef = useRef<ScrollView>(null);

  const counselorId = user?.assignedCounselorId;
  const [counselor, setCounselor] = useState<Counselor | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Emoji tray state
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const [trayAnim] = useState(() => new Animated.Value(0));

  const toggleEmojiTray = () => {
    const toValue = showEmojiTray ? 0 : 1;
    setShowEmojiTray(!showEmojiTray);
    Animated.spring(trayAnim, {
      toValue,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  const appendEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  // ── 1. Fetch counselor profile ─────────────────────────────────────────────
  useEffect(() => {
    const fetchCounselorProfile = async () => {
      if (!userToken || !counselorId) return;
      try {
        const res = await fetch(`${apiUrl}/appointments/counselors`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.data)) {
          const profile = data.data.find((c: Counselor) => c.id === counselorId);
          if (profile) setCounselor(profile);
        }
      } catch (e) {
        console.error('[Chat] Failed to fetch counselor profile:', e);
      }
    };
    fetchCounselorProfile();
  }, [userToken, counselorId, apiUrl]);

  // ── 2. Initial message load (HTTP) ─────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!userToken || !counselorId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/messages/chat/${counselorId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.data);
      }
    } catch (err) {
      console.warn('[Chat] Initial fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [userToken, counselorId, apiUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchMessages();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchMessages]);

  // ── 3. Real-time socket listener ───────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      // Only accept messages in this conversation thread
      const isRelevant =
        (msg.senderId === counselorId && msg.receiverId === user?.id) ||
        (msg.senderId === user?.id && msg.receiverId === counselorId);

      if (isRelevant) {
        setMessages((prev) => {
          // Deduplicate by id (message we sent is already in state)
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, counselorId, user?.id]);

  // ── 4. Auto-scroll on new messages ────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  // ── 5. Send message ────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || !userToken || !counselorId) return;
    setSending(true);
    setErrorMsg(null);
    const draftText = text.trim();
    setText('');

    try {
      const res = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ receiverId: counselorId, messageText: draftText }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Optimistically append — the socket echo (if any) gets deduped
        setMessages((prev) => [...prev, data.data]);
      } else {
        setErrorMsg(data.error || 'Failed to send message.');
        setText(draftText);
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setText(draftText);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // ── No counselor assigned ─────────────────────────────────────────────────
  if (!counselorId) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-5 py-4 border-b border-skyblue-100 flex-row justify-between items-center">
          <Pressable onPress={() => router.back()} className="active:opacity-60">
            <Text className="text-skyblue font-bold text-base">Back</Text>
          </Pressable>
          <Text className="text-lg font-extrabold text-oceanblue">Counselor Chat</Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center p-6 bg-skyblue-50">
          <Text className="text-5xl mb-4">💬</Text>
          <Text className="text-xl font-bold text-oceanblue text-center">No Counselor Assigned</Text>
          <Text className="text-sm text-center text-oceanblue-900/60 mt-2 max-w-xs">
            A counselor must be assigned to your account by system administrators before you can initiate direct messages.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main Chat UI ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* ── Header ── */}
        <View className="px-5 py-4 border-b border-skyblue-100 flex-row justify-between items-center bg-white shadow-xs">
          <Pressable onPress={() => router.back()} className="active:opacity-60">
            <Text className="text-skyblue font-bold text-base">Back</Text>
          </Pressable>
          <View className="items-center">
            <Text className="text-base font-extrabold text-oceanblue">{counselor?.name || 'Your Counselor'}</Text>
            <View className="flex-row items-center gap-x-1 mt-0.5">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <Text className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                {!CALLS_ENABLED
                  ? 'Calls coming soon'
                  : currentCall && (currentCall.peerId === counselorId || currentCall.callerId === counselorId)
                    ? currentCall.direction === 'incoming' && currentCall.status === 'ringing'
                      ? 'Incoming Call'
                      : currentCall.status === 'ringing'
                      ? 'Calling'
                      : 'In call'
                    : 'Online'}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-x-2">
            <Pressable
              onPress={() =>
                void startCall(
                  {
                    id: counselorId,
                    name: counselor?.name || 'Your Counselor',
                    email: counselor?.email,
                  },
                  'audio'
                )
              }
              disabled={!CALLS_ENABLED || !counselor || isLaunchingCall || !!currentCall}
              className={`w-10 h-10 rounded-full items-center justify-center border ${
                !CALLS_ENABLED || !counselor || isLaunchingCall
                  ? 'bg-skyblue-50 border-skyblue-100 opacity-50'
                  : 'bg-skyblue-50 border-skyblue-100'
              }`}
            >
              <Text className="text-base">📞</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                void startCall(
                  {
                    id: counselorId,
                    name: counselor?.name || 'Your Counselor',
                    email: counselor?.email,
                  },
                  'video'
                )
              }
              disabled={!CALLS_ENABLED || !counselor || isLaunchingCall || !!currentCall}
              className={`w-10 h-10 rounded-full items-center justify-center border ${
                !CALLS_ENABLED || !counselor || isLaunchingCall
                  ? 'bg-skyblue-50 border-skyblue-100 opacity-50'
                  : 'bg-skyblue-50 border-skyblue-100'
              }`}
            >
              <Text className="text-base">📹</Text>
            </Pressable>
          </View>
          {!CALLS_ENABLED ? (
            <Text className="mt-2 text-right text-[10px] font-semibold text-oceanblue-900/55">
              Voice and video calls will unlock after conferencing setup.
            </Text>
          ) : null}
        </View>

        {/* ── Message List ── */}
        <View className="flex-1 bg-skyblue-50">
          {loading ? (
            <View className="flex-grow justify-center items-center">
              <ActivityIndicator size="small" color="#0ea5e9" />
              <Text className="text-xs text-oceanblue-900/60 font-semibold mt-2">Loading conversation...</Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'flex-end' }}
              keyboardShouldPersistTaps="handled"
            >
              {messages.length === 0 ? (
                <View className="items-center py-20">
                  <Text className="text-5xl mb-3">👋</Text>
                  <Text className="text-sm font-semibold text-oceanblue-900/60 text-center max-w-xs">
                    Say hello! Start checking in with your counselor. Use the emoji tray to express how you feel. 😊
                  </Text>
                </View>
              ) : (
                <View className="gap-y-3">
                  {messages.map((msg) => {
                    const isSelf = msg.senderId === user?.id;
                    return (
                      <View key={msg.id} className={`flex-row ${isSelf ? 'justify-end' : 'justify-start'}`}>
                        {!isSelf && (
                          <View className="w-8 h-8 rounded-full bg-skyblue-100 items-center justify-center mr-2 mt-1 shrink-0">
                            <Text className="text-base">🩺</Text>
                          </View>
                        )}
                        <View
                          className={`max-w-[75%] p-4 rounded-2xl ${
                            isSelf
                              ? 'bg-skyblue rounded-tr-none'
                              : 'bg-white rounded-tl-none border border-skyblue-100'
                          }`}
                        >
                          <Text
                            className={`text-base font-medium leading-relaxed ${
                              isSelf ? 'text-white' : 'text-oceanblue-900'
                            }`}
                          >
                            {msg.messageText}
                          </Text>
                          <Text
                            className={`text-[9px] font-bold mt-1 text-right ${
                              isSelf ? 'text-skyblue-100' : 'text-oceanblue-900/50'
                            }`}
                          >
                            {formatTime(msg.createdAt)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* ── Error Banner ── */}
        {errorMsg && (
          <View className="bg-red-50 border-y border-red-100 p-2.5">
            <Text className="text-red-700 text-xs font-semibold text-center">{errorMsg}</Text>
          </View>
        )}

        {/* ── Emoji Tray ── */}
        {showEmojiTray && (
          <Animated.View
            style={{ opacity: trayAnim, transform: [{ translateY: trayAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}
            className="bg-white border-t border-skyblue-100 px-4 pt-3 pb-1"
          >
            {/* Group tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              <View className="flex-row gap-x-2">
                {EMOJI_GROUPS.map((g, i) => (
                  <Pressable
                    key={g.label}
                    onPress={() => setActiveGroup(i)}
                    className={`px-3 py-1 rounded-full ${activeGroup === i ? 'bg-skyblue' : 'bg-skyblue-50 border border-skyblue-100'}`}
                  >
                    <Text className={`text-[11px] font-bold ${activeGroup === i ? 'text-white' : 'text-oceanblue/70'}`}>
                      {g.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            {/* Emoji row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-2">
              <View className="flex-row gap-x-1">
                {EMOJI_GROUPS[activeGroup].emojis.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => appendEmoji(emoji)}
                    className="w-10 h-10 items-center justify-center rounded-xl active:bg-skyblue-50"
                  >
                    <Text className="text-2xl">{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Input Footer ── */}
        <View className="p-3 border-t border-skyblue-100 bg-white flex-row items-center gap-x-2">
          {/* Emoji toggle button */}
          <Pressable
            onPress={toggleEmojiTray}
            className={`w-10 h-10 rounded-full items-center justify-center border ${
              showEmojiTray ? 'bg-skyblue border-skyblue' : 'bg-skyblue-50 border-skyblue-100'
            }`}
          >
            <Text className="text-xl">{showEmojiTray ? '⌨️' : '😊'}</Text>
          </Pressable>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            className="flex-1 bg-skyblue-50/20 border border-skyblue-100 text-oceanblue-900 text-base rounded-2xl px-4 py-3 focus:border-skyblue"
            maxLength={1000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            onFocus={() => showEmojiTray && setShowEmojiTray(false)}
          />

          <Pressable
            onPress={handleSend}
            disabled={sending || !text.trim()}
            className={`bg-oceanblue active:bg-oceanblue-900 w-11 h-11 rounded-full items-center justify-center shadow-md ${
              (!text.trim() || sending) && 'opacity-55'
            }`}
          >
            {sending ? (
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
