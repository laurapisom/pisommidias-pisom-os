'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Search, Plus, Building2, X, Loader2, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/LoadingSkeleton';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200';

const industryOptions = [
  'Tecnologia',
  'Marketing',
  'Saúde',
  'Educação',
  'Varejo',
  'Serviços',
  'Indústria',
  'Alimentação',
  'Imobiliário',
  'Financeiro',
  'Jurídico',
  'Outro',
];

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const fetchCompanies = useCallback(() => {
    api
      .getCompanies(search || undefined)
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(fetchCompanies, 300);
    return () => clearTimeout(timeout);
  }, [fetchCompanies]);

  const resetForm = () => {
    setName('');
    setCnpj('');
    setIndustry('');
    setWebsite('');
    setPhone('');
    setEmail('');
    setCity('');
    setState('');
    setAddress('');
    setNotes('');
    setEditingCompany(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (company: any) => {
    setEditingCompany(company);
    setName(company.name || '');
    setCnpj(company.cnpj || '');
    setIndustry(company.industry || '');
    setWebsite(company.website || '');
    setPhone(company.phone || '');
    setEmail(company.email || '');
    setCity(company.city || '');
    setState(company.state || '');
    setAddress(company.address || '');
    setNotes(company.notes || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const data: any = {
        name,
        cnpj: cnpj || undefined,
        industry: industry || undefined,
        website: website || undefined,
        phone: phone || undefined,
        email: email || undefined,
        city: city || undefined,
        state: state || undefined,
        address: address || undefined,
        notes: notes || undefined,
      };
      if (editingCompany) {
        await api.updateCompany(editingCompany.id, data);
        toast({ type: 'success', message: 'Empresa atualizada com sucesso!' });
      } else {
        await api.createCompany(data);
        toast({ type: 'success', message: 'Empresa criada com sucesso!' });
      }
      closeModal();
      fetchCompanies();
    } catch (err: any) {
      toast({ type: 'error', message: err.message || 'Erro ao salvar empresa.' });
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
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="mt-1 text-gray-500">{companies.length} empresas</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700"
        >
          <Plus className="h-4 w-4" />
          Nova Empresa
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar empresas..."
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Empresa</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">CNPJ</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Setor</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Cidade/UF</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Contatos</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Negócios</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7}><SkeletonTable rows={5} /></td></tr>
            ) : companies.length === 0 ? (
              <tr><td colSpan={7}>
                <EmptyState
                  icon={Building2}
                  title="Nenhuma empresa encontrada"
                  description={search ? 'Tente buscar com outros termos.' : 'Comece adicionando sua primeira empresa.'}
                  action={!search ? (
                    <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
                      <Plus className="h-4 w-4" /> Nova Empresa
                    </button>
                  ) : undefined}
                />
              </td></tr>
            ) : (
              companies.map((company: any) => (
                <tr
                  key={company.id}
                  onClick={() => openEditModal(company)}
                  className="cursor-pointer transition hover:bg-gray-50"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                        <Building2 className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{company.name}</span>
                        {company.website && (
                          <p className="text-xs text-gray-400">{company.website}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{company.cnpj || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{company.industry || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {company.city && company.state ? `${company.city}/${company.state}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{company._count?.contacts || 0}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{company._count?.deals || 0}</td>
                  <td className="px-5 py-3">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Company Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nome da Empresa <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Nome da empresa"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">CNPJ</label>
                  <input
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className={inputClass}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Setor</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecione o setor</option>
                    {industryOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Website</label>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className={inputClass}
                  placeholder="https://exemplo.com.br"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cidade</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={inputClass}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Endereço</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputClass}
                  placeholder="Rua, número, bairro"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="Observações sobre a empresa..."
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
                disabled={submitting || !name.trim()}
                className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Salvando...' : editingCompany ? 'Salvar' : 'Criar Empresa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
