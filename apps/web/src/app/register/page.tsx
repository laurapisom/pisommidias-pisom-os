'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    organizationName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.register(form);
      api.setToken(result.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pisom-600 to-pisom-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-pisom-700">Pisom OS</h1>
          <p className="mt-2 text-gray-500">Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
              <input
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sobrenome</label>
              <input
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
              minLength={8}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome da Agência</label>
            <input
              value={form.organizationName}
              onChange={(e) => update('organizationName', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
              placeholder="Ex: Pisom Mídias"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-pisom-600 px-4 py-2.5 font-medium text-white transition hover:bg-pisom-700 disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-pisom-600 hover:text-pisom-700">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
