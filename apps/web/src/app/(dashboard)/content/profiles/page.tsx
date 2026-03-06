'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Plus, User, FileText, Lightbulb, Trash2 } from 'lucide-react';

const channelLabels: Record<string, string> = {
  INSTAGRAM_FEED: 'Instagram Feed', INSTAGRAM_STORIES: 'Stories', INSTAGRAM_REELS: 'Reels',
  FACEBOOK: 'Facebook', TIKTOK: 'TikTok', YOUTUBE: 'YouTube', LINKEDIN: 'LinkedIn',
  TWITTER: 'Twitter/X', BLOG: 'Blog', EMAIL: 'E-mail', WHATSAPP: 'WhatsApp', OTHER: 'Outro',
};

const allChannels = Object.keys(channelLabels);

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientName: '', brandVoice: '', visualGuide: '', targetAudience: '',
    competitors: '', hashtags: '', notes: '', channels: [] as string[],
  });

  const load = () => {
    api.getContentProfiles().then(setProfiles).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.clientName) return;
    await api.createContentProfile({
      ...form,
      channels: form.channels.length > 0 ? form.channels : undefined,
    });
    setShowNew(false);
    setForm({ clientName: '', brandVoice: '', visualGuide: '', targetAudience: '', competitors: '', hashtags: '', notes: '', channels: [] });
    load();
  };

  const toggleChannel = (ch: string) => {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch],
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este perfil?')) return;
    await api.deleteContentProfile(id);
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfis de Clientes</h1>
          <p className="mt-1 text-gray-500">Tom de voz, guia visual e regras por cliente</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
          <Plus className="h-4 w-4" />
          Novo Perfil
        </button>
      </div>

      {/* New form */}
      {showNew && (
        <div className="mb-6 rounded-xl border border-pisom-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Novo Perfil de Cliente</h3>
          <div className="grid gap-4">
            <input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Nome do cliente" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <textarea value={form.brandVoice} onChange={(e) => setForm({ ...form, brandVoice: e.target.value })} placeholder="Tom de voz / Brand voice (ex: formal, divertido, técnico...)" rows={2} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <textarea value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} placeholder="Público-alvo" rows={2} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <div className="grid grid-cols-2 gap-4">
              <input value={form.competitors} onChange={(e) => setForm({ ...form, competitors: e.target.value })} placeholder="Concorrentes" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
              <input value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} placeholder="Hashtags padrão" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Canais ativos</p>
              <div className="flex flex-wrap gap-1.5">
                {allChannels.map((ch) => (
                  <button key={ch} onClick={() => toggleChannel(ch)} className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition', form.channels.includes(ch) ? 'bg-pisom-100 text-pisom-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                    {channelLabels[ch]}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionais" rows={2} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">Criar</button>
              <button onClick={() => setShowNew(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile list */}
      {loading ? (
        <p className="py-8 text-center text-gray-400">Carregando...</p>
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center shadow-sm">
          <User className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-400">Nenhum perfil cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile: any) => (
            <div key={profile.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <button
                onClick={() => setExpanded(expanded === profile.id ? null : profile.id)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pisom-50 text-pisom-700 font-bold text-sm">
                    {profile.clientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-gray-900">{profile.clientName}</h3>
                    <div className="flex gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{profile._count?.posts || 0} posts</span>
                      <span className="flex items-center gap-1"><Lightbulb className="h-3 w-3" />{profile._count?.ideas || 0} ideias</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {profile.channels?.slice(0, 4).map((ch: string) => (
                    <span key={ch} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{channelLabels[ch] || ch}</span>
                  ))}
                  {(profile.channels?.length || 0) > 4 && <span className="text-[10px] text-gray-400">+{profile.channels.length - 4}</span>}
                </div>
              </button>

              {expanded === profile.id && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  {profile.brandVoice && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Tom de Voz</p>
                      <p className="text-sm text-gray-700">{profile.brandVoice}</p>
                    </div>
                  )}
                  {profile.targetAudience && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Público-alvo</p>
                      <p className="text-sm text-gray-700">{profile.targetAudience}</p>
                    </div>
                  )}
                  {profile.competitors && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Concorrentes</p>
                      <p className="text-sm text-gray-700">{profile.competitors}</p>
                    </div>
                  )}
                  {profile.hashtags && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Hashtags</p>
                      <p className="text-sm text-gray-700">{profile.hashtags}</p>
                    </div>
                  )}
                  {profile.notes && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Notas</p>
                      <p className="text-sm text-gray-700">{profile.notes}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-100 flex justify-end">
                    <button onClick={() => handleDelete(profile.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                      <Trash2 className="h-3 w-3" /> Excluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
