'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ShieldCheck } from 'lucide-react';

export default function AuditPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getBoards().then(setBoards).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedBoard) return;
    setLoading(true);
    // Fetch all cards from the board, then get their history
    api.getBoardCards(selectedBoard)
      .then(cards => Promise.all(cards.slice(0, 20).map((c: any) => api.getCardHistory(c.id))))
      .then(histories => {
        const all = histories.flat().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setHistory(all.slice(0, 100));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedBoard]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
        <p className="mt-1 text-sm text-gray-500">Histórico completo de ações nos quadros</p>
      </div>

      <div className="mb-4">
        <select
          value={selectedBoard}
          onChange={e => setSelectedBoard(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none"
        >
          <option value="">Selecione um quadro</option>
          {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {loading && <div className="animate-pulse text-gray-500 py-4">Carregando...</div>}

      {!selectedBoard && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldCheck className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">Selecione um quadro para ver o histórico de auditoria</p>
        </div>
      )}

      {selectedBoard && !loading && history.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-start gap-4 px-5 py-3">
                <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-pisom-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{h.user?.firstName ?? 'Sistema'}</span>
                    <span className="text-sm text-gray-500">{h.action.replace(/_/g, ' ')}</span>
                    {h.field && <span className="text-xs text-gray-400">({h.field})</span>}
                  </div>
                  <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
