'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { FileBarChart, Filter } from 'lucide-react';

export default function ReportsPage() {
  const [boards, setBoards] = useState<any[]>([]);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getBoards().then(setBoards).catch(console.error);
  }, []);

  const load = () => {
    if (!selectedBoard) return;
    setLoading(true);
    api.getBoardCards(selectedBoard)
      .then(setCards)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [selectedBoard]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="mt-1 text-sm text-gray-500">Análise de cartões e atividades</p>
      </div>

      <div className="mb-4 flex gap-3">
        <select
          value={selectedBoard}
          onChange={e => setSelectedBoard(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none"
        >
          <option value="">Selecione um quadro</option>
          {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {loading && <div className="animate-pulse text-gray-500">Carregando...</div>}

      {!selectedBoard && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileBarChart className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">Selecione um quadro para ver o relatório</p>
        </div>
      )}

      {selectedBoard && !loading && cards.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cartão</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Prioridade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cards.map(card => (
                <tr key={card.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{card.title}</td>
                  <td className="px-4 py-3 text-gray-600">{card.company?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${card.priority === 'ALTA' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {card.priority === 'ALTA' ? 'Alta' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${card.isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {card.isCompleted ? 'Concluído' : 'Em andamento'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {card.dueDate ? new Date(card.dueDate).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
