'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Plus, Search, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';

const statusConfig: Record<string, { label: string; color: string }> = {
  IDEA: { label: 'Ideia', color: 'bg-gray-100 text-gray-700' },
  DRAFT: { label: 'Rascunho', color: 'bg-yellow-100 text-yellow-700' },
  IN_REVIEW: { label: 'Em Revisão', color: 'bg-blue-100 text-blue-700' },
  APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-700' },
  SCHEDULED: { label: 'Agendado', color: 'bg-purple-100 text-purple-700' },
  PUBLISHED: { label: 'Publicado', color: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-700' },
};

const channelLabels: Record<string, string> = {
  INSTAGRAM_FEED: 'Instagram Feed',
  INSTAGRAM_STORIES: 'Stories',
  INSTAGRAM_REELS: 'Reels',
  FACEBOOK: 'Facebook',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  LINKEDIN: 'LinkedIn',
  TWITTER: 'Twitter/X',
  BLOG: 'Blog',
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
  OTHER: 'Outro',
};

export default function ContentPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profileFilter, setProfileFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', channel: 'INSTAGRAM_FEED', profileId: '', scheduledAt: '', caption: '' });

  const load = () => {
    const params: Record<string, string> = {};
    if (filter) params.status = filter;
    if (profileFilter) params.profileId = profileFilter;
    api.getContentPosts(params).then((res: any) => setPosts(res.data || [])).catch(console.error).finally(() => setLoading(false));
    api.getContentPostSummary().then(setSummary).catch(() => null);
  };

  useEffect(() => { load(); }, [filter, profileFilter]);
  useEffect(() => { api.getContentProfiles().then(setProfiles).catch(() => null); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.channel) return;
    await api.createContentPost({
      title: form.title,
      channel: form.channel,
      profileId: form.profileId || undefined,
      scheduledAt: form.scheduledAt || undefined,
      caption: form.caption || undefined,
    });
    setShowNew(false);
    setForm({ title: '', channel: 'INSTAGRAM_FEED', profileId: '', scheduledAt: '', caption: '' });
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conteúdo</h1>
          <p className="mt-1 text-gray-500">Planejamento editorial e gestão de posts</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
          <Plus className="h-4 w-4" />
          Novo Post
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-6 grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{summary.total}</p>
          </div>
          {summary.byStatus?.slice(0, 3).map((s: any) => (
            <div key={s.status} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">{statusConfig[s.status]?.label || s.status}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{s.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* New form */}
      {showNew && (
        <div className="mb-6 rounded-xl border border-pisom-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Novo Post</h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título do post" className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
              {Object.entries(channelLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={form.profileId} onChange={(e) => setForm({ ...form, profileId: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
              <option value="">Sem cliente</option>
              {profiles.map((p: any) => <option key={p.id} value={p.id}>{p.clientName}</option>)}
            </select>
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <textarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Legenda (opcional)" rows={2} className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none lg:col-span-3" />
            <div className="flex items-end gap-2">
              <button onClick={handleCreate} className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">Criar</button>
              <button onClick={() => setShowNew(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-gray-300 p-1">
          {['', 'IDEA', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED'].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition', filter === s ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100')}>
              {s ? statusConfig[s]?.label : 'Todos'}
            </button>
          ))}
        </div>
        {profiles.length > 0 && (
          <select value={profileFilter} onChange={(e) => setProfileFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-pisom-500 focus:outline-none">
            <option value="">Todos os clientes</option>
            {profiles.map((p: any) => <option key={p.id} value={p.id}>{p.clientName}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Post</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Cliente</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Canal</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Agendado</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Responsável</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Nenhum post encontrado</td></tr>
            ) : (
              posts.map((post: any) => {
                const st = statusConfig[post.status] || statusConfig.IDEA;
                return (
                  <tr key={post.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{post.title}</p>
                      {post.tags?.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {post.tags.slice(0, 3).map((t: string) => (
                            <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">#{t}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{post.profile?.clientName || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{channelLabels[post.channel] || post.channel}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {post.scheduledAt ? new Date(post.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', st.color)}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{post.assignedTo?.name || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {['IDEA', 'DRAFT'].includes(post.status) && (
                          <button onClick={async () => { await api.updateContentPostStatus(post.id, 'IN_REVIEW'); load(); }} title="Enviar p/ revisão" className="rounded p-1.5 text-blue-600 hover:bg-blue-50 text-xs">Revisar</button>
                        )}
                        {post.status === 'IN_REVIEW' && (
                          <>
                            <button onClick={async () => { await api.updateContentPostStatus(post.id, 'APPROVED'); load(); }} title="Aprovar" className="rounded p-1.5 text-green-600 hover:bg-green-50 text-xs">Aprovar</button>
                            <button onClick={async () => { const reason = prompt('Motivo da rejeição:'); if (reason) { await api.updateContentPostStatus(post.id, 'REJECTED', reason); load(); } }} title="Rejeitar" className="rounded p-1.5 text-red-600 hover:bg-red-50 text-xs">Rejeitar</button>
                          </>
                        )}
                        {post.status === 'APPROVED' && (
                          <button onClick={async () => { await api.updateContentPostStatus(post.id, 'PUBLISHED'); load(); }} title="Publicar" className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 text-xs">Publicar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
