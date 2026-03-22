'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  Search, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle,
  CheckCircle2, Clock, Link2, Unlink, RefreshCw, Filter, Loader2,
} from 'lucide-react';

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  CREDIT: { label: 'Crédito', icon: ArrowUpCircle, color: 'text-green-600' },
  DEBIT: { label: 'Débito', icon: ArrowDownCircle, color: 'text-red-600' },
};

export default function StatementsPage() {
  const [statements, setStatements] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterReconciled, setFilterReconciled] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.getBankStatements({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      type: filterType || undefined,
      reconciled: filterReconciled || undefined,
      page,
      limit: 50,
    })
      .then((res) => {
        setStatements(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, filterType, filterReconciled, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const handleReconcile = async () => {
    setReconciling(true);
    setReconcileResult('');
    try {
      const result = await api.triggerReconciliation();
      setReconcileResult(result.message);
      load();
    } catch (err: any) {
      setReconcileResult(err.message || 'Erro na conciliação');
    } finally {
      setReconciling(false);
    }
  };

  const handleUnmatch = async (id: string) => {
    try {
      await api.unmatchStatement(id);
      load();
    } catch (err: any) {
      alert(err.message || 'Erro ao desfazer vinculação');
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extrato Bancário</h1>
          <p className="text-sm text-gray-500">
            {total} transações encontradas
          </p>
        </div>
        <button
          onClick={handleReconcile}
          disabled={reconciling}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {reconciling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {reconciling ? 'Conciliando...' : 'Conciliar Automaticamente'}
        </button>
      </div>

      {reconcileResult && (
        <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{reconcileResult}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Filter className="h-4 w-4 text-gray-400" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <span className="text-sm text-gray-400">até</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os tipos</option>
          <option value="CREDIT">Créditos</option>
          <option value="DEBIT">Débitos</option>
        </select>
        <select
          value={filterReconciled}
          onChange={(e) => { setFilterReconciled(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="true">Conciliados</option>
          <option value="false">Pendentes</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Descrição</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Contraparte</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Categoria</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Valor</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Saldo</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </td>
              </tr>
            ) : statements.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  Nenhuma transação encontrada
                </td>
              </tr>
            ) : (
              statements.map((stmt) => {
                const tc = typeConfig[stmt.type] || typeConfig.DEBIT;
                const Icon = tc.icon;
                const amount = Number(stmt.amount);
                return (
                  <tr key={stmt.id} className="hover:bg-gray-50/50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {new Date(stmt.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="max-w-[300px] truncate px-4 py-3 font-medium text-gray-900">
                      {stmt.description}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{stmt.counterpart || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {stmt.category || 'OUTROS'}
                      </span>
                    </td>
                    <td className={cn('whitespace-nowrap px-4 py-3 text-right font-medium', tc.color)}>
                      <span className="inline-flex items-center gap-1">
                        <Icon className="h-3.5 w-3.5" />
                        {fmt(Math.abs(amount))}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-500">
                      {stmt.balance != null ? fmt(Number(stmt.balance)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {stmt.reconciled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Conciliado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          <Clock className="h-3 w-3" />
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {stmt.reconciled ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-gray-500">
                            {stmt.expense?.title || stmt.invoice?.number || stmt.transfer?.description || 'Vinculado'}
                          </span>
                          <button
                            onClick={() => handleUnmatch(stmt.id)}
                            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                          >
                            <Unlink className="h-3 w-3" />
                            Desvincular
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
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
          <span className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </span>
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
