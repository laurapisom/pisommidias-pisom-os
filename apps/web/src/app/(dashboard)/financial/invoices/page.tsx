'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Search, Plus, CheckCircle2, XCircle, RefreshCw, X, Eye, Calendar, DollarSign, Send, Pencil, Building2, ChevronLeft, ChevronRight, Download, Receipt, Trash2 } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  SENT: { label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  OVERDUE: { label: 'Vencida', color: 'bg-red-100 text-red-700' },
  PAID: { label: 'Paga', color: 'bg-green-100 text-green-700' },
  PARTIALLY_PAID: { label: 'Parcial', color: 'bg-orange-100 text-orange-700' },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500' },
  REFUNDED: { label: 'Reembolsada', color: 'bg-purple-100 text-purple-700' },
};

const typeLabels: Record<string, string> = {
  RECURRING: 'Recorrente', ONE_TIME: 'Avulsa', ADDITIONAL: 'Adicional', CREDIT: 'Crédito',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // New invoice form
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ value: '', description: '', dueDate: '', type: 'ONE_TIME', discount: '0', tax: '0' });

  // Detail modal
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // Pay modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState<any>(null);
  const [payForm, setPayForm] = useState({ paidValue: '', paymentMethod: 'PIX', paidAt: '' });

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === invoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(invoices.map((inv: any) => inv.id)));
    }
  };

  const bulkSend = async () => {
    const pending = invoices.filter((inv: any) => selected.has(inv.id) && inv.status === 'PENDING');
    if (pending.length === 0) return showToast('Nenhuma fatura pendente selecionada', 'error');
    await Promise.all(pending.map((inv: any) => api.markInvoiceSent(inv.id)));
    showToast(`${pending.length} fatura(s) marcada(s) como enviada(s)`);
    setSelected(new Set());
    load();
  };

  const bulkCancel = async () => {
    const cancellable = invoices.filter((inv: any) => selected.has(inv.id) && ['PENDING', 'DRAFT'].includes(inv.status));
    if (cancellable.length === 0) return showToast('Nenhuma fatura cancelável selecionada', 'error');
    if (!confirm(`Cancelar ${cancellable.length} fatura(s)?`)) return;
    await Promise.all(cancellable.map((inv: any) => api.cancelInvoice(inv.id)));
    showToast(`${cancellable.length} fatura(s) cancelada(s)`);
    setSelected(new Set());
    load();
  };

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (filter) params.status = filter;
    if (search) params.search = search;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    api.getInvoices(params)
      .then((res: any) => {
        setInvoices(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    api.getInvoiceSummary().then(setSummary).catch(() => null);
  }, [filter, search, startDate, endDate, page]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filter, search, startDate, endDate]);

  const handleGenerate = async () => {
    try {
      const result = await api.generateInvoices();
      showToast(`${result.generated} fatura(s) gerada(s)`);
      load();
    } catch { showToast('Erro ao gerar faturas', 'error'); }
  };

  const handleCreateInvoice = async () => {
    if (!newForm.value || !newForm.dueDate) return;
    try {
      await api.createInvoice({
        value: parseFloat(newForm.value),
        description: newForm.description,
        dueDate: newForm.dueDate,
        type: newForm.type,
        discount: parseFloat(newForm.discount) || 0,
        tax: parseFloat(newForm.tax) || 0,
      });
      setShowNew(false);
      setNewForm({ value: '', description: '', dueDate: '', type: 'ONE_TIME', discount: '0', tax: '0' });
      showToast('Fatura criada com sucesso');
      load();
    } catch { showToast('Erro ao criar fatura', 'error'); }
  };

  const openPayModal = (inv: any) => {
    setPayInvoice(inv);
    setPayForm({
      paidValue: String(inv.totalValue),
      paymentMethod: 'PIX',
      paidAt: new Date().toISOString().split('T')[0],
    });
    setShowPayModal(true);
  };

  const handlePay = async () => {
    if (!payInvoice) return;
    try {
      await api.markInvoicePaid(payInvoice.id, {
        paidValue: parseFloat(payForm.paidValue),
        paymentMethod: payForm.paymentMethod,
        paidAt: payForm.paidAt,
      });
      setShowPayModal(false);
      setPayInvoice(null);
      showToast('Pagamento registrado com sucesso');
      load();
    } catch { showToast('Erro ao registrar pagamento', 'error'); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar esta fatura?')) return;
    try {
      await api.cancelInvoice(id);
      showToast('Fatura cancelada');
      load();
    } catch { showToast('Erro ao cancelar fatura', 'error'); }
  };

  const handleSend = async (id: string) => {
    try {
      await api.markInvoiceSent(id);
      showToast('Fatura marcada como enviada');
      load();
    } catch { showToast('Erro ao enviar fatura', 'error'); }
  };

  const openDetail = async (id: string) => {
    const data = await api.getInvoice(id);
    setSelectedInvoice(data);
    setEditForm({
      description: data.description || '',
      dueDate: data.dueDate?.split('T')[0] || '',
      notes: data.notes || '',
    });
    setShowDetail(true);
    setEditMode(false);
  };

  const handleUpdateInvoice = async () => {
    if (!selectedInvoice) return;
    await api.updateInvoice(selectedInvoice.id, {
      description: editForm.description,
      dueDate: editForm.dueDate,
      notes: editForm.notes,
    });
    setEditMode(false);
    setShowDetail(false);
    load();
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const exportCSV = () => {
    const headers = ['Nº', 'Descrição', 'Empresa', 'Valor', 'Vencimento', 'Status', 'Tipo'];
    const rows = invoices.map((inv: any) => [
      inv.number,
      inv.description || inv.contract?.title || '',
      inv.company?.name || '',
      Number(inv.totalValue).toFixed(2),
      new Date(inv.dueDate).toLocaleDateString('pt-BR'),
      (statusConfig[inv.status] || statusConfig.PENDING).label,
      typeLabels[inv.type] || inv.type,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faturas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faturas</h1>
          <p className="mt-1 text-gray-500">Cobranças e pagamentos {total > 0 && `· ${total} faturas`}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} disabled={invoices.length === 0} className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button onClick={handleGenerate} className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            Gerar faturas
          </button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
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
            <p className="text-xs text-gray-400">{summary.billed.count} faturas</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Recebido</p>
            <p className="mt-1 text-xl font-bold text-green-700">{fmt(summary.received.total)}</p>
            <p className="text-xs text-gray-400">{summary.conversionRate}% de conversão</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Pendente</p>
            <p className="mt-1 text-xl font-bold text-yellow-700">{fmt(summary.pending.total)}</p>
            <p className="text-xs text-gray-400">{summary.pending.count} faturas</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Inadimplente</p>
            <p className="mt-1 text-xl font-bold text-red-700">{fmt(summary.overdue.total)}</p>
            <p className="text-xs text-gray-400">{summary.overdue.count} faturas</p>
          </div>
        </div>
      )}

      {/* New invoice form */}
      {showNew && (
        <div className="mb-6 rounded-xl border border-pisom-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">Nova Fatura Avulsa</h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <input value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} placeholder="Descrição" className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <input type="number" value={newForm.value} onChange={(e) => setNewForm({ ...newForm, value: e.target.value })} placeholder="Valor (R$)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <input type="date" value={newForm.dueDate} onChange={(e) => setNewForm({ ...newForm, dueDate: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <select value={newForm.type} onChange={(e) => setNewForm({ ...newForm, type: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
              <option value="ONE_TIME">Avulsa</option>
              <option value="ADDITIONAL">Adicional</option>
              <option value="CREDIT">Crédito</option>
            </select>
            <input type="number" value={newForm.discount} onChange={(e) => setNewForm({ ...newForm, discount: e.target.value })} placeholder="Desconto (R$)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <input type="number" value={newForm.tax} onChange={(e) => setNewForm({ ...newForm, tax: e.target.value })} placeholder="Imposto (R$)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <div className="flex gap-2">
              <button onClick={handleCreateInvoice} className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">Criar</button>
              <button onClick={() => setShowNew(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar faturas..." className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-pisom-500 focus:outline-none" />
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-300 p-1">
          {['', 'PENDING', 'SENT', 'OVERDUE', 'PAID', 'CANCELLED'].map((s) => (
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

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-pisom-200 bg-pisom-50 px-4 py-2.5">
          <span className="text-sm font-medium text-pisom-700">{selected.size} selecionada(s)</span>
          <button onClick={bulkSend} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
            <Send className="mr-1 inline h-3 w-3" /> Enviar
          </button>
          <button onClick={bulkCancel} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
            <XCircle className="mr-1 inline h-3 w-3" /> Cancelar
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700">Limpar seleção</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-10 px-3 py-3">
                <input type="checkbox" checked={invoices.length > 0 && selected.size === invoices.length} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300 text-pisom-600 focus:ring-pisom-500" />
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Nº</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Descrição</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Empresa</th>
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
                  <td className="px-5 py-3"><div className="h-4 w-12 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-32 rounded bg-gray-200" /><div className="mt-1 h-3 w-20 rounded bg-gray-100" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-6 w-20 rounded bg-gray-100" /></td>
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-16 text-center">
                <Receipt className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-500">Nenhuma fatura encontrada</p>
                <p className="mt-1 text-xs text-gray-400">{search || filter || startDate ? 'Tente ajustar os filtros' : 'Gere faturas a partir dos contratos ou crie uma avulsa'}</p>
              </td></tr>
            ) : (
              invoices.map((inv: any) => {
                const st = statusConfig[inv.status] || statusConfig.PENDING;
                const isOverdue = inv.status === 'OVERDUE' || (inv.status === 'PENDING' && new Date(inv.dueDate) < new Date());
                return (
                  <tr key={inv.id} className={cn('transition hover:bg-gray-50', isOverdue && 'bg-red-50/50', selected.has(inv.id) && 'bg-pisom-50/50')}>
                    <td className="w-10 px-3 py-3">
                      <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)} className="h-4 w-4 rounded border-gray-300 text-pisom-600 focus:ring-pisom-500" />
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-gray-500">#{inv.number}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{inv.description || inv.contract?.title || '—'}</p>
                      {inv.referenceMonth && <p className="text-xs text-gray-400">Ref: {inv.referenceMonth}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {inv.company ? (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          {inv.company.name}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">{fmt(Number(inv.totalValue))}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{new Date(inv.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', st.color)}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openDetail(inv.id)} title="Ver detalhes" className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                          <Eye className="h-4 w-4" />
                        </button>
                        {inv.status === 'PENDING' && (
                          <button onClick={() => handleSend(inv.id)} title="Marcar como enviada" className="rounded p-1.5 text-blue-600 hover:bg-blue-50">
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {['PENDING', 'SENT', 'OVERDUE'].includes(inv.status) && (
                          <button onClick={() => openPayModal(inv)} title="Registrar pagamento" className="rounded p-1.5 text-green-600 hover:bg-green-50">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {['PENDING', 'DRAFT'].includes(inv.status) && (
                          <button onClick={() => handleCancel(inv.id)} title="Cancelar" className="rounded p-1.5 text-red-600 hover:bg-red-50">
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        {inv.status !== 'PAID' && (
                          confirmDeleteId === inv.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={async () => {
                                  try {
                                    await api.deleteInvoice(inv.id);
                                    showToast('Fatura excluída com sucesso');
                                    setConfirmDeleteId(null);
                                    load();
                                  } catch (err: any) {
                                    showToast(err.message || 'Erro ao excluir', 'error');
                                  }
                                }}
                                className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                              >
                                Confirmar
                              </button>
                              <button onClick={() => setConfirmDeleteId(null)} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                                Não
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(inv.id)} title="Excluir fatura" className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )
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
              Página {page} de {totalPages} · {total} faturas
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

      {/* Pay Modal */}
      {showPayModal && payInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Registrar Pagamento</h2>
              <button onClick={() => setShowPayModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              Fatura #{payInvoice.number} — {payInvoice.description || payInvoice.contract?.title} — Total: {fmt(Number(payInvoice.totalValue))}
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Valor pago (R$)</label>
                <input type="number" value={payForm.paidValue} onChange={(e) => setPayForm({ ...payForm, paidValue: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Forma de pagamento</label>
                <select value={payForm.paymentMethod} onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="CARTAO">Cartão</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="DINHEIRO">Dinheiro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Data do pagamento</label>
                <input type="date" value={payForm.paidAt} onChange={(e) => setPayForm({ ...payForm, paidAt: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handlePay} className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700">
                  <DollarSign className="mr-1 inline h-4 w-4" />
                  Confirmar Pagamento
                </button>
                <button onClick={() => setShowPayModal(false)} className="rounded-lg border px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail/Edit Modal */}
      {showDetail && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Fatura #{selectedInvoice.number}</h2>
              <div className="flex gap-2">
                {!editMode && ['PENDING', 'DRAFT'].includes(selectedInvoice.status) && (
                  <button onClick={() => setEditMode(true)} className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                )}
                <button onClick={() => { setShowDetail(false); setEditMode(false); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Descrição</label>
                  <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Vencimento</label>
                  <input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Observações</label>
                  <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleUpdateInvoice} className="rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">Salvar</button>
                  <button onClick={() => setEditMode(false)} className="rounded-lg border px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Status</p>
                    <span className={cn('mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium', (statusConfig[selectedInvoice.status] || statusConfig.PENDING).color)}>
                      {(statusConfig[selectedInvoice.status] || statusConfig.PENDING).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Tipo</p>
                    <p className="mt-1 text-sm text-gray-900">{typeLabels[selectedInvoice.type] || selectedInvoice.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Valor base</p>
                    <p className="mt-1 text-sm text-gray-900">{fmt(Number(selectedInvoice.value))}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Total</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{fmt(Number(selectedInvoice.totalValue))}</p>
                  </div>
                  {Number(selectedInvoice.discount) > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">Desconto</p>
                      <p className="mt-1 text-sm text-green-600">-{fmt(Number(selectedInvoice.discount))}</p>
                    </div>
                  )}
                  {Number(selectedInvoice.tax) > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">Imposto</p>
                      <p className="mt-1 text-sm text-red-600">+{fmt(Number(selectedInvoice.tax))}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-500">Vencimento</p>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedInvoice.dueDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Referência</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedInvoice.referenceMonth || '—'}</p>
                  </div>
                </div>

                {selectedInvoice.description && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Descrição</p>
                    <p className="mt-1 text-sm text-gray-700">{selectedInvoice.description}</p>
                  </div>
                )}

                {selectedInvoice.company && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Empresa</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-900">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      {selectedInvoice.company.name}
                    </p>
                  </div>
                )}

                {selectedInvoice.contract && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-500">Contrato vinculado</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{selectedInvoice.contract.title}</p>
                  </div>
                )}

                {selectedInvoice.notes && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Observações</p>
                    <p className="mt-1 text-sm text-gray-700">{selectedInvoice.notes}</p>
                  </div>
                )}

                {selectedInvoice.paidAt && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="text-xs font-medium text-green-700">Pago em {new Date(selectedInvoice.paidAt).toLocaleDateString('pt-BR')}</p>
                    <p className="text-sm font-medium text-green-800">Valor pago: {fmt(Number(selectedInvoice.paidValue))}</p>
                    {selectedInvoice.paymentMethod && <p className="text-xs text-green-600">Via {selectedInvoice.paymentMethod}</p>}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedInvoice.status === 'PENDING' && (
                    <button onClick={async () => { await api.markInvoiceSent(selectedInvoice.id); setShowDetail(false); load(); }} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                      <Send className="mr-1 inline h-4 w-4" /> Enviar
                    </button>
                  )}
                  {['PENDING', 'SENT', 'OVERDUE'].includes(selectedInvoice.status) && (
                    <button onClick={() => { setShowDetail(false); openPayModal(selectedInvoice); }} className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700">
                      <DollarSign className="mr-1 inline h-4 w-4" /> Pagar
                    </button>
                  )}
                  <button onClick={() => { setShowDetail(false); setEditMode(false); }} className="rounded-lg border px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all',
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
