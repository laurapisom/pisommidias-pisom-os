'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, ThumbsUp, Lightbulb } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Aberta', color: 'bg-blue-100 text-blue-700' },
  IN_ANALYSIS: { label: 'Em análise', color: 'bg-yellow-100 text-yellow-700' },
  ACCEPTED: { label: 'Aceita', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejeitada', color: 'bg-red-100 text-red-700' },
  IMPLEMENTED: { label: 'Implementada', color: 'bg-purple-100 text-purple-700' },
};

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  const load = () => {
    api.getSuggestions().then(setSuggestions).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await api.createSuggestion(form);
    setForm({ title: '', description: '' });
    setCreating(false);
    load();
  };

  const handleUpvote = async (id: string) => {
    await api.toggleSuggestionUpvote(id);
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-pulse text-gray-500">Carregando...</div></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sugestões de Melhoria</h1>
          <p className="mt-1 text-sm text-gray-500">Compartilhe ideias para melhorar os processos da equipe</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700"
        >
          <Plus className="h-4 w-4" />
          Nova Sugestão
        </button>
      </div>

      {creating && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              autoFocus
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Título da sugestão"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none"
            />
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descreva a sugestão em detalhes..."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">Enviar</button>
              <button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Lightbulb className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">Nenhuma sugestão ainda. Seja o primeiro a contribuir!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => {
            const statusCfg = STATUS_LABELS[s.status] ?? STATUS_LABELS.OPEN;
            return (
              <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleUpvote(s.id)}
                    className="flex flex-col items-center gap-0.5 rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-pisom-600 transition"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span className="text-xs font-medium">{s.upvotes?.length ?? 0}</span>
                  </button>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-gray-900">{s.title}</h3>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{s.description}</p>
                    <p className="mt-2 text-xs text-gray-400">
                      Por {s.createdBy?.firstName} {s.createdBy?.lastName} · {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    {s.statusNote && (
                      <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 italic">{s.statusNote}</p>
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
