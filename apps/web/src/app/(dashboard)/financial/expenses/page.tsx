'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Plus, CheckCircle2, XCircle, DollarSign, Pencil, X, Calendar, Tag, FolderOpen, Search, ChevronLeft, ChevronRight, Download, Copy, Trash2 } from 'lucide-react';

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

const costCenterTypeLabels: Record<string, string> = {
  CLIENT: 'Cliente', PROJECT: 'Projeto', SQUAD: 'Squad', DEPARTMENT: 'Departamento', GENERAL: 'Geral',
};

const defaultColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);

  // New expense form
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', value: '', dueDate: '', type: 'FIXED', supplier: '', description: '', categoryId: '', costCenterId: '', notes: '' });

  // Edit modal
  const [editExpense, setEditExpense] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Category/CostCenter management
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');
  const [showCCManager, setShowCCManager] = useState(false);
  const [newCCName, setNewCCName] = useState('');
  const [newCCType, setNewCCType] = useState('GENERAL');

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (filter) params.status = filter;
    if (search) params.search = search;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    api.getExpenses(params)
      .then((res: any) => {
        setExpenses(res.data || []);
        setTotalCount(res.total || 0);
        setTotalPages(res.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    api.getExpenseSummary().then(setSummary).catch(() => null);
  }, [filter, search, startDate, endDate, page]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => { setPage(1); }, [filter, search, startDate, endDate]);

  useEffect(() => {
    api.getExpenseCategories().then(setCategories).catch(() => null);
    api.getCostCenters().then(setCostCenters).catch(() => null);
  }, []);

  const handleCreate = async () => {
    if (!form.title || !form.value || !form.dueDate) return;
    try {
      await api.createExpense({
        title: form.title,
        value: parseFloat(form.value),
        dueDate: form.dueDate,
        type: form.type,
        supplier: form.supplier || undefined,
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
        costCenterId: form.costCenterId || undefined,
        notes: form.notes || undefined,
      });
      setShowNew(false);
      setForm({ title: '', value: '', dueDate: '', type: 'FIXED', supplier: '', description: '', categoryId: '', costCenterId: '', notes: '' });
      showToast('Despesa criada com sucesso');
      load();
    } catch { showToast('Erro ao criar despesa', 'error'); }
  };

  const openEdit = (exp: any) => {
    setEditExpense(exp);
    setEditForm({
      title: exp.title,
      value: String(exp.value),
      dueDate: exp.dueDate?.split('T')[0] || '',
      type: exp.type,
      supplier: exp.supplier || '',
      description: exp.description || '',
      categoryId: exp.categoryId || '',
      costCenterId: exp.costCenterId || '',
      notes: exp.notes || '',
    });
  };

  const handleUpdate = async () => {
    if (!editExpense) return;
    try {
      await api.updateExpense(editExpense.id, {
        title: editForm.title,
        value: parseFloat(editForm.value),
        dueDate: editForm.dueDate,
        type: editForm.type,
        supplier: editForm.supplier || undefined,
        description: editForm.description || undefined,
        categoryId: editForm.categoryId || undefined,
        costCenterId: editForm.costCenterId || undefined,
        notes: editForm.notes || undefined,
      });
      setEditExpense(null);
      showToast('Despesa atualizada');
      load();
    } catch { showToast('Erro ao atualizar despesa', 'error'); }
  };

  const handleCreateCategory = async () => {
    if (!newCatName) return;
    await api.createExpenseCategory({ name: newCatName, color: newCatColor });
    setNewCatName('');
    setNewCatColor('#3B82F6');
    const cats = await api.getExpenseCategories();
    setCategories(cats);
  };

  const handleCreateCostCenter = async () => {
    if (!newCCName) return;
    await api.createCostCenter({ name: newCCName, type: newCCType });
    setNewCCName('');
    setNewCCType('GENERAL');
    const ccs = await api.getCostCenters();
    setCostCenters(ccs);
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const duplicateExpense = async (exp: any) => {
    const nextMonth = new Date(exp.dueDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    try {
      await api.createExpense({
        title: exp.title,
        value: Number(exp.value),
        dueDate: nextMonth.toISOString().split('T')[0],
        type: exp.type,
        supplier: exp.supplier || undefined,
        description: exp.description || undefined,
        categoryId: exp.categoryId || undefined,
        costCenterId: exp.costCenterId || undefined,
        notes: exp.notes || undefined,
      });
      showToast('Despesa duplicada para o próximo mês');
      load();
    } catch { showToast('Erro ao duplicar despesa', 'error'); }
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const exportCSV = () => {
    const headers = ['Título', 'Fornecedor', 'Categoria', 'Tipo', 'Valor', 'Vencimento', 'Status'];
    const rows = expenses.map((exp: any) => [
      exp.title,
      exp.supplier || '',
      exp.category?.name || '',
      typeLabels[exp.type] || exp.type,
      Number(exp.value).toFixed(2),
      new Date(exp.dueDate).toLocaleDateString('pt-BR'),
      (statusConfig[exp.status] || statusConfig.PENDING).label,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `despesas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Despesas</h1>
          <p className="mt-1 text-gray-500">Contas a pagar e controle de custos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} disabled={expenses.length === 0} className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button onClick={() => setShowCatManager(!showCatManager)} className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Tag className="h-4 w-4" /> Categorias
          </button>
          <button onClick={() => setShowCCManager(!showCCManager)} className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <FolderOpen className="h-4 w-4" /> Centros de Custo
          </button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
            <Plus className="h-4 w-4" /> Nova Despesa
          </button>
        </div>
      </div>

      {/* Category Manager */}
      {showCatManager && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Categorias de Despesa</h3>
            <button onClick={() => setShowCatManager(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="mb-4 flex items-center gap-3">
            <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nome da categoria" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <div className="flex gap-1">
              {defaultColors.map((c) => (
                <button key={c} onClick={() => setNewCatColor(c)} className={cn('h-7 w-7 rounded-full border-2 transition', newCatColor === c ? 'border-gray-900 scale-110' : 'border-transparent')} style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={handleCreateCategory} className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">Criar</button>
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span key={cat.id} className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color || '#9CA3AF' }} />
                  {cat.name}
                  <span className="text-xs text-gray-400">({cat._count?.expenses || 0})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cost Center Manager */}
      {showCCManager && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Centros de Custo</h3>
            <button onClick={() => setShowCCManager(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          <div className="mb-4 flex items-center gap-3">
            <input value={newCCName} onChange={(e) => setNewCCName(e.target.value)} placeholder="Nome do centro de custo" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <select value={newCCType} onChange={(e) => setNewCCType(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
              <option value="GENERAL">Geral</option>
              <option value="CLIENT">Cliente</option>
              <option value="PROJECT">Projeto</option>
              <option value="SQUAD">Squad</option>
              <option value="DEPARTMENT">Departamento</option>
            </select>
            <button onClick={handleCreateCostCenter} className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">Criar</button>
          </div>
          {costCenters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {costCenters.map((cc) => (
                <span key={cc.id} className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm">
                  <FolderOpen className="h-3 w-3 text-gray-400" />
                  {cc.name}
                  <span className="text-xs text-gray-400">{costCenterTypeLabels[cc.type] || cc.type} ({cc._count?.expenses || 0})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Total ({summary.month})</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{fmt(summary.total)}</p>
            <p className="text-xs text-gray-400">{summary.count} despesas</p>
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
                <span className="text-xs text-gray-400">{cat.count} itens</span>
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
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
              <option value="">Categoria (opcional)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={form.costCenterId} onChange={(e) => setForm({ ...form, costCenterId: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
              <option value="">Centro de custo (opcional)</option>
              {costCenters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Fornecedor (opcional)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição (opcional)" rows={2} className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações (opcional)" rows={2} className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <div className="flex gap-2 col-span-2 lg:col-span-4">
              <button onClick={handleCreate} className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">Criar</button>
              <button onClick={() => setShowNew(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar despesas..." className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-pisom-500 focus:outline-none" />
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-300 p-1">
          {['', 'PENDING', 'APPROVED', 'PAID', 'REJECTED'].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition', filter === s ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100')}>
              {s ? statusConfig[s]?.label : 'Todas'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          {[
            { label: 'Este mês', fn: () => { const now = new Date(); setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`); setEndDate(''); } },
            { label: 'Mês anterior', fn: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); setStartDate(`${y}-${m}-01`); const last = new Date(y, d.getMonth() + 1, 0); setEndDate(`${y}-${m}-${String(last.getDate()).padStart(2, '0')}`); } },
            { label: 'Trimestre', fn: () => { const now = new Date(); const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); setStartDate(qStart.toISOString().slice(0, 10)); setEndDate(''); } },
          ].map(p => (
            <button key={p.label} onClick={p.fn} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">{p.label}</button>
          ))}
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-pisom-500 focus:outline-none" />
          <span className="text-xs text-gray-400">até</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-pisom-500 focus:outline-none" />
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-red-500 hover:text-red-700">Limpar</button>
          )}
        </div>
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
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-3"><div className="h-4 w-28 rounded bg-gray-200" /><div className="mt-1 h-3 w-20 rounded bg-gray-100" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-6 w-20 rounded bg-gray-100" /></td>
                </tr>
              ))
            ) : expenses.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-16 text-center">
                <DollarSign className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-500">Nenhuma despesa encontrada</p>
                <p className="mt-1 text-xs text-gray-400">{search || filter || startDate ? 'Tente ajustar os filtros' : 'Cadastre sua primeira despesa'}</p>
                {!search && !filter && !startDate && (
                  <button onClick={() => setShowNew(true)} className="mt-3 rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">
                    <Plus className="mr-1 inline h-4 w-4" /> Nova Despesa
                  </button>
                )}
              </td></tr>
            ) : (
              expenses.map((exp: any) => {
                const st = statusConfig[exp.status] || statusConfig.PENDING;
                const isFromAsaas = !!exp.asaasTransactionId;
                return (
                  <tr key={exp.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{exp.title}</p>
                          {exp.supplier && <p className="text-xs text-gray-500">{exp.supplier}</p>}
                        </div>
                        {isFromAsaas && (
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">Asaas</span>
                        )}
                      </div>
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
                        {isFromAsaas ? (
                          /* Despesas do Asaas: somente duplicar */
                          <button onClick={() => duplicateExpense(exp)} title="Duplicar para próx. mês" className="rounded p-1.5 text-gray-400 hover:bg-gray-100">
                            <Copy className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
                            {/* Despesas manuais: editar sempre disponível */}
                            <button onClick={() => openEdit(exp)} title="Editar" className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                              <Pencil className="h-4 w-4" />
                            </button>
                            {/* Ações de workflow */}
                            {exp.status === 'PENDING' && (
                              <>
                                <button onClick={async () => { await api.approveExpense(exp.id); showToast('Despesa aprovada'); load(); }} title="Aprovar" className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                                <button onClick={async () => { await api.rejectExpense(exp.id); showToast('Despesa rejeitada'); load(); }} title="Rejeitar" className="rounded p-1.5 text-red-600 hover:bg-red-50">
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {exp.status === 'APPROVED' && (
                              <button onClick={async () => { await api.payExpense(exp.id); showToast('Despesa paga'); load(); }} title="Pagar" className="rounded p-1.5 text-green-600 hover:bg-green-50">
                                <DollarSign className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => duplicateExpense(exp)} title="Duplicar para próx. mês" className="rounded p-1.5 text-gray-400 hover:bg-gray-100">
                              <Copy className="h-4 w-4" />
                            </button>
                            {/* Excluir — sempre disponível para despesas manuais */}
                            <button
                              onClick={async () => {
                                if (!confirm(`Excluir despesa "${exp.title}"?`)) return;
                                try {
                                  await api.deleteExpense(exp.id);
                                  showToast('Despesa excluída');
                                  load();
                                } catch (err: any) {
                                  showToast(err.message || 'Erro ao excluir', 'error');
                                }
                              }}
                              title="Excluir"
                              className="rounded p-1.5 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
            <p className="text-xs text-gray-500">
              Página {page} de {totalPages} · {totalCount} despesas
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)} className={cn('rounded px-2.5 py-1 text-xs font-medium', p === page ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100')}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Editar Despesa</h2>
              <button onClick={() => setEditExpense(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Título</label>
                <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Valor (R$)</label>
                  <input type="number" value={editForm.value} onChange={(e) => setEditForm({ ...editForm, value: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Vencimento</label>
                  <input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Tipo</label>
                  <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
                    <option value="FIXED">Fixa</option>
                    <option value="VARIABLE">Variável</option>
                    <option value="ONE_TIME">Pontual</option>
                    <option value="INVESTMENT">Investimento</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Fornecedor</label>
                  <input value={editForm.supplier} onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Categoria</label>
                  <select value={editForm.categoryId} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Centro de custo</label>
                  <select value={editForm.costCenterId} onChange={(e) => setEditForm({ ...editForm, costCenterId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
                    <option value="">Sem centro de custo</option>
                    {costCenters.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Descrição</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Observações</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleUpdate} className="rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">Salvar</button>
                <button onClick={() => setEditExpense(null)} className="rounded-lg border px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg',
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
