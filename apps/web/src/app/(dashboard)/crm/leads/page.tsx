'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Search, Plus, Filter, ChevronRight, X, Loader2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';

const statusLabels: Record<string, { label: string; color: string }> = {
  NEW: { label: 'Novo', color: 'bg-blue-100 text-blue-700' },
  CONTACTED: { label: 'Contatado', color: 'bg-yellow-100 text-yellow-700' },
  QUALIFIED: { label: 'Qualificado', color: 'bg-green-100 text-green-700' },
  UNQUALIFIED: { label: 'Desqualificado', color: 'bg-gray-100 text-gray-700' },
  CONVERTED: { label: 'Convertido', color: 'bg-emerald-100 text-emerald-700' },
  LOST: { label: 'Perdido', color: 'bg-red-100 text-red-700' },
};

const sourceOptions = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'SOCIAL_MEDIA', label: 'Redes Sociais' },
  { value: 'REFERRAL', label: 'Indicação' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'EVENT', label: 'Evento' },
  { value: 'OTHER', label: 'Outro' },
];

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  const fetchLeads = useCallback(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;

    api
      .getLeads(params)
      .then((res: any) => {
        setLeads(res.data || []);
        setTotal(res.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(fetchLeads, 300);
    return () => clearTimeout(timeout);
  }, [fetchLeads]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setCompanyName('');
    setSource('');
    setNotes('');
    setEditingLead(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (lead: any) => {
    setEditingLead(lead);
    setFirstName(lead.contact?.firstName || '');
    setLastName(lead.contact?.lastName || '');
    setEmail(lead.contact?.email || '');
    setPhone(lead.contact?.phone || '');
    setCompanyName(lead.company?.name || '');
    setSource(lead.source || '');
    setNotes(lead.notes || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const data = {
        firstName,
        lastName,
        email,
        phone,
        companyName,
        source: source || undefined,
        notes: notes || undefined,
      };
      if (editingLead) {
        await api.updateLead(editingLead.id, data);
        toast({ type: 'success', message: 'Lead atualizado com sucesso!' });
      } else {
        await api.createLead(data);
        toast({ type: 'success', message: 'Lead criado com sucesso!' });
      }
      closeModal();
      fetchLeads();
    } catch (err: any) {
      toast({ type: 'error', message: err.message || 'Erro ao salvar lead.' });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (showModal) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [showModal]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-gray-500">{total} leads no total</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700"
        >
          <Plus className="h-4 w-4" />
          Novo Lead
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar leads por nome, email..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-300 p-1">
          <button
            onClick={() => setStatusFilter('')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition',
              !statusFilter ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100',
            )}
          >
            Todos
          </button>
          {Object.entries(statusLabels).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key === statusFilter ? '' : key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition',
                statusFilter === key ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Contato</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Empresa</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Origem</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Score</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Data</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7}><SkeletonTable rows={5} /></td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={7}>
                <EmptyState
                  icon={UserPlus}
                  title="Nenhum lead encontrado"
                  description={search || statusFilter ? 'Tente ajustar seus filtros.' : 'Comece adicionando seu primeiro lead.'}
                  action={!search && !statusFilter ? (
                    <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
                      <Plus className="h-4 w-4" /> Novo Lead
                    </button>
                  ) : undefined}
                />
              </td></tr>
            ) : (
              leads.map((lead: any) => {
                const status = statusLabels[lead.status] || statusLabels.NEW;
                return (
                  <tr
                    key={lead.id}
                    onClick={() => openEditModal(lead)}
                    className="cursor-pointer transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {lead.contact?.firstName} {lead.contact?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{lead.contact?.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {lead.company?.name || '\u2014'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{lead.source || '\u2014'}</td>
                    <td className="px-5 py-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', status.color)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-700">{lead.score}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Lead Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingLead ? 'Editar Lead' : 'Novo Lead'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                    placeholder="Nome"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Sobrenome</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                    placeholder="Sobrenome"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Empresa</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={inputClass}
                  placeholder="Nome da empresa"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Origem</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione a origem</option>
                  {sourceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="Observações sobre o lead..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Salvando...' : editingLead ? 'Salvar' : 'Criar Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
