'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

export default function CashflowPage() {
  const [realized, setRealized] = useState<any[]>([]);
  const [projected, setProjected] = useState<any[]>([]);
  const [dre, setDre] = useState<any>(null);
  const [profitability, setProfitability] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getCashflowRealized(6).then(setRealized),
      api.getCashflowProjected(3).then(setProjected),
      api.getDRE().then(setDre),
      api.getClientProfitability().then(setProfitability),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center text-gray-400">Carregando...</div>;
  }

  const allMonths = [...realized, ...projected];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fluxo de Caixa</h1>
        <p className="mt-1 text-gray-500">Realizado e projetado + DRE gerencial</p>
      </div>

      {/* Cashflow Table */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Fluxo de Caixa</h3>
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
      </div>

      {/* DRE */}
      {dre && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">DRE Gerencial - {dre.month}</h3>
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

            {/* Expense breakdown */}
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
