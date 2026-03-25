'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TrendingUp, Trophy, User } from 'lucide-react';

export default function ProductivityPage() {
  const [myStats, setMyStats] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getMyProductivity(period),
      api.getProductivityRanking(period),
    ])
      .then(([my, rank]) => { setMyStats(my); setRanking(rank); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-pulse text-gray-500">Carregando...</div></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtividade</h1>
          <p className="mt-1 text-sm text-gray-500">Acompanhe seu desempenho e o da equipe</p>
        </div>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none"
        >
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
        </select>
      </div>

      {myStats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total', value: myStats.total },
            { label: 'Concluídos', value: myStats.completed },
            { label: 'No Prazo', value: myStats.onTime },
            { label: 'Score', value: `${myStats.score}%` },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {ranking.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Ranking da Equipe
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {ranking.map((item, index) => (
              <div key={item.user.id} className="flex items-center gap-4 px-5 py-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-600' :
                  index === 2 ? 'bg-orange-100 text-orange-600' : 'text-gray-400'
                }`}>
                  {index + 1}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pisom-100 text-sm font-bold text-pisom-700">
                  {item.user.firstName[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.user.firstName} {item.user.lastName}</p>
                  <p className="text-xs text-gray-500">{item.onTime}/{item.total} no prazo</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-pisom-700">{item.score}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
