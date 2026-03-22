'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  FileText, ChevronLeft, ChevronRight, AlertTriangle, Clock,
  CheckCircle2, Calendar, Loader2,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  SCHEDULED: { label: 'Agendado', color: 'bg-blue-100 text-blue-700' },
  PAID: { label: 'Pago', color: 'bg-green-100 text-green-700' },
  EXPIRED: { label: 'Vencido', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelado', color: 'bg-gray-100 text-gray-500' },
};

export default function DdaPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.getDdaBills({
      status: filterStatus || undefined,
      page,
      limit: 50,
    })
      .then((res) => {
        setBills(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const getDaysUntilDue = (dueDate: string) => {
    const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const pendingTotal = bills
    .filter((b) => b.status === 'PENDING' || b.status === 'SCHEDULED')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DDA - Boletos Eletrônicos</h1>
          <p className="text-sm text-gray-500">
            {total} boletos encontrados
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Pendente</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{fmt(pendingTotal)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Boletos Pendentes</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {bills.filter((b) => b.status === 'PENDING').length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Vencendo Hoje</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {bills.filter((b) => getDaysUntilDue(b.dueDate) === 0 && b.status === 'PENDING').length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendentes</option>
          <option value="SCHEDULED">Agendados</option>
          <option value="PAID">Pagos</option>
          <option value="EXPIRED">Vencidos</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Emissor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">CNPJ/CPF</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Valor</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Vencimento</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Prazo</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Despesa Vinculada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Nenhum boleto DDA encontrado. Sincronize o Sicoob primeiro.
                </td>
              </tr>
            ) : (
              bills.map((bill) => {
                const days = getDaysUntilDue(bill.dueDate);
                const sc = statusConfig[bill.status] || statusConfig.PENDING;
                return (
                  <tr key={bill.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">{bill.issuerName}</td>
                    <td className="px-4 py-3 text-gray-600">{bill.issuerDocument || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900">
                      {fmt(Number(bill.amount))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-gray-600">
                      {new Date(bill.dueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {bill.status === 'PENDING' && (
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          days < 0 && 'bg-red-100 text-red-700',
                          days === 0 && 'bg-orange-100 text-orange-700',
                          days > 0 && days <= 3 && 'bg-yellow-100 text-yellow-700',
                          days > 3 && 'bg-gray-100 text-gray-600',
                        )}>
                          {days < 0 ? (
                            <><AlertTriangle className="h-3 w-3" /> {Math.abs(days)}d atraso</>
                          ) : days === 0 ? (
                            <><AlertTriangle className="h-3 w-3" /> Hoje</>
                          ) : (
                            <><Calendar className="h-3 w-3" /> {days}d</>
                          )}
                        </span>
                      )}
                      {bill.status !== 'PENDING' && <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', sc.color)}>
                        {bill.status === 'PAID' && <CheckCircle2 className="h-3 w-3" />}
                        {bill.status === 'PENDING' && <Clock className="h-3 w-3" />}
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {bill.expense ? (
                        <span className="text-xs">
                          {bill.expense.title} ({fmt(Number(bill.expense.value))})
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Não vinculado</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
