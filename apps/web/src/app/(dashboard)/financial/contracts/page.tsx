'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Plus, Search, FileText } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  ACTIVE: { label: 'Ativo', color: 'bg-green-100 text-green-700' },
  PAUSED: { label: 'Pausado', color: 'bg-yellow-100 text-yellow-700' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  EXPIRED: { label: 'Expirado', color: 'bg-gray-100 text-gray-500' },
};

const cycleLabels: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [mrr, setMrr] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', value: '', billingCycle: 'MONTHLY', startDate: '', dayOfMonth: '10' });

  const load = () => {
    const params: Record<string, string> = {};
    if (filter) params.status = filter;
    if (search) params.search = search;
    api.getContracts(params).then(setContracts).catch(console.error).finally(() => setLoading(false));
    api.getMRR().then(setMrr).catch(() => null);
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [filter, search]);

  const handleCreate = async () => {
    if (!form.title || !form.value || !form.startDate) return;
    await api.createContract({
      title: form.title,
      value: parseFloat(form.value),
      billingCycle: form.billingCycle,
      startDate: form.startDate,
      dayOfMonth: parseInt(form.dayOfMonth),
    });
    setShowNew(false);
    setForm({ title: '', value: '', billingCycle: 'MONTHLY', startDate: '', dayOfMonth: '10' });
    load();
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="mt-1 text-gray-500">
            {mrr ? `MRR: ${fmt(mrr.mrr)} · ARR: ${fmt(mrr.arr)} · ${mrr.activeContracts} ativos` : 'Carregando...'}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700"
        >
          <Plus className="h-4 w-4" />
          Novo Contrato
        </button>
      </div>

      {/* New contract form */}
      {showNew && (
        <div className="mb-6 rounded-xl border border-pisom-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Novo Contrato</h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título do contrato" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none col-span-2" />
            <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Valor (R$)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
              <option value="MONTHLY">Mensal</option>
              <option value="QUARTERLY">Trimestral</option>
              <option value="SEMIANNUAL">Semestral</option>
              <option value="ANNUAL">Anual</option>
            </select>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <input type="number" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} placeholder="Dia do vencimento" min="1" max="28" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <div className="flex gap-2 col-span-2 lg:col-span-2">
              <button onClick={handleCreate} className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">Criar</button>
              <button onClick={() => setShowNew(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contratos..." className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-pisom-500 focus:outline-none" />
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-300 p-1">
          {['', 'ACTIVE', 'PAUSED', 'CANCELLED'].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition', filter === s ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100')}>
              {s ? statusConfig[s]?.label : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Contrato</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Valor</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Ciclo</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Início</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Próx. fatura</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Faturas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : contracts.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Nenhum contrato encontrado</td></tr>
            ) : (
              contracts.map((c: any) => {
                const st = statusConfig[c.status] || statusConfig.DRAFT;
                return (
                  <tr key={c.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{fmt(Number(c.value))}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{cycleLabels[c.billingCycle] || c.billingCycle}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{new Date(c.startDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {c.nextBillingDate ? new Date(c.nextBillingDate).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', st.color)}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{c._count?.invoices || 0}</td>
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
