import { buildJitsiRoomUrl, type CallSession } from '../utils/call';

interface CallOverlayProps {
  currentCall: CallSession | null;
  isJoiningCall: boolean;
  onAcceptCall: () => void | Promise<void>;
  onDeclineCall: () => void;
  onEndCall: () => void;
}

export default function CallOverlay({
  currentCall,
  isJoiningCall,
  onAcceptCall,
  onDeclineCall,
  onEndCall,
}: CallOverlayProps) {
  if (!currentCall) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      {currentCall.status === 'ringing' ? (
        currentCall.direction === 'incoming' ? (
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-skyblue-100">
            <div className="text-center">
              <div className="text-5xl mb-3">{currentCall.callType === 'video' ? '📹' : '📞'}</div>
              <div className="text-[10px] font-black uppercase tracking-wider text-skyblue">
                Incoming {currentCall.callType} call
              </div>
              <h3 className="text-2xl font-black text-oceanblue mt-2">{currentCall.callerName}</h3>
              <p className="text-xs text-oceanblue-900/60 font-semibold mt-2">
                They are waiting for your response.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={onDeclineCall}
                className="flex-1 py-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 font-extrabold text-sm hover:bg-rose-100 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={() => void onAcceptCall()}
                disabled={isJoiningCall}
                className="flex-1 py-3 rounded-2xl border border-oceanblue bg-oceanblue text-white font-extrabold text-sm hover:bg-oceanblue-900 transition-colors disabled:opacity-60"
              >
                {isJoiningCall ? 'Joining...' : 'Accept'}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-skyblue-100">
            <div className="text-center">
              <div className="text-5xl mb-3">{currentCall.callType === 'video' ? '📹' : '📞'}</div>
              <div className="text-[10px] font-black uppercase tracking-wider text-skyblue">
                Calling {currentCall.peerName}
              </div>
              <h3 className="text-2xl font-black text-oceanblue mt-2">{currentCall.peerName}</h3>
              <p className="text-xs text-oceanblue-900/60 font-semibold mt-2">
                Waiting for them to answer...
              </p>
            </div>

            <button
              onClick={onEndCall}
              className="mt-6 w-full py-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 font-extrabold text-sm hover:bg-rose-100 transition-colors"
            >
              Cancel Call
            </button>
          </div>
        )
      ) : (
        <div className="w-full max-w-5xl h-[85vh] bg-white rounded-3xl overflow-hidden shadow-2xl border border-skyblue-100 flex flex-col">
          <div className="px-5 py-4 border-b border-skyblue-100 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-skyblue">
                {currentCall.callType} call in progress
              </div>
              <h3 className="text-lg font-black text-oceanblue">
                {currentCall.direction === 'incoming' ? currentCall.callerName : currentCall.peerName}
              </h3>
            </div>
            <button
              onClick={onEndCall}
              className="py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 font-extrabold text-xs hover:bg-rose-100 transition-colors"
            >
              End Call
            </button>
          </div>
          <iframe
            title="RecApp call room"
            src={buildJitsiRoomUrl(currentCall.roomId, currentCall.callType)}
            className="flex-1 w-full bg-black"
            allow="camera; microphone; autoplay; fullscreen; display-capture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
