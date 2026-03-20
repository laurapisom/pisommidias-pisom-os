'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Plus, Search, FileText, X, Eye, Pencil, Ban, Building2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

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

const invoiceStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  PAID: { label: 'Paga', color: 'bg-green-100 text-green-700' },
  OVERDUE: { label: 'Vencida', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500' },
};

const emptyForm = { title: '', value: '', billingCycle: 'MONTHLY', startDate: '', dayOfMonth: '10', companyId: '', services: '', notes: '' };

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mrr, setMrr] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [companies, setCompanies] = useState<any[]>([]);

  // Detail/Edit modal
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (filter) params.status = filter;
    if (search) params.search = search;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    api.getContracts(params)
      .then((res: any) => {
        setContracts(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    api.getMRR().then(setMrr).catch(() => null);
  }, [filter, search, startDate, endDate, page]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPage(1); }, [filter, search, startDate, endDate]);

  // Load companies for select
  useEffect(() => {
    api.getCompanies().then(setCompanies).catch(() => null);
  }, []);

  const handleCreate = async () => {
    if (!form.title || !form.value || !form.startDate) return;
    await api.createContract({
      title: form.title,
      value: parseFloat(form.value),
      billingCycle: form.billingCycle,
      startDate: form.startDate,
      dayOfMonth: parseInt(form.dayOfMonth),
      companyId: form.companyId || undefined,
      services: form.services ? form.services.split(',').map((s: string) => s.trim()) : undefined,
      notes: form.notes || undefined,
    });
    setShowNew(false);
    setForm({ ...emptyForm });
    load();
  };

  const openDetail = async (id: string) => {
    const data = await api.getContract(id);
    setSelectedContract(data);
    setEditForm({
      title: data.title,
      value: String(data.value),
      billingCycle: data.billingCycle,
      dayOfMonth: String(data.dayOfMonth),
      companyId: data.companyId || '',
      services: (data.services || []).join(', '),
      notes: data.notes || '',
      status: data.status,
    });
    setShowDetail(true);
    setEditMode(false);
  };

  const handleUpdate = async () => {
    if (!selectedContract) return;
    await api.updateContract(selectedContract.id, {
      title: editForm.title,
      value: parseFloat(editForm.value),
      billingCycle: editForm.billingCycle,
      dayOfMonth: parseInt(editForm.dayOfMonth),
      companyId: editForm.companyId || null,
      services: editForm.services ? editForm.services.split(',').map((s: string) => s.trim()) : [],
      notes: editForm.notes || null,
      status: editForm.status,
    });
    setEditMode(false);
    setShowDetail(false);
    load();
  };

  const handleCancel = async () => {
    if (!selectedContract) return;
    await api.cancelContract(selectedContract.id, cancelReason || undefined);
    setShowCancelConfirm(false);
    setCancelReason('');
    setShowDetail(false);
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
            {/* Company Select */}
            <select
              value={form.companyId}
              onChange={(e) => setForm({ ...form, companyId: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none col-span-2"
            >
              <option value="">Selecione a empresa (opcional)</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <input type="number" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} placeholder="Dia do vencimento" min="1" max="28" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
            <input value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="Serviços (ex: Social Media, Tráfego)" className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
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
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contratos..." className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-pisom-500 focus:outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
          <span className="text-xs text-gray-400">até</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="rounded p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          )}
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
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Empresa</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Valor</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Ciclo</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Próx. fatura</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-3"><div className="h-4 w-32 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-16 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-5 w-16 rounded-full bg-gray-200" /></td>
                  <td className="px-5 py-3"><div className="h-6 w-8 rounded bg-gray-100" /></td>
                </tr>
              ))
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
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {c.company ? (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          {c.company.name}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{fmt(Number(c.value))}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{cycleLabels[c.billingCycle] || c.billingCycle}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {c.nextBillingDate ? new Date(c.nextBillingDate).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', st.color)}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openDetail(c.id)} title="Ver detalhes" className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                          <Eye className="h-4 w-4" />
                        </button>
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
              Página {page} de {totalPages} · {total} contratos
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

      {/* Detail/Edit Modal */}
      {showDetail && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editMode ? 'Editar Contrato' : 'Detalhes do Contrato'}
              </h2>
              <div className="flex gap-2">
                {!editMode && selectedContract.status !== 'CANCELLED' && (
                  <>
                    <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button onClick={() => setShowCancelConfirm(true)} className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                      <Ban className="h-3.5 w-3.5" /> Cancelar
                    </button>
                  </>
                )}
                <button onClick={() => { setShowDetail(false); setEditMode(false); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Cancel Confirmation */}
            {showCancelConfirm && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="mb-2 text-sm font-medium text-red-700">Confirmar cancelamento?</p>
                <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Motivo do cancelamento (opcional)" className="mb-3 w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={handleCancel} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Confirmar Cancelamento</button>
                  <button onClick={() => setShowCancelConfirm(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Voltar</button>
                </div>
              </div>
            )}

            {editMode ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Título</label>
                  <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Valor (R$)</label>
                  <input type="number" value={editForm.value} onChange={(e) => setEditForm({ ...editForm, value: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Ciclo de cobrança</label>
                  <select value={editForm.billingCycle} onChange={(e) => setEditForm({ ...editForm, billingCycle: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
                    <option value="MONTHLY">Mensal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="SEMIANNUAL">Semestral</option>
                    <option value="ANNUAL">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Dia do vencimento</label>
                  <input type="number" value={editForm.dayOfMonth} onChange={(e) => setEditForm({ ...editForm, dayOfMonth: e.target.value })} min="1" max="28" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
                    <option value="DRAFT">Rascunho</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="PAUSED">Pausado</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Empresa</label>
                  <select value={editForm.companyId} onChange={(e) => setEditForm({ ...editForm, companyId: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none">
                    <option value="">Sem empresa vinculada</option>
                    {companies.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Serviços</label>
                  <input value={editForm.services} onChange={(e) => setEditForm({ ...editForm, services: e.target.value })} placeholder="Social Media, Tráfego Pago, Design" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Observações</label>
                  <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none" />
                </div>
                <div className="col-span-2 flex gap-2">
                  <button onClick={handleUpdate} className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">Salvar</button>
                  <button onClick={() => setEditMode(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
                </div>
              </div>
            ) : (
              <div>
                {/* Contract Info */}
                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Status</p>
                    <span className={cn('mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium', (statusConfig[selectedContract.status] || statusConfig.DRAFT).color)}>
                      {(statusConfig[selectedContract.status] || statusConfig.DRAFT).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Valor</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{fmt(Number(selectedContract.value))}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Ciclo</p>
                    <p className="mt-1 text-sm text-gray-900">{cycleLabels[selectedContract.billingCycle] || selectedContract.billingCycle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Empresa</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedContract.company?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Início</p>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedContract.startDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Próxima fatura</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedContract.nextBillingDate ? new Date(selectedContract.nextBillingDate).toLocaleDateString('pt-BR') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Dia vencimento</p>
                    <p className="mt-1 text-sm text-gray-900">Dia {selectedContract.dayOfMonth}</p>
                  </div>
                  {selectedContract.services?.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-gray-500">Serviços</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {selectedContract.services.map((s: string, i: number) => (
                          <span key={i} className="rounded-full bg-pisom-50 px-2.5 py-0.5 text-xs font-medium text-pisom-700">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedContract.notes && (
                    <div className="col-span-2 lg:col-span-3">
                      <p className="text-xs font-medium text-gray-500">Observações</p>
                      <p className="mt-1 text-sm text-gray-700">{selectedContract.notes}</p>
                    </div>
                  )}
                </div>

                {/* Invoices History */}
                {selectedContract.invoices?.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Faturas ({selectedContract.invoices.length})</h3>
                    <div className="rounded-lg border border-gray-200">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nº</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Referência</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Valor</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Vencimento</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedContract.invoices.map((inv: any) => {
                            const invSt = invoiceStatusConfig[inv.status] || { label: inv.status, color: 'bg-gray-100 text-gray-700' };
                            return (
                              <tr key={inv.id} className="text-sm hover:bg-gray-50">
                                <td className="px-4 py-2 font-mono text-gray-500">#{inv.number}</td>
                                <td className="px-4 py-2 text-gray-600">{inv.referenceMonth || '—'}</td>
                                <td className="px-4 py-2 text-right font-medium text-gray-900">{fmt(Number(inv.totalValue))}</td>
                                <td className="px-4 py-2 text-gray-600">{new Date(inv.dueDate).toLocaleDateString('pt-BR')}</td>
                                <td className="px-4 py-2">
                                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', invSt.color)}>{invSt.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedContract.cancelledAt && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-700">
                      Cancelado em {new Date(selectedContract.cancelledAt).toLocaleDateString('pt-BR')}
                      {selectedContract.cancelReason && ` — Motivo: ${selectedContract.cancelReason}`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
