'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Plus, Pencil, Trash2, X, Landmark, Wallet, CreditCard, Banknote, PiggyBank, Star, TrendingUp, TrendingDown, ArrowUpDown, Link2 } from 'lucide-react';

const typeConfig: Record<string, { label: string; icon: any }> = {
  CHECKING: { label: 'Conta Corrente', icon: Landmark },
  SAVINGS: { label: 'Poupança', icon: PiggyBank },
  PAYMENT_GATEWAY: { label: 'Gateway de Pagamento', icon: CreditCard },
  CASH: { label: 'Caixa/Dinheiro', icon: Banknote },
  DIGITAL_WALLET: { label: 'Carteira Digital', icon: Wallet },
};

const defaultColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function AccountsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', type: 'CHECKING', bank: '', agency: '', accountNumber: '',
    initialBalance: '', color: '#6366f1', isDefault: false,
  });
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  const handleLinkAsaas = async (accountId: string) => {
    if (!confirm('Vincular todas as faturas e despesas do Asaas a esta conta?')) return;
    setLinking(accountId);
    try {
      const result = await api.linkAsaasToAccount(accountId);
      alert(`Vinculados: ${result.invoicesLinked} faturas e ${result.expensesLinked} despesas`);
      load();
    } catch (err: any) {
      alert(err.message || 'Erro ao vincular');
    } finally {
      setLinking(null);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    api.getAccountsSummary()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditAccount(null);
    setForm({ name: '', type: 'CHECKING', bank: '', agency: '', accountNumber: '', initialBalance: '', color: '#6366f1', isDefault: false });
    setShowModal(true);
  };

  const openEdit = (account: any) => {
    setEditAccount(account);
    setForm({
      name: account.name,
      type: account.type,
      bank: account.bank || '',
      agency: account.agency || '',
      accountNumber: account.accountNumber || '',
      initialBalance: String(Number(account.initialBalance)),
      color: account.color || '#6366f1',
      isDefault: account.isDefault,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        initialBalance: form.initialBalance ? parseFloat(form.initialBalance) : 0,
      };
      if (editAccount) {
        await api.updateAccount(editAccount.id, payload);
      } else {
        await api.createAccount(payload);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Desativar a conta "${name}"? As transações vinculadas serão mantidas.`)) return;
    try {
      await api.deleteAccount(id);
      load();
    } catch (err: any) {
      alert(err.message || 'Erro ao desativar');
    }
  };

  if (loading && !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const accounts = data?.accounts || [];
  const totalBalance = data?.totalBalance || 0;
  const totalReceived = data?.totalReceived || 0;
  const totalSpent = data?.totalSpent || 0;
  const totalPendingReceivable = data?.totalPendingReceivable || 0;
  const totalPendingPayable = data?.totalPendingPayable || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas</h1>
          <p className="text-sm text-gray-500">Gerencie suas contas bancárias e acompanhe os saldos</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700 transition"
        >
          <Plus className="h-4 w-4" /> Nova Conta
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <Wallet className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-sm text-gray-500">Saldo Total</span>
          </div>
          <p className={cn('text-2xl font-bold', totalBalance >= 0 ? 'text-gray-900' : 'text-red-600')}>
            {formatCurrency(totalBalance)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Total Recebido</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">Total Gasto</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSpent)}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
              <ArrowUpDown className="h-5 w-5 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Pendente</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-green-600 font-semibold">+{formatCurrency(totalPendingReceivable)}</span>
              <span className="text-gray-400 text-xs ml-1">a receber</span>
            </p>
            <p className="text-sm">
              <span className="text-red-600 font-semibold">-{formatCurrency(totalPendingPayable)}</span>
              <span className="text-gray-400 text-xs ml-1">a pagar</span>
            </p>
          </div>
        </div>
      </div>

      {/* Account Cards */}
      {accounts.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Landmark className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Nenhuma conta cadastrada</h3>
          <p className="text-sm text-gray-400 mb-6">Cadastre suas contas bancárias para acompanhar seus saldos e movimentações</p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700 transition"
          >
            <Plus className="h-4 w-4" /> Cadastrar Primeira Conta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account: any) => {
            const TypeIcon = typeConfig[account.type]?.icon || Landmark;
            const typeLabel = typeConfig[account.type]?.label || account.type;
            const balance = account.currentBalance ?? 0;

            return (
              <div
                key={account.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Color bar */}
                <div className="h-1.5" style={{ backgroundColor: account.color || '#6366f1' }} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${account.color}15` }}
                      >
                        <TypeIcon className="h-5 w-5" style={{ color: account.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{account.name}</h3>
                          {account.isDefault && (
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{typeLabel}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(account)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id, account.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bank info */}
                  {account.bank && (
                    <p className="text-xs text-gray-400 mb-3">
                      {account.bank}
                      {account.agency && ` | Ag: ${account.agency}`}
                      {account.accountNumber && ` | CC: ${account.accountNumber}`}
                    </p>
                  )}

                  {/* Link Asaas button */}
                  {(account.type === 'PAYMENT_GATEWAY' || account.name.toLowerCase().includes('asaas')) && (
                    <button
                      onClick={() => handleLinkAsaas(account.id)}
                      disabled={linking === account.id}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition mb-3"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      {linking === account.id ? 'Vinculando...' : 'Vincular lançamentos Asaas'}
                    </button>
                  )}

                  {/* Balance */}
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Saldo atual</p>
                    <p className={cn('text-xl font-bold', balance >= 0 ? 'text-gray-900' : 'text-red-600')}>
                      {formatCurrency(balance)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Nova/Editar Conta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                {editAccount ? 'Editar Conta' : 'Nova Conta'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da conta *</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500 outline-none"
                  placeholder="Ex: Nubank, Asaas, Caixa da Empresa..."
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* Tipo + Cor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500 outline-none"
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                  >
                    {Object.entries(typeConfig).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                  <div className="flex items-center gap-2">
                    {defaultColors.map(c => (
                      <button
                        key={c}
                        className={cn('h-7 w-7 rounded-full border-2 transition', form.color === c ? 'border-gray-900 scale-110' : 'border-transparent')}
                        style={{ backgroundColor: c }}
                        onClick={() => setForm({ ...form, color: c })}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Banco / Agência / Conta */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500 outline-none"
                    placeholder="Nubank, Itaú..."
                    value={form.bank}
                    onChange={e => setForm({ ...form, bank: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agência</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500 outline-none"
                    placeholder="0001"
                    value={form.agency}
                    onChange={e => setForm({ ...form, agency: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nº da Conta</label>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500 outline-none"
                    placeholder="12345-6"
                    value={form.accountNumber}
                    onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                  />
                </div>
              </div>

              {/* Saldo Inicial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saldo inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500 outline-none"
                  placeholder="0,00"
                  value={form.initialBalance}
                  onChange={e => setForm({ ...form, initialBalance: e.target.value })}
                />
              </div>

              {/* Default */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-gray-300 text-pisom-600 focus:ring-pisom-500"
                />
                <span className="text-sm text-gray-700">Conta principal</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700 disabled:opacity-50 transition"
              >
                {saving ? 'Salvando...' : editAccount ? 'Salvar' : 'Criar Conta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
