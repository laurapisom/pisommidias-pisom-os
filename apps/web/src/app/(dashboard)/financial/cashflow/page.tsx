'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, BarChart3, Table, Download } from 'lucide-react';

export default function CashflowPage() {
  const [realized, setRealized] = useState<any[]>([]);
  const [projected, setProjected] = useState<any[]>([]);
  const [dre, setDre] = useState<any>(null);
  const [profitability, setProfitability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dreMonth, setDreMonth] = useState('');
  const [realizedMonths, setRealizedMonths] = useState(6);
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getCashflowRealized(realizedMonths).then(setRealized),
      api.getCashflowProjected(3).then(setProjected),
      api.getDRE(dreMonth || undefined).then(setDre),
      api.getClientProfitability(dreMonth || undefined).then(setProfitability),
    ]).catch(console.error).finally(() => setLoading(false));
  }, [realizedMonths, dreMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const navigateDreMonth = (direction: number) => {
    const current = dreMonth || new Date().toISOString().slice(0, 7);
    const [y, m] = current.split('-').map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    setDreMonth(d.toISOString().slice(0, 7));
  };

  const allMonths = [...realized, ...projected];
  const totalRealized = realized.reduce((a, m) => ({ rev: a.rev + m.revenue, exp: a.exp + m.expenses }), { rev: 0, exp: 0 });

  const exportCashflowCSV = () => {
    const headers = ['Mês', 'Receita', 'Despesas', 'Saldo', 'Tipo'];
    const rows = allMonths.map(m => [
      m.month,
      m.revenue.toFixed(2),
      m.expenses.toFixed(2),
      m.balance.toFixed(2),
      m.projected ? 'Projetado' : 'Realizado',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && realized.length === 0) {
    return (
      <div>
        <div className="mb-6"><div className="h-7 w-48 rounded bg-gray-200 animate-pulse" /><div className="mt-2 h-4 w-64 rounded bg-gray-100 animate-pulse" /></div>
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl border border-gray-200 bg-white animate-pulse" />)}
        </div>
        <div className="h-48 rounded-xl border border-gray-200 bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fluxo de Caixa</h1>
          <p className="mt-1 text-gray-500">Realizado e projetado + DRE gerencial</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-300 p-0.5">
            <button onClick={() => setView('chart')} className={cn('rounded-md px-2.5 py-1.5 text-xs font-medium transition', view === 'chart' ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100')}>
              <BarChart3 className="mr-1 inline h-3 w-3" /> Gráfico
            </button>
            <button onClick={() => setView('table')} className={cn('rounded-md px-2.5 py-1.5 text-xs font-medium transition', view === 'table' ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100')}>
              <Table className="mr-1 inline h-3 w-3" /> Tabela
            </button>
          </div>
          <button onClick={exportCashflowCSV} disabled={allMonths.length === 0} className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <select value={realizedMonths} onChange={(e) => setRealizedMonths(Number(e.target.value))} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-pisom-500 focus:outline-none">
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
        </div>
      </div>

      {/* Cashflow Summary Cards */}
      {realized.length > 0 && (() => {
        const avgRev = totalRealized.rev / realized.length;
        const avgExp = totalRealized.exp / realized.length;
        const lastMonth = realized[realized.length - 1];
        const prevMonth = realized.length >= 2 ? realized[realized.length - 2] : null;
        const revGrowth = prevMonth && prevMonth.revenue > 0 ? Math.round(((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100) : null;
        return (
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Receita Total ({realizedMonths}m)</p>
              <p className="mt-1 text-xl font-bold text-green-700">{fmt(totalRealized.rev)}</p>
              <p className="text-xs text-gray-400">Média: {fmt(avgRev)}/mês</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Despesas Total ({realizedMonths}m)</p>
              <p className="mt-1 text-xl font-bold text-red-600">{fmt(totalRealized.exp)}</p>
              <p className="text-xs text-gray-400">Média: {fmt(avgExp)}/mês</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Saldo Acumulado</p>
              <p className={cn('mt-1 text-xl font-bold', totalRealized.rev - totalRealized.exp >= 0 ? 'text-green-700' : 'text-red-700')}>
                {fmt(totalRealized.rev - totalRealized.exp)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Crescimento MoM</p>
              {revGrowth !== null ? (
                <>
                  <p className={cn('mt-1 text-xl font-bold', revGrowth >= 0 ? 'text-green-700' : 'text-red-700')}>
                    {revGrowth >= 0 ? '+' : ''}{revGrowth}%
                  </p>
                  <p className="text-xs text-gray-400">vs mês anterior</p>
                </>
              ) : <p className="mt-1 text-lg text-gray-400">—</p>}
            </div>
          </div>
        );
      })()}

      {/* Visual Cashflow Chart */}
      {view === 'chart' && allMonths.length > 0 && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Fluxo Mensal</h3>
          <div className={cn('grid gap-2', allMonths.length <= 6 ? 'grid-cols-6' : allMonths.length <= 9 ? 'grid-cols-9' : 'grid-cols-12')}>
            {allMonths.map((m) => {
              const maxVal = Math.max(...allMonths.map((x) => Math.max(x.revenue, x.expenses)), 1);
              return (
                <div key={m.month} className={cn('text-center', m.projected && 'opacity-60')}>
                  <div className="mb-1 flex h-28 items-end justify-center gap-0.5">
                    <div className="w-4 rounded-t bg-green-400" style={{ height: `${(m.revenue / maxVal) * 100}%`, minHeight: '2px' }} />
                    <div className="w-4 rounded-t bg-red-400" style={{ height: `${(m.expenses / maxVal) * 100}%`, minHeight: '2px' }} />
                  </div>
                  <p className="text-[10px] font-medium text-gray-600">
                    {m.month.slice(5)}
                    {m.projected && '*'}
                  </p>
                  <p className={cn('text-[10px] font-medium', m.balance >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {m.balance >= 0 ? '+' : ''}{fmt(m.balance)}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-green-400" />Receita</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-400" />Despesas</span>
            <span className="text-gray-400">* Projetado</span>
          </div>
        </div>
      )}

      {/* Cashflow Table */}
      {view === 'table' && <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Detalhamento</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Mês</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Receita</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Despesas</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allMonths.map((m) => (
                <tr key={m.month} className={cn('transition', m.projected ? 'bg-blue-50/30' : 'hover:bg-gray-50')}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {m.month}
                    {m.projected && <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">Projetado</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-green-700">{fmt(m.revenue)}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-red-600">{fmt(m.expenses)}</td>
                  <td className={cn('px-4 py-3 text-right text-sm font-bold', m.balance >= 0 ? 'text-green-700' : 'text-red-700')}>
                    {fmt(m.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

      {/* DRE with month navigation */}
      {dre && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase text-gray-500">DRE Gerencial</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => navigateDreMonth(-1)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[80px] text-center text-sm font-medium text-gray-700">{dre.month}</span>
              <button onClick={() => navigateDreMonth(1)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-700">Receita Bruta</span>
                <span className="text-xs text-gray-400">({dre.revenueCount} faturas)</span>
              </div>
              <span className="text-lg font-bold text-green-700">{fmt(dre.grossRevenue)}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-sm text-gray-700">(-) Despesas Totais</span>
                <span className="text-xs text-gray-400">({dre.expenseCount} despesas)</span>
              </div>
              <span className="text-lg font-bold text-red-600">{fmt(dre.totalExpenses)}</span>
            </div>

            {dre.expenseBreakdown?.length > 0 && (
              <div className="ml-6 space-y-1 border-l-2 border-gray-200 pl-4">
                {dre.expenseBreakdown.map((cat: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-500">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color || '#9CA3AF' }} />
                      {cat.category}
                    </span>
                    <span className="text-gray-600">{fmt(cat.value)}</span>
                  </div>
                ))}
              </div>
            )}

            <hr className="border-gray-300" />

            <div className="flex items-center justify-between py-2">
              <span className="font-semibold text-gray-900">Lucro Líquido</span>
              <span className={cn('text-xl font-bold', dre.netProfit >= 0 ? 'text-green-700' : 'text-red-700')}>
                {fmt(dre.netProfit)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Margem líquida</span>
              <span className={cn('rounded-full px-3 py-1 text-sm font-bold', dre.margin >= 20 ? 'bg-green-100 text-green-700' : dre.margin >= 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                {dre.margin}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Client Profitability */}
      {profitability.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Rentabilidade por Cliente</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Contrato</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Receita</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Custo</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Lucro</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profitability.map((p: any) => (
                <tr key={p.contractId} className="transition hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.contractTitle}</td>
                  <td className="px-4 py-3 text-right text-sm text-green-700">{fmt(p.revenue)}</td>
                  <td className="px-4 py-3 text-right text-sm text-red-600">{fmt(p.expenses)}</td>
                  <td className={cn('px-4 py-3 text-right text-sm font-semibold', p.profit >= 0 ? 'text-green-700' : 'text-red-700')}>
                    {fmt(p.profit)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', p.margin >= 20 ? 'bg-green-100 text-green-700' : p.margin >= 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                      {p.margin}%
                    </span>
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
