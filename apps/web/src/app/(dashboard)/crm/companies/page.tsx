'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Plus, Building2 } from 'lucide-react';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      api.getCompanies(search || undefined)
        .then(setCompanies)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="mt-1 text-gray-500">{companies.length} empresas</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : companies.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Nenhuma empresa encontrada</td></tr>
            ) : (
              companies.map((company: any) => (
                <tr key={company.id} className="transition hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                        <Building2 className="h-4 w-4 text-gray-500" />
                      </div>
                      <span className="font-medium text-gray-900">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{company.cnpj || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{company.industry || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {company.city && company.state ? `${company.city}/${company.state}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{company._count?.contacts || 0}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{company._count?.deals || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
