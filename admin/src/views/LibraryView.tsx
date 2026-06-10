import { useState, useEffect } from 'react';

interface Resource {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  isPublished: boolean;
  publisher?: { name: string };
}

const CATEGORIES = ['Rehab', 'Mental Health', 'Mindfulness', 'Life Skills', 'Crisis Support'];
const TYPES = ['Article', 'Video', 'Audio', 'PDF'];

const TYPE_BADGE: Record<string, string> = {
  Article: 'bg-blue-100 text-blue-700',
  Video:   'bg-rose-100 text-rose-700',
  Audio:   'bg-purple-100 text-purple-700',
  PDF:     'bg-amber-100 text-amber-700',
};
const TYPE_EMOJI: Record<string, string> = {
  Article: '📄', Video: '🎬', Audio: '🎧', PDF: '📑',
};

const BLANK_FORM = {
  title: '',
  description: '',
  category: 'Mental Health',
  type: 'Article',
  url: '',
  thumbnailUrl: '',
  isPublished: false,
};

interface Props {
  token: string;
  apiUrl: string;
}

export default function LibraryView({ token, apiUrl }: Props) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = filterCat !== 'All' ? `?category=${encodeURIComponent(filterCat)}` : '';
      const res = await fetch(`${apiUrl}/library${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResources(data.data.resources || []);
      }
    } catch {
      console.error('[Library Admin] fetch failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResources(); }, [filterCat]);

  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditingId(null);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (r: Resource) => {
    setForm({
      title: r.title,
      description: r.description || '',
      category: r.category,
      type: r.type,
      url: r.url,
      thumbnailUrl: r.thumbnailUrl || '',
      isPublished: r.isPublished,
    });
    setEditingId(r.id);
    setError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      setError('Title and URL are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = editingId ? `${apiUrl}/library/${editingId}` : `${apiUrl}/library`;
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        fetchResources();
      } else {
        setError(data.error || 'Failed to save resource.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this resource? This cannot be undone.')) return;
    try {
      await fetch(`${apiUrl}/library/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch {
      console.error('[Library Admin] delete failed');
    }
  };

  const handleTogglePublish = async (r: Resource) => {
    try {
      const res = await fetch(`${apiUrl}/library/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isPublished: !r.isPublished }),
      });
      if (res.ok) {
        setResources((prev) =>
          prev.map((item) => (item.id === r.id ? { ...item, isPublished: !r.isPublished } : item))
        );
      }
    } catch {
      console.error('[Library Admin] toggle publish failed');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header bar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-oceanblue">📚 Resource Library</h2>
          <p className="text-xs text-oceanblue-900/50 font-semibold mt-0.5">
            Manage curated guides, articles, and videos for clients.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-skyblue hover:bg-skyblue-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          + Add Resource
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {['All', ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              filterCat === cat
                ? 'bg-skyblue border-skyblue text-white'
                : 'bg-white border-skyblue-100 text-oceanblue-900/70 hover:bg-skyblue-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-skyblue-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-6 h-6 border-2 border-skyblue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-16 text-oceanblue-900/40 font-semibold text-sm">
            No resources found. Add your first one!
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-skyblue-100 bg-skyblue-50/30">
                <th className="text-left px-6 py-3 text-[10px] font-black text-oceanblue-900/40 uppercase tracking-widest">Title</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-oceanblue-900/40 uppercase tracking-widest">Type</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-oceanblue-900/40 uppercase tracking-widest">Category</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-oceanblue-900/40 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id} className="border-b border-skyblue-50 hover:bg-skyblue-50/20 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-oceanblue-900 leading-snug">{r.title}</p>
                    {r.description && (
                      <p className="text-xs text-oceanblue-900/50 mt-0.5 line-clamp-1">{r.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${TYPE_BADGE[r.type]}`}>
                      {TYPE_EMOJI[r.type]} {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs font-bold text-oceanblue-900/70 bg-skyblue-50 px-2 py-0.5 rounded-full border border-skyblue-100">
                      {r.category}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => handleTogglePublish(r)}
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase border transition-colors ${
                        r.isPublished
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                      }`}
                    >
                      {r.isPublished ? '✓ Published' : '● Draft'}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(r)}
                        className="px-3 py-1.5 text-[11px] font-bold text-skyblue hover:bg-skyblue-50 rounded-lg transition-colors border border-skyblue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-3 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-skyblue-100 flex justify-between items-center">
              <h3 className="text-base font-black text-oceanblue">
                {editingId ? 'Edit Resource' : 'Add New Resource'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-oceanblue-900/40 hover:text-oceanblue text-xl font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-semibold p-3 rounded-xl">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-1.5">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Managing Anxiety with Breathing Exercises"
                  className="w-full border border-skyblue-100 rounded-xl px-4 py-2.5 text-sm text-oceanblue-900 focus:outline-none focus:border-skyblue bg-skyblue-50/30"
                />
              </div>

              {/* Type + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-1.5">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-skyblue-100 rounded-xl px-4 py-2.5 text-sm text-oceanblue-900 focus:outline-none focus:border-skyblue bg-skyblue-50/30"
                  >
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-skyblue-100 rounded-xl px-4 py-2.5 text-sm text-oceanblue-900 focus:outline-none focus:border-skyblue bg-skyblue-50/30"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-1.5">Resource URL *</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-skyblue-100 rounded-xl px-4 py-2.5 text-sm text-oceanblue-900 focus:outline-none focus:border-skyblue bg-skyblue-50/30"
                />
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-1.5">Thumbnail URL (optional)</label>
                <input
                  value={form.thumbnailUrl}
                  onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-skyblue-100 rounded-xl px-4 py-2.5 text-sm text-oceanblue-900 focus:outline-none focus:border-skyblue bg-skyblue-50/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black text-oceanblue-900/50 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Brief summary of what clients will find in this resource..."
                  className="w-full border border-skyblue-100 rounded-xl px-4 py-2.5 text-sm text-oceanblue-900 focus:outline-none focus:border-skyblue bg-skyblue-50/30 resize-none"
                />
              </div>

              {/* Published toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form.isPublished ? 'bg-skyblue' : 'bg-skyblue-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-bold text-oceanblue-900">
                  {form.isPublished ? 'Published (visible to clients)' : 'Draft (hidden from clients)'}
                </span>
              </label>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-skyblue-100 text-oceanblue-900/60 rounded-xl text-sm font-bold hover:bg-skyblue-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-skyblue hover:bg-skyblue-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update Resource' : 'Add Resource'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
