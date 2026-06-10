export type CallType = 'audio' | 'video';

export interface CallPeer {
  id: number;
  name: string;
  email?: string;
}

export interface CallSession {
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
  direction: 'incoming' | 'outgoing';
  status: 'ringing' | 'accepted';
  createdAt: string;
}

export const JITSI_DOMAIN = 'meet.jit.si';

export const createCallRoomId = (callerId: number, peerId: number) => {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `recapp-${callerId}-${peerId}-${Date.now()}-${randomSuffix}`;
};

export const buildJitsiRoomUrl = (roomId: string, callType: CallType) => {
  const config = new URLSearchParams();
  config.set('config.prejoinPageEnabled', 'false');

  if (callType === 'audio') {
    config.set('config.startAudioOnly', 'true');
  }

  return `https://${JITSI_DOMAIN}/${roomId}#${config.toString()}`;
};
