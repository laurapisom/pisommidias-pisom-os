'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Plus, CheckCircle2, XCircle, DollarSign } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { label: 'Aprovada', color: 'bg-blue-100 text-blue-700' },
  PAID: { label: 'Paga', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejeitada', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500' },
};

const typeLabels: Record<string, string> = {
  FIXED: 'Fixa', VARIABLE: 'Variável', ONE_TIME: 'Pontual', INVESTMENT: 'Investimento',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', value: '', dueDate: '', type: 'FIXED', supplier: '' });
  const [categories, setCategories] = useState<any[]>([]);

  const load = () => {
    const params: Record<string, string> = {};
    if (filter) params.status = filter;
    api.getExpenses(params).then((res: any) => setExpenses(res.data || [])).catch(console.error).finally(() => setLoading(false));
    api.getExpenseSummary().then(setSummary).catch(() => null);
  };

  useEffect(() => { load(); }, [filter]);
  useEffect(() => { api.getExpenseCategories().then(setCategories).catch(() => null); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.value || !form.dueDate) return;
    await api.createExpense({
      title: form.title,
      value: parseFloat(form.value),
      dueDate: form.dueDate,
      type: form.type,
      supplier: form.supplier || undefined,
    });
    setShowNew(false);
    setForm({ title: '', value: '', dueDate: '', type: 'FIXED', supplier: '' });
    load();
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Despesas</h1>
          <p className="mt-1 text-gray-500">Contas a pagar e controle de custos</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
          <Plus className="h-4 w-4" />
          Nova Despesa
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total ({summary.month})</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{fmt(summary.total)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Pago</p>
            <p className="mt-1 text-xl font-bold text-green-700">{fmt(summary.paid)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Pendente</p>
            <p className="mt-1 text-xl font-bold text-yellow-700">{fmt(summary.pending)}</p>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {summary?.byCategory?.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Por Categoria</h3>
          <div className="space-y-2">
            {summary.byCategory.map((cat: any) => (
              <div key={cat.categoryId || 'none'} className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color || '#9CA3AF' }} />
                <span className="flex-1 text-sm text-gray-700">{cat.categoryName}</span>
                <span className="text-sm font-medium text-gray-900">{fmt(cat.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New form */}
      {showNew && (
        <div className="mb-6 rounded-xl border border-pisom-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Nova Despesa</h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título" className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Valor (R$)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
              <option value="FIXED">Fixa</option>
              <option value="VARIABLE">Variável</option>
              <option value="ONE_TIME">Pontual</option>
              <option value="INVESTMENT">Investimento</option>
            </select>
            <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Fornecedor (opcional)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <div className="flex gap-2 col-span-2">
              <button onClick={handleCreate} className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">Criar</button>
              <button onClick={() => setShowNew(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-1 rounded-lg border border-gray-300 p-1">
        {['', 'PENDING', 'APPROVED', 'PAID', 'REJECTED'].map((s) => (
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
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Despesa</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Categoria</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Tipo</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Valor</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Vencimento</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Nenhuma despesa encontrada</td></tr>
            ) : (
              expenses.map((exp: any) => {
                const st = statusConfig[exp.status] || statusConfig.PENDING;
                return (
                  <tr key={exp.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{exp.title}</p>
                      {exp.supplier && <p className="text-xs text-gray-500">{exp.supplier}</p>}
                    </td>
                    <td className="px-5 py-3">
                      {exp.category ? (
                        <span className="flex items-center gap-1.5 text-sm text-gray-600">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: exp.category.color || '#9CA3AF' }} />
                          {exp.category.name}
                        </span>
                      ) : <span className="text-sm text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{typeLabels[exp.type] || exp.type}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{fmt(Number(exp.value))}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{new Date(exp.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', st.color)}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {exp.status === 'PENDING' && (
                          <button onClick={async () => { await api.approveExpense(exp.id); load(); }} title="Aprovar" className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {exp.status === 'APPROVED' && (
                          <button onClick={async () => { await api.payExpense(exp.id); load(); }} title="Pagar" className="rounded p-1.5 text-green-600 hover:bg-green-50">
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                        {exp.status === 'PENDING' && (
                          <button onClick={async () => { await api.rejectExpense(exp.id); load(); }} title="Rejeitar" className="rounded p-1.5 text-red-600 hover:bg-red-50">
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
