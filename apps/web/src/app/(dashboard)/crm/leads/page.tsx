'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Plus, Filter, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

const statusLabels: Record<string, { label: string; color: string }> = {
  NEW: { label: 'Novo', color: 'bg-blue-100 text-blue-700' },
  CONTACTED: { label: 'Contatado', color: 'bg-yellow-100 text-yellow-700' },
  QUALIFIED: { label: 'Qualificado', color: 'bg-green-100 text-green-700' },
  UNQUALIFIED: { label: 'Desqualificado', color: 'bg-gray-100 text-gray-700' },
  CONVERTED: { label: 'Convertido', color: 'bg-emerald-100 text-emerald-700' },
  LOST: { label: 'Perdido', color: 'bg-red-100 text-red-700' },
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;

    const timeout = setTimeout(() => {
      api.getLeads(params)
        .then((res: any) => {
          setLeads(res.data || []);
          setTotal(res.total || 0);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, statusFilter]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-gray-500">{total} leads no total</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
          <Plus className="h-4 w-4" />
          Novo Lead
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar leads por nome, email..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-300 p-1">
          <button
            onClick={() => setStatusFilter('')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition',
              !statusFilter ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100',
            )}
          >
            Todos
          </button>
          {Object.entries(statusLabels).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key === statusFilter ? '' : key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition',
                statusFilter === key ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Contato</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Empresa</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Origem</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Score</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Data</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                  Nenhum lead encontrado
                </td>
              </tr>
            ) : (
              leads.map((lead: any) => {
                const status = statusLabels[lead.status] || statusLabels.NEW;
                return (
                  <tr key={lead.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {lead.contact?.firstName} {lead.contact?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{lead.contact?.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {lead.company?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{lead.source || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', status.color)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-700">{lead.score}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
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
