import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import {
  CALLS_COMING_SOON_MESSAGE,
  CALLS_ENABLED,
  buildJitsiRoomUrl,
  createCallRoomId,
  type CallType,
} from '@/utils/jitsi';

type CallDirection = 'incoming' | 'outgoing';

interface CallPeer {
  id: number;
  name: string;
  email?: string;
}

interface CallSession {
  roomId: string;
  callType: CallType;
  peerId: number;
  peerName: string;
  peerEmail?: string;
  recipientId?: number;
  recipientName?: string;
  callerId: number;
  callerName: string;
  callerEmail?: string;
  direction: CallDirection;
  status: 'ringing' | 'accepted';
  createdAt: string;
}

interface CallAck {
  success: boolean;
  error?: string;
  data?: CallSession;
}

interface CallContextValue {
  startCall: (peer: CallPeer, callType: CallType) => Promise<boolean>;
  acceptIncomingCall: () => Promise<boolean>;
  declineIncomingCall: () => Promise<void>;
  cancelCurrentCall: () => Promise<void>;
  currentCall: CallSession | null;
  isLaunchingCall: boolean;
}

const CallContext = createContext<CallContextValue | null>(null);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [isLaunchingCall, setIsLaunchingCall] = useState(false);
  const currentCallRef = useRef<CallSession | null>(null);
  const launchingRoomRef = useRef<string | null>(null);

  const clearCurrentCall = useCallback(() => {
    currentCallRef.current = null;
    setCurrentCall(null);
    setIsLaunchingCall(false);
    launchingRoomRef.current = null;
  }, []);

  const openCallRoom = useCallback(
    async (call: CallSession) => {
      if (launchingRoomRef.current === call.roomId) {
        return;
      }

      launchingRoomRef.current = call.roomId;
      setIsLaunchingCall(true);

      try {
        const result = await WebBrowser.openBrowserAsync(
          buildJitsiRoomUrl(call.roomId, call.callType)
        );

        if (currentCallRef.current?.roomId === call.roomId) {
          socket?.emit('call:end', {
            roomId: call.roomId,
            reason: 'browser_closed',
          });
          clearCurrentCall();
        }

        return result;
      } catch (error: unknown) {
        Alert.alert(
          'Call unavailable',
          error instanceof Error ? error.message : 'Unable to open the call room.'
        );
        if (currentCallRef.current?.roomId === call.roomId) {
          clearCurrentCall();
        }
        return null;
      } finally {
        if (launchingRoomRef.current === call.roomId) {
          launchingRoomRef.current = null;
        }
        setIsLaunchingCall(false);
      }
    },
    [clearCurrentCall, socket]
  );

  const startCall = useCallback(
    async (peer: CallPeer, callType: CallType) => {
      if (!CALLS_ENABLED) {
        Alert.alert('Calls coming soon', CALLS_COMING_SOON_MESSAGE);
        return false;
      }

      if (!socket || !socket.connected || !user) {
        Alert.alert('Call unavailable', 'You are not connected right now.');
        return false;
      }

      if (currentCallRef.current) {
        Alert.alert('Call in progress', 'Finish the current call before starting a new one.');
        return false;
      }

      const call: CallSession = {
        roomId: createCallRoomId(user.id, peer.id),
        callType,
        callerId: user.id,
        callerName: user.name,
        callerEmail: user.email,
        peerId: peer.id,
        peerName: peer.name,
        peerEmail: peer.email,
        direction: 'outgoing',
        status: 'ringing',
        createdAt: new Date().toISOString(),
      };

      currentCallRef.current = call;
      setCurrentCall(call);

      try {
        const ack = await new Promise<CallAck>((resolve) => {
          socket.emit(
            'call:invite',
            {
              roomId: call.roomId,
              callType: call.callType,
              recipientId: call.peerId,
              recipientName: call.peerName,
            },
            (response: CallAck) => resolve(response)
          );
        });

        if (!ack.success) {
          Alert.alert('Call unavailable', ack.error || 'Unable to place the call.');
          clearCurrentCall();
          return false;
        }

        return true;
      } catch (error: unknown) {
        Alert.alert(
          'Call unavailable',
          error instanceof Error ? error.message : 'Unable to place the call.'
        );
        clearCurrentCall();
        return false;
      }
    },
    [clearCurrentCall, socket, user]
  );

  const acceptIncomingCall = useCallback(async () => {
    if (!CALLS_ENABLED) {
      return false;
    }

    const call = currentCallRef.current;

    if (!call || call.direction !== 'incoming' || !socket || !socket.connected) {
      return false;
    }

    try {
      const ack = await new Promise<CallAck>((resolve) => {
        socket.emit(
          'call:accept',
          { roomId: call.roomId },
          (response: CallAck) => resolve(response)
        );
      });

      if (!ack.success) {
        Alert.alert('Call unavailable', ack.error || 'Unable to accept the call.');
        clearCurrentCall();
        return false;
      }

      const acceptedCall: CallSession = {
        ...call,
        status: 'accepted',
      };

      currentCallRef.current = acceptedCall;
      setCurrentCall(acceptedCall);
      await openCallRoom(acceptedCall);
      return true;
    } catch (error: unknown) {
      Alert.alert(
        'Call unavailable',
        error instanceof Error ? error.message : 'Unable to accept the call.'
      );
      clearCurrentCall();
      return false;
    }
  }, [clearCurrentCall, openCallRoom, socket]);

  const declineIncomingCall = useCallback(async () => {
    if (!CALLS_ENABLED) {
      clearCurrentCall();
      return;
    }

    const call = currentCallRef.current;

    if (!call || call.direction !== 'incoming' || !socket || !socket.connected) {
      clearCurrentCall();
      return;
    }

    try {
      socket.emit('call:decline', {
        roomId: call.roomId,
        reason: 'declined',
      });
    } finally {
      clearCurrentCall();
    }
  }, [clearCurrentCall, socket]);

  const cancelCurrentCall = useCallback(async () => {
    if (!CALLS_ENABLED) {
      clearCurrentCall();
      return;
    }

    const call = currentCallRef.current;

    if (!call || !socket || !socket.connected) {
      clearCurrentCall();
      return;
    }

    if (call.direction === 'incoming') {
      await declineIncomingCall();
      return;
    }

    try {
      socket.emit('call:end', {
        roomId: call.roomId,
        reason: 'cancelled',
      });
    } finally {
      clearCurrentCall();
    }
  }, [clearCurrentCall, declineIncomingCall, socket]);

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  useEffect(() => {
    if (!socket || !user || !CALLS_ENABLED) {
      return undefined;
    }

    const handleIncomingCall = (call: CallSession) => {
      if (call.recipientId !== user.id) {
        return;
      }

      if (currentCallRef.current) {
        socket.emit('call:decline', {
          roomId: call.roomId,
          reason: 'busy',
        });
        return;
      }

      const incomingCall: CallSession = {
        ...call,
        peerId: call.callerId,
        peerName: call.callerName,
        peerEmail: call.callerEmail,
        direction: 'incoming',
        status: 'ringing',
      };

      currentCallRef.current = incomingCall;
      setCurrentCall(incomingCall);
    };

    const handleAcceptedCall = (call: CallSession) => {
      const activeCall = currentCallRef.current;

      if (!activeCall || activeCall.roomId !== call.roomId) {
        return;
      }

      const acceptedCall: CallSession = {
        ...activeCall,
        status: 'accepted',
      };

      currentCallRef.current = acceptedCall;
      setCurrentCall(acceptedCall);
      void openCallRoom(acceptedCall);
    };

    const handleDeclinedCall = (call: CallSession & { declinedByName?: string }) => {
      if (currentCallRef.current?.roomId !== call.roomId) {
        return;
      }

      Alert.alert(
        'Call declined',
        `${call.declinedByName || call.peerName || 'The other participant'} declined the call.`
      );
      clearCurrentCall();
    };

    const handleEndedCall = (call: CallSession & { endedByName?: string; reason?: string }) => {
      if (currentCallRef.current?.roomId !== call.roomId) {
        return;
      }

      clearCurrentCall();
    };

    const handleDisconnect = () => {
      clearCurrentCall();
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleAcceptedCall);
    socket.on('call:declined', handleDeclinedCall);
    socket.on('call:ended', handleEndedCall);

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleAcceptedCall);
      socket.off('call:declined', handleDeclinedCall);
      socket.off('call:ended', handleEndedCall);
      clearCurrentCall();
    };
  }, [clearCurrentCall, openCallRoom, socket, user]);

  const value: CallContextValue = {
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    cancelCurrentCall,
    currentCall,
    isLaunchingCall,
  };

  return (
    <CallContext.Provider value={value}>
      {children}

      <Modal
        visible={!!currentCall && currentCall.direction === 'incoming' && currentCall.status === 'ringing'}
        transparent
        animationType="fade"
        onRequestClose={() => {
          void declineIncomingCall();
        }}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-5">
          <View className="w-full max-w-sm bg-white rounded-3xl p-6 border border-skyblue-100 shadow-2xl">
            <View className="items-center mb-5">
              <Text className="text-5xl mb-3">{currentCall?.callType === 'video' ? '📹' : '📞'}</Text>
              <Text className="text-xs font-black uppercase tracking-wider text-skyblue">
                Incoming {currentCall?.callType} call
              </Text>
              <Text className="text-2xl font-black text-oceanblue mt-2 text-center">
                {currentCall?.callerName || 'Unknown caller'}
              </Text>
              <Text className="text-xs font-semibold text-oceanblue-900/50 mt-1 text-center">
                They are waiting for you to answer.
              </Text>
            </View>

            <View className="flex-row gap-x-3">
              <Pressable
                onPress={() => void declineIncomingCall()}
                className="flex-1 bg-rose-50 border border-rose-200 active:bg-rose-100 py-3.5 rounded-2xl items-center"
              >
                <Text className="text-rose-600 font-extrabold text-sm">Decline</Text>
              </Pressable>
              <Pressable
                onPress={() => void acceptIncomingCall()}
                disabled={isLaunchingCall}
                className="flex-1 bg-oceanblue active:bg-oceanblue-900 py-3.5 rounded-2xl items-center disabled:opacity-60"
              >
                {isLaunchingCall ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-extrabold text-sm">Accept</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!currentCall && currentCall.direction === 'outgoing' && currentCall.status === 'ringing'}
        transparent
        animationType="fade"
        onRequestClose={() => {
          void cancelCurrentCall();
        }}
      >
        <View className="flex-1 bg-black/40 items-center justify-end px-4 pb-8">
          <View className="w-full max-w-sm bg-white rounded-3xl px-5 py-4 border border-skyblue-100 shadow-2xl">
            <View className="flex-row items-center gap-x-3">
              <View className="w-12 h-12 rounded-2xl bg-skyblue-50 items-center justify-center">
                <Text className="text-2xl">{currentCall?.callType === 'video' ? '📹' : '📞'}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-wider text-skyblue">
                  Calling
                </Text>
                <Text className="text-base font-extrabold text-oceanblue" numberOfLines={1}>
                  {currentCall?.peerName || 'Participant'}
                </Text>
                <Text className="text-xs font-semibold text-oceanblue-900/50">
                  Waiting for the call to be answered...
                </Text>
              </View>
              <Pressable
                onPress={() => void cancelCurrentCall()}
                className="bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl active:bg-rose-100"
              >
                <Text className="text-rose-600 font-extrabold text-xs">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </CallContext.Provider>
  );
};

export const useCalls = () => {
  const context = useContext(CallContext);

  if (!context) {
    throw new Error('useCalls must be used within a CallProvider');
  }

  return context;
};
