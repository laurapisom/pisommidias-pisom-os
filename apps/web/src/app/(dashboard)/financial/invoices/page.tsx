'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Search, Plus, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  SENT: { label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  OVERDUE: { label: 'Vencida', color: 'bg-red-100 text-red-700' },
  PAID: { label: 'Paga', color: 'bg-green-100 text-green-700' },
  PARTIALLY_PAID: { label: 'Parcial', color: 'bg-orange-100 text-orange-700' },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500' },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    const params: Record<string, string> = {};
    if (filter) params.status = filter;
    api.getInvoices(params).then((res: any) => setInvoices(res.data || [])).catch(console.error).finally(() => setLoading(false));
    api.getInvoiceSummary().then(setSummary).catch(() => null);
  };

  useEffect(() => { load(); }, [filter]);

  const handlePay = async (id: string) => {
    await api.markInvoicePaid(id);
    load();
  };

  const handleCancel = async (id: string) => {
    await api.cancelInvoice(id);
    load();
  };

  const handleGenerate = async () => {
    const result = await api.generateInvoices();
    alert(`${result.generated} fatura(s) gerada(s)`);
    load();
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faturas</h1>
          <p className="mt-1 text-gray-500">Cobranças e pagamentos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleGenerate} className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            Gerar faturas
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
            <Plus className="h-4 w-4" />
            Nova Fatura
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-6 grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Faturado ({summary.month})</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{fmt(summary.billed.total)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Recebido</p>
            <p className="mt-1 text-xl font-bold text-green-700">{fmt(summary.received.total)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Pendente</p>
            <p className="mt-1 text-xl font-bold text-yellow-700">{fmt(summary.pending.total)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Inadimplente</p>
            <p className="mt-1 text-xl font-bold text-red-700">{fmt(summary.overdue.total)}</p>
            <p className="text-xs text-gray-400">{summary.overdue.count} faturas</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-1 rounded-lg border border-gray-300 p-1">
        {['', 'PENDING', 'SENT', 'OVERDUE', 'PAID', 'CANCELLED'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition', filter === s ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100')}>
            {s ? statusConfig[s]?.label : 'Todas'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Nº</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Descrição</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Valor</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Vencimento</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Referência</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Nenhuma fatura encontrada</td></tr>
            ) : (
              invoices.map((inv: any) => {
                const st = statusConfig[inv.status] || statusConfig.PENDING;
                const isOverdue = inv.status === 'OVERDUE' || (inv.status === 'PENDING' && new Date(inv.dueDate) < new Date());
                return (
                  <tr key={inv.id} className={cn('transition hover:bg-gray-50', isOverdue && 'bg-red-50/50')}>
                    <td className="px-5 py-3 text-sm font-mono text-gray-500">#{inv.number}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{inv.description || inv.contract?.title || '—'}</p>
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{fmt(Number(inv.totalValue))}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{new Date(inv.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{inv.referenceMonth || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', st.color)}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {['PENDING', 'SENT', 'OVERDUE'].includes(inv.status) && (
                          <button onClick={() => handlePay(inv.id)} title="Registrar pagamento" className="rounded p-1.5 text-green-600 hover:bg-green-50">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {['PENDING', 'DRAFT'].includes(inv.status) && (
                          <button onClick={() => handleCancel(inv.id)} title="Cancelar" className="rounded p-1.5 text-red-600 hover:bg-red-50">
                            <XCircle className="h-4 w-4" />
                          </button>
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
