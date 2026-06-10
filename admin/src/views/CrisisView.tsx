import { useState, useEffect } from 'react';

interface Author {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  author: Author;
}

interface Comment {
  id: number;
  postId: number;
  content: string;
  createdAt: string;
  author: Author;
  post: { id: number; title: string };
}

interface Message {
  id: number;
  messageText: string;
  createdAt: string;
  Sender: { id: number; name: string; email: string };
  Receiver: { id: number; name: string; email: string };
}

interface CrisisViewProps {
  token: string;
  apiUrl: string;
}

export default function CrisisView({ token, apiUrl }: CrisisViewProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null); // format: "type-id"

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        setPosts(resData.data.posts);
        setComments(resData.data.comments);
        setMessages(resData.data.messages);
      } else {
        throw new Error(resData.error || 'Failed to fetch alerts.');
      }
    } catch (e: any) {
      setError(e.message || 'Error occurred loading safety alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [token, apiUrl]);

  const handleResolve = async (type: 'post' | 'comment' | 'message', id: number) => {
    const key = `${type}-${id}`;
    setResolvingId(key);
    try {
      const response = await fetch(`${apiUrl}/alerts/${type}/${id}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        // Remove from local lists
        if (type === 'post') {
          setPosts(posts.filter((p) => p.id !== id));
        } else if (type === 'comment') {
          setComments(comments.filter((c) => c.id !== id));
        } else if (type === 'message') {
          setMessages(messages.filter((m) => m.id !== id));
        }
      } else {
        throw new Error(resData.error || 'Failed to resolve alert.');
      }
    } catch (err: any) {
      alert(err.message || 'Error resolving alert.');
    } finally {
      setResolvingId(null);
    }
  };

  const totalAlerts = posts.length + comments.length + messages.length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-oceanblue">Crisis Alerts Monitor</h2>
          <p className="text-sm text-oceanblue-900/60 leading-relaxed">
            Safety flags triggered by pre-defined keywords (e.g. self-harm, relapse) in community feeds or counselor DMs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
            totalAlerts > 0
              ? 'bg-red-50 text-red-600 border-red-100 animate-pulse'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            🚨 {totalAlerts} Active Alerts
          </span>
          <button
            onClick={fetchAlerts}
            className="py-1.5 px-3 bg-skyblue-50 hover:bg-skyblue-100 text-oceanblue border border-skyblue-100 rounded-xl text-xs font-bold transition-all"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {loading && totalAlerts === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-white border border-skyblue-100 rounded-3xl">
          <svg className="animate-spin h-8 w-8 text-skyblue" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-oceanblue-900/50 font-bold">Querying flagged entries...</span>
        </div>
      ) : totalAlerts === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-4 bg-white border border-skyblue-100 rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 text-3xl flex items-center justify-center shadow-inner">
            ✓
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-oceanblue-900">Safety Channels Clean</h4>
            <p className="text-xs text-oceanblue-900/40 font-semibold max-w-sm">
              No unresolved crisis keywords detected. The community feed and counselor direct messages are clear.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section: Flagged Posts */}
          {posts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-oceanblue flex items-center gap-2">
                <span>📝</span> Flagged Discussion Posts ({posts.length})
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm shadow-red-50 flex flex-col md:flex-row justify-between items-start gap-6"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-extrabold">
                        <span className="text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded uppercase tracking-wider">
                          Trigger Keyword
                        </span>
                        <span className="text-oceanblue-900/50">
                          {new Date(post.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-oceanblue-900">{post.title}</h4>
                      <p className="text-xs text-oceanblue-900/80 leading-relaxed font-semibold bg-red-50/10 border border-red-50 p-4 rounded-2xl">
                        {post.content}
                      </p>
                      <span className="text-[10px] text-oceanblue-900/50 font-bold block">
                        Author: <span className="text-oceanblue">{post.author?.name}</span> ({post.author?.email})
                      </span>
                    </div>

                    <button
                      onClick={() => handleResolve('post', post.id)}
                      disabled={resolvingId === `post-${post.id}`}
                      className="w-full md:w-auto py-2.5 px-4 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-colors border border-emerald-100 text-xs font-bold shadow-sm"
                    >
                      {resolvingId === `post-${post.id}` ? 'Resolving...' : '✓ Resolve Trigger'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Flagged Comments */}
          {comments.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-oceanblue flex items-center gap-2">
                <span>💬</span> Flagged Feed Comments ({comments.length})
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm shadow-red-50 flex flex-col md:flex-row justify-between items-start gap-6"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-extrabold">
                        <span className="text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded uppercase tracking-wider">
                          Trigger Keyword
                        </span>
                        <span className="text-oceanblue-900/50">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-oceanblue-900/80 leading-relaxed font-semibold bg-red-50/10 border border-red-50 p-4 rounded-2xl">
                        {comment.content}
                      </p>
                      <div className="text-[10px] text-oceanblue-900/50 font-bold space-y-1">
                        <div>
                          Author: <span className="text-oceanblue">{comment.author?.name}</span> ({comment.author?.email})
                        </div>
                        <div>
                          On Post: <span className="text-oceanblue font-bold">"{comment.post?.title}"</span> (ID: #{comment.postId})
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleResolve('comment', comment.id)}
                      disabled={resolvingId === `comment-${comment.id}`}
                      className="w-full md:w-auto py-2.5 px-4 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-colors border border-emerald-100 text-xs font-bold shadow-sm"
                    >
                      {resolvingId === `comment-${comment.id}` ? 'Resolving...' : '✓ Resolve Trigger'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Flagged Direct Messages */}
          {messages.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-oceanblue flex items-center gap-2">
                <span>✉️</span> Flagged Direct Messages ({messages.length})
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm shadow-red-50 flex flex-col md:flex-row justify-between items-start gap-6"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-extrabold">
                        <span className="text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded uppercase tracking-wider">
                          Trigger Keyword
                        </span>
                        <span className="text-oceanblue-900/50">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-oceanblue-900/80 leading-relaxed font-semibold bg-red-50/10 border border-red-50 p-4 rounded-2xl font-mono">
                        "{msg.messageText}"
                      </p>
                      <div className="text-[10px] text-oceanblue-900/50 font-bold">
                        Sender: <span className="text-oceanblue">{msg.Sender?.name}</span> ({msg.Sender?.email}) ➜ Receiver:{' '}
                        <span className="text-oceanblue">{msg.Receiver?.name}</span> ({msg.Receiver?.email})
                      </div>
                    </div>

                    <button
                      onClick={() => handleResolve('message', msg.id)}
                      disabled={resolvingId === `message-${msg.id}`}
                      className="w-full md:w-auto py-2.5 px-4 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-xl transition-colors border border-emerald-100 text-xs font-bold shadow-sm"
                    >
                      {resolvingId === `message-${msg.id}` ? 'Resolving...' : '✓ Resolve Trigger'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
