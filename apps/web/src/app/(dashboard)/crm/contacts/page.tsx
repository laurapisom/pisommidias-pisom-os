'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Plus, Mail, Phone } from 'lucide-react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      api.getContacts(search || undefined)
        .then(setContacts)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contatos</h1>
          <p className="mt-1 text-gray-500">{contacts.length} contatos</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
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
          <div className="col-span-full py-8 text-center text-gray-400">Carregando...</div>
        ) : contacts.length === 0 ? (
          <div className="col-span-full py-8 text-center text-gray-400">Nenhum contato encontrado</div>
        ) : (
          contacts.map((contact: any) => (
            <div
              key={contact.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
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
    </div>
  );
}
