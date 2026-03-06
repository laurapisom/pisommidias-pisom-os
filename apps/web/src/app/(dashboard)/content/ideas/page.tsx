'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Plus, Lightbulb, Check, X, ArrowRight } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  NEW: { label: 'Nova', color: 'bg-blue-100 text-blue-700' },
  APPROVED: { label: 'Aprovada', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejeitada', color: 'bg-red-100 text-red-700' },
  USED: { label: 'Utilizada', color: 'bg-gray-100 text-gray-500' },
};

const channelLabels: Record<string, string> = {
  INSTAGRAM_FEED: 'Instagram Feed', INSTAGRAM_STORIES: 'Stories', INSTAGRAM_REELS: 'Reels',
  FACEBOOK: 'Facebook', TIKTOK: 'TikTok', YOUTUBE: 'YouTube', LINKEDIN: 'LinkedIn',
  TWITTER: 'Twitter/X', BLOG: 'Blog', EMAIL: 'E-mail', WHATSAPP: 'WhatsApp', OTHER: 'Outro',
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', channel: '', profileId: '', reference: '' });

  const load = () => {
    const params: Record<string, string> = {};
    if (filter) params.status = filter;
    api.getContentIdeas(params).then((res: any) => setIdeas(res.data || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);
  useEffect(() => { api.getContentProfiles().then(setProfiles).catch(() => null); }, []);

  const handleCreate = async () => {
    if (!form.title) return;
    await api.createContentIdea({
      title: form.title,
      description: form.description || undefined,
      channel: form.channel || undefined,
      profileId: form.profileId || undefined,
      reference: form.reference || undefined,
    });
    setShowNew(false);
    setForm({ title: '', description: '', channel: '', profileId: '', reference: '' });
    load();
  };

  const convertToPost = async (idea: any) => {
    await api.createContentPost({
      title: idea.title,
      channel: idea.channel || 'INSTAGRAM_FEED',
      profileId: idea.profileId || undefined,
      caption: idea.description || undefined,
    });
    await api.updateContentIdeaStatus(idea.id, 'USED');
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banco de Ideias</h1>
          <p className="mt-1 text-gray-500">Ideias de conteúdo e referências</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
          <Plus className="h-4 w-4" />
          Nova Ideia
        </button>
      </div>

      {/* New form */}
      {showNew && (
        <div className="mb-6 rounded-xl border border-pisom-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Nova Ideia</h3>
          <div className="grid grid-cols-2 gap-4">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título da ideia" className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição / Briefing" rows={3} className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
              <option value="">Canal (opcional)</option>
              {Object.entries(channelLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={form.profileId} onChange={(e) => setForm({ ...form, profileId: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
              <option value="">Cliente (opcional)</option>
              {profiles.map((p: any) => <option key={p.id} value={p.id}>{p.clientName}</option>)}
            </select>
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Link de referência (opcional)" className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <div className="flex gap-2 col-span-2">
              <button onClick={handleCreate} className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">Criar</button>
              <button onClick={() => setShowNew(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-1 rounded-lg border border-gray-300 p-1">
        {['', 'NEW', 'APPROVED', 'REJECTED', 'USED'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition', filter === s ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100')}>
            {s ? statusConfig[s]?.label : 'Todas'}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <p className="py-8 text-center text-gray-400">Carregando...</p>
      ) : ideas.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center shadow-sm">
          <Lightbulb className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-400">Nenhuma ideia encontrada</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea: any) => {
            const st = statusConfig[idea.status] || statusConfig.NEW;
            return (
              <div key={idea.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{idea.title}</h3>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', st.color)}>{st.label}</span>
                </div>
                {idea.description && <p className="mb-3 text-xs text-gray-500 line-clamp-3">{idea.description}</p>}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {idea.channel && <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-600">{channelLabels[idea.channel]}</span>}
                  {idea.profile && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">{idea.profile.clientName}</span>}
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                  <span className="text-[10px] text-gray-400">{new Date(idea.createdAt).toLocaleDateString('pt-BR')}</span>
                  <div className="flex gap-1">
                    {idea.status === 'NEW' && (
                      <>
                        <button onClick={async () => { await api.updateContentIdeaStatus(idea.id, 'APPROVED'); load(); }} title="Aprovar" className="rounded p-1 text-green-600 hover:bg-green-50">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={async () => { await api.updateContentIdeaStatus(idea.id, 'REJECTED'); load(); }} title="Rejeitar" className="rounded p-1 text-red-600 hover:bg-red-50">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    {['NEW', 'APPROVED'].includes(idea.status) && (
                      <button onClick={() => convertToPost(idea)} title="Converter em post" className="rounded p-1 text-pisom-600 hover:bg-pisom-50">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
