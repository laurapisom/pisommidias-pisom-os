'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Search, Plus, Mail, Phone, X, Loader2, Users } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [position, setPosition] = useState('');
  const [companyId, setCompanyId] = useState('');

  const fetchContacts = useCallback(() => {
    api
      .getContacts(search || undefined)
      .then(setContacts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(fetchContacts, 300);
    return () => clearTimeout(timeout);
  }, [fetchContacts]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setWhatsapp('');
    setPosition('');
    setCompanyId('');
    setEditingContact(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
    api.getCompanies().then(setCompanies).catch(console.error);
  };

  const openEditModal = (contact: any) => {
    setEditingContact(contact);
    setFirstName(contact.firstName || '');
    setLastName(contact.lastName || '');
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setWhatsapp(contact.whatsapp || '');
    setPosition(contact.position || '');
    setCompanyId(contact.companyId || '');
    setShowModal(true);
    api.getCompanies().then(setCompanies).catch(console.error);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const data: any = {
        firstName,
        lastName,
        email: email || undefined,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
        position: position || undefined,
        companyId: companyId || undefined,
      };
      if (editingContact) {
        await api.updateContact(editingContact.id, data);
        toast({ type: 'success', message: 'Contato atualizado com sucesso!' });
      } else {
        await api.createContact(data);
        toast({ type: 'success', message: 'Contato criado com sucesso!' });
      }
      closeModal();
      fetchContacts();
    } catch (err: any) {
      toast({ type: 'error', message: err.message || 'Erro ao salvar contato.' });
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
          <h1 className="text-2xl font-bold text-gray-900">Contatos</h1>
          <p className="mt-1 text-gray-500">{contacts.length} contatos</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700"
        >
          <Plus className="h-4 w-4" />
          Novo Contato
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar contatos..."
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-8 text-center text-gray-400">
            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-pisom-600 border-t-transparent" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Users}
              title="Nenhum contato encontrado"
              description={search ? 'Tente buscar com outros termos.' : 'Comece adicionando seu primeiro contato.'}
              action={!search ? (
                <button onClick={openCreateModal} className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
                  <Plus className="h-4 w-4" /> Novo Contato
                </button>
              ) : undefined}
            />
          </div>
        ) : (
          contacts.map((contact: any) => (
            <div
              key={contact.id}
              onClick={() => openEditModal(contact)}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pisom-100 text-sm font-semibold text-pisom-700">
                  {contact.firstName?.[0]}{contact.lastName?.[0]}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {contact.firstName} {contact.lastName}
                  </h3>
                  {contact.company && (
                    <p className="text-sm text-gray-500">{contact.company.name}</p>
                  )}
                  {contact.position && (
                    <p className="text-xs text-gray-400">{contact.position}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {contact.phone}
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-3 text-xs text-gray-400">
                <span>{contact._count?.leads || 0} leads</span>
                <span>{contact._count?.deals || 0} negócios</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Contact Modal */}
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
                {editingContact ? 'Editar Contato' : 'Novo Contato'}
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

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="mb-1 block text-sm font-medium text-gray-700">WhatsApp</label>
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className={inputClass}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cargo</label>
                <input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className={inputClass}
                  placeholder="Ex: Diretor de Marketing"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Empresa</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione uma empresa</option>
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
                {submitting ? 'Salvando...' : editingContact ? 'Salvar' : 'Criar Contato'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
