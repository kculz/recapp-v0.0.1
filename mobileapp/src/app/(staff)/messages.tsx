import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import StaffPageHeader from '@/components/staff-page-header';

interface Contact {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ConversationSummary {
  contact: Contact;
  unreadCount: number;
  lastMessage: {
    id: number;
    messageText: string;
    senderId: number;
    createdAt: string;
  } | null;
}

interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  messageText: string;
  isRead: boolean;
  createdAt: string;
}

const roleLabel = (role: string) => role.replace(/([A-Z])/g, ' $1').trim();

export default function StaffMessagesScreen() {
  const router = useRouter();
  const { userToken, apiUrl, user } = useAuth();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchContacts = useCallback(async () => {
    if (!userToken) return;

    try {
      const response = await fetch(`${apiUrl}/users`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();

      if (response.ok && data.success && Array.isArray(data.data)) {
        const list: Contact[] = data.data.filter((contact: Contact) => contact.id !== user?.id);
        setContacts(list);
      }
    } catch (error) {
      console.error('[StaffMessages] contact load failed:', error);
    }
  }, [apiUrl, user?.id, userToken]);

  const fetchConversations = useCallback(async () => {
    if (!userToken) return;

    setLoadingConversations(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${apiUrl}/messages/conversations`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setConversations(Array.isArray(data.data) ? data.data : []);
      } else {
        setErrorMsg(data.error || 'Failed to load conversations.');
      }
    } catch {
      setErrorMsg('Network error. Could not load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  }, [apiUrl, userToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchContacts();
      void fetchConversations();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchContacts, fetchConversations]);

  const filteredContacts = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    if (!normalizedTerm) {
      return contacts;
    }

    return contacts.filter((contact) => {
      const searchable = `${contact.name} ${contact.email} ${contact.role}`.toLowerCase();
      return searchable.includes(normalizedTerm);
    });
  }, [contacts, searchTerm]);

  const loadThread = useCallback(
    async (contact: Contact) => {
      if (!userToken) return;

      setActiveContact(contact);
      setLoadingThread(true);
      setErrorMsg(null);

      try {
        const response = await fetch(`${apiUrl}/messages/chat/${contact.id}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const data = await response.json();

        if (response.ok && data.success) {
          setMessages(Array.isArray(data.data) ? data.data : []);
        } else {
          setErrorMsg(data.error || 'Failed to load the selected conversation.');
          setMessages([]);
        }
      } catch {
        setErrorMsg('Network error. Could not load the selected conversation.');
      } finally {
        setLoadingThread(false);
      }
    },
    [apiUrl, userToken]
  );

  const handleSendMessage = async () => {
    if (!userToken || !activeContact || !messageText.trim()) {
      return;
    }

    const draft = messageText.trim();
    setSending(true);
    setMessageText('');

    try {
      const response = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          receiverId: activeContact.id,
          messageText: draft,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        if (data.data) {
          setMessages((previous) => [...previous, data.data]);
        }
        await fetchConversations();
      } else {
        setMessageText(draft);
        setErrorMsg(data.error || 'Failed to send message.');
      }
    } catch {
      setMessageText(draft);
      setErrorMsg('Network error. Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <View className="flex-1 bg-skyblue-50">
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <StaffPageHeader
          title="Messages"
          subtitle="Direct staff conversations"
          onBack={() => router.replace('/(staff)/dashboard')}
          rightAction={
            <Pressable
              onPress={() => {
                void fetchConversations();
                void fetchContacts();
              }}
              className="px-3 py-2 rounded-xl bg-white/15 active:opacity-80"
            >
              <Text className="text-white text-xs font-extrabold">Refresh</Text>
            </Pressable>
          }
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1">
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: activeContact ? 24 : 120 }}>
              {errorMsg ? (
                <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
                  <Text className="text-sm font-semibold text-red-700">{errorMsg}</Text>
                </View>
              ) : null}

              <View className="bg-white rounded-3xl border border-skyblue-100 shadow-sm p-5">
                <Text className="text-lg font-extrabold text-oceanblue">Recent conversations</Text>
                <Text className="text-xs text-oceanblue-900/55 mt-1">
                  Jump back into the latest threads or start a new one below.
                </Text>

                {loadingConversations ? (
                  <View className="py-8 items-center">
                    <ActivityIndicator size="small" color="#0ea5e9" />
                  </View>
                ) : conversations.length === 0 ? (
                  <Text className="py-6 text-center text-sm font-semibold text-oceanblue-900/40">
                    No active conversations yet.
                  </Text>
                ) : (
                  <View className="mt-4 gap-3">
                    {conversations.map((conversation) => {
                      const isSelected = activeContact?.id === conversation.contact.id;
                      return (
                        <Pressable
                          key={conversation.contact.id}
                          onPress={() => void loadThread(conversation.contact)}
                          className={`rounded-2xl border p-4 active:opacity-90 ${
                            isSelected ? 'border-oceanblue bg-oceanblue/5' : 'border-skyblue-100 bg-skyblue-50/30'
                          }`}
                        >
                          <View className="flex-row items-start justify-between gap-3">
                            <View className="flex-1">
                              <View className="flex-row items-center gap-2">
                                <Text className="text-base font-extrabold text-oceanblue">
                                  {conversation.contact.name}
                                </Text>
                                <Text className="text-[10px] font-black uppercase tracking-wider text-skyblue bg-skyblue-50 px-2 py-1 rounded-full">
                                  {conversation.contact.role}
                                </Text>
                              </View>
                              <Text className="text-xs text-oceanblue-900/55 mt-0.5">
                                {conversation.contact.email}
                              </Text>
                              <Text className="text-sm text-oceanblue-900/70 mt-2" numberOfLines={1}>
                                {conversation.lastMessage?.messageText || 'No message preview available.'}
                              </Text>
                            </View>

                            <View className="items-end">
                              {conversation.unreadCount > 0 ? (
                                <View className="rounded-full bg-rose-100 px-2.5 py-1">
                                  <Text className="text-[10px] font-black uppercase text-rose-700">
                                    {conversation.unreadCount} new
                                  </Text>
                                </View>
                              ) : null}
                              <Text className="mt-2 text-[10px] font-semibold text-oceanblue-900/45">
                                {conversation.lastMessage ? formatTime(conversation.lastMessage.createdAt) : ''}
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              <View className="mt-6 bg-white rounded-3xl border border-skyblue-100 shadow-sm p-5">
                <Text className="text-lg font-extrabold text-oceanblue">People directory</Text>
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Search staff, clients, or counselors"
                  placeholderTextColor="#94a3b8"
                  className="mt-4 rounded-2xl border border-skyblue-100 bg-skyblue-50/30 px-4 py-3 text-sm text-oceanblue"
                />

                <View className="mt-4 gap-3">
                  {filteredContacts.length === 0 ? (
                    <Text className="py-6 text-center text-sm font-semibold text-oceanblue-900/40">
                      No matching contacts found.
                    </Text>
                  ) : (
                    filteredContacts.slice(0, 12).map((contact) => {
                      const isActive = activeContact?.id === contact.id;
                      return (
                        <Pressable
                          key={contact.id}
                          onPress={() => void loadThread(contact)}
                          className={`rounded-2xl border p-4 active:opacity-90 ${
                            isActive ? 'border-oceanblue bg-oceanblue/5' : 'border-skyblue-100 bg-white'
                          }`}
                        >
                          <View className="flex-row items-center justify-between gap-3">
                            <View className="flex-1">
                              <Text className="text-sm font-extrabold text-oceanblue">{contact.name}</Text>
                              <Text className="text-xs text-oceanblue-900/55 mt-0.5">
                                {contact.email}
                              </Text>
                              <Text className="text-[10px] font-bold uppercase tracking-wider text-skyblue mt-1">
                                {roleLabel(contact.role)}
                              </Text>
                            </View>
                            <Text className="text-xs font-black text-skyblue">Open</Text>
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              </View>

              {activeContact ? (
                <View className="mt-6 bg-white rounded-3xl border border-skyblue-100 shadow-sm p-5">
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-lg font-extrabold text-oceanblue">{activeContact.name}</Text>
                      <Text className="text-xs text-oceanblue-900/55 mt-0.5">{activeContact.email}</Text>
                    </View>
                    {loadingThread ? (
                      <ActivityIndicator size="small" color="#0ea5e9" />
                    ) : null}
                  </View>

                  <View className="mt-4 gap-3">
                    {messages.length === 0 && !loadingThread ? (
                      <Text className="py-10 text-center text-sm font-semibold text-oceanblue-900/40">
                        Start the conversation from below.
                      </Text>
                    ) : (
                      messages.map((message) => {
                        const isOutgoing = message.senderId === user?.id;
                        return (
                          <View
                            key={message.id}
                            className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                              isOutgoing
                                ? 'self-end bg-oceanblue'
                                : 'self-start bg-skyblue-50 border border-skyblue-100'
                            }`}
                          >
                            <Text className={`text-sm leading-relaxed ${isOutgoing ? 'text-white' : 'text-oceanblue'}`}>
                              {message.messageText}
                            </Text>
                            <Text className={`mt-1 text-[10px] font-semibold ${isOutgoing ? 'text-skyblue-100' : 'text-oceanblue-900/45'}`}>
                              {formatTime(message.createdAt)}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              ) : null}
            </ScrollView>

            {activeContact ? (
              <View className="border-t border-skyblue-100 bg-white px-4 py-3">
                <View className="flex-row items-end gap-3">
                  <TextInput
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder={`Message ${activeContact.name}`}
                    placeholderTextColor="#94a3b8"
                    multiline
                    className="flex-1 rounded-2xl border border-skyblue-100 bg-skyblue-50/30 px-4 py-3 text-sm text-oceanblue"
                  />
                  <Pressable
                    onPress={() => void handleSendMessage()}
                    disabled={sending || !messageText.trim()}
                    className={`rounded-2xl px-4 py-3.5 ${
                      sending || !messageText.trim() ? 'bg-skyblue-200' : 'bg-skyblue'
                    }`}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text className="text-sm font-extrabold text-white">Send</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
