export type CallType = 'audio' | 'video';

export const CALLS_ENABLED = false;
export const CALLS_COMING_SOON_MESSAGE =
  'Audio and video calling is paused until a conferencing provider such as Jitsi is configured.';

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
