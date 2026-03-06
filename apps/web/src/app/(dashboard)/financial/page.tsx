'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  ArrowRight,
  Receipt,
} from 'lucide-react';

export default function FinancialOverviewPage() {
  const router = useRouter();
  const [mrr, setMrr] = useState<any>(null);
  const [invoiceSummary, setInvoiceSummary] = useState<any>(null);
  const [expenseSummary, setExpenseSummary] = useState<any>(null);
  const [dre, setDre] = useState<any>(null);
  const [cashflow, setCashflow] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.getMRR().then(setMrr).catch(() => null),
      api.getInvoiceSummary().then(setInvoiceSummary).catch(() => null),
      api.getExpenseSummary().then(setExpenseSummary).catch(() => null),
      api.getDRE().then(setDre).catch(() => null),
      api.getCashflowRealized(6).then(setCashflow).catch(() => null),
    ]);
  }, []);

  const fmt = (v: number) =>
    `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="mt-1 text-gray-500">Visão geral da saúde financeira</p>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">MRR</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{mrr ? fmt(mrr.mrr) : '—'}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-green-600"><TrendingUp className="h-5 w-5" /></div>
          </div>
          {mrr && <p className="mt-2 text-xs text-gray-500">{mrr.activeContracts} contratos ativos</p>}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Recebido (mês)</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {invoiceSummary ? fmt(invoiceSummary.received.total) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600"><DollarSign className="h-5 w-5" /></div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Despesas (mês)</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {expenseSummary ? fmt(expenseSummary.paid) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-red-600"><TrendingDown className="h-5 w-5" /></div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inadimplência</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {invoiceSummary ? fmt(invoiceSummary.overdue.total) : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-red-600"><AlertTriangle className="h-5 w-5" /></div>
          </div>
          {invoiceSummary && (
            <p className="mt-2 text-xs text-gray-500">{invoiceSummary.overdue.count} faturas vencidas</p>
          )}
        </div>
      </div>

      {/* DRE Summary + Quick links */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* DRE Card */}
        {dre && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">DRE Simplificado - {dre.month}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Receita bruta</span>
                <span className="font-semibold text-green-700">{fmt(dre.grossRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">(-) Despesas totais</span>
                <span className="font-semibold text-red-600">{fmt(dre.totalExpenses)}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Lucro líquido</span>
                <span className={cn('text-lg font-bold', dre.netProfit >= 0 ? 'text-green-700' : 'text-red-700')}>
                  {fmt(dre.netProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Margem</span>
                <span className={cn('text-sm font-medium', dre.margin >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {dre.margin}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="space-y-3">
          {[
            { label: 'Contratos', href: '/financial/contracts', icon: FileText, desc: 'Recorrência e MRR' },
            { label: 'Faturas', href: '/financial/invoices', icon: Receipt, desc: 'Cobranças e pagamentos' },
            { label: 'Despesas', href: '/financial/expenses', icon: TrendingDown, desc: 'Contas a pagar' },
            { label: 'Fluxo de Caixa', href: '/financial/cashflow', icon: TrendingUp, desc: 'Realizado e projetado' },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-pisom-300 hover:shadow-md"
            >
              <div className="rounded-lg bg-pisom-50 p-2.5 text-pisom-600">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Cashflow Chart (simple table version) */}
      {cashflow.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Fluxo de Caixa (últimos 6 meses)</h3>
          <div className="grid grid-cols-6 gap-3">
            {cashflow.map((month) => {
              const maxVal = Math.max(...cashflow.map((m) => Math.max(m.revenue, m.expenses)), 1);
              return (
                <div key={month.month} className="text-center">
                  <div className="mb-2 flex h-32 items-end justify-center gap-1">
                    <div
                      className="w-5 rounded-t bg-green-400"
                      style={{ height: `${(month.revenue / maxVal) * 100}%`, minHeight: '4px' }}
                    />
                    <div
                      className="w-5 rounded-t bg-red-400"
                      style={{ height: `${(month.expenses / maxVal) * 100}%`, minHeight: '4px' }}
                    />
                  </div>
                  <p className="text-xs font-medium text-gray-700">{month.month.slice(5)}</p>
                  <p className={cn('text-xs font-medium', month.balance >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {month.balance >= 0 ? '+' : ''}{fmt(month.balance)}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-green-400" />Receita</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-400" />Despesas</span>
          </div>
        </div>
      )}
    </div>
  );
}
