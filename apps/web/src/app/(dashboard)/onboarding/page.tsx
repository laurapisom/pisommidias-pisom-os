'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Hourglass,
  Eye,
  Loader2,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: 'Pendente', color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
  IN_PROGRESS: { label: 'Em andamento', color: 'text-blue-600', bg: 'bg-blue-100', icon: Loader2 },
  WAITING_CLIENT: { label: 'Aguardando cliente', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Hourglass },
  REVIEW: { label: 'Em revisão', color: 'text-purple-600', bg: 'bg-purple-100', icon: Eye },
  COMPLETED: { label: 'Concluído', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle },
};

const serviceLabels: Record<string, string> = {
  TRAFEGO_PAGO: 'Tráfego Pago',
  SOCIAL_MEDIA: 'Social Media',
  WEBSITE: 'Website',
  CRM_AUTOMACAO: 'CRM/Automação',
  BRANDING: 'Branding',
  SEO: 'SEO',
  EMAIL_MARKETING: 'Email Marketing',
  CONSULTORIA: 'Consultoria',
  CUSTOM: 'Personalizado',
};

export default function OnboardingListPage() {
  const router = useRouter();
  const [onboardings, setOnboardings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOnboardingSummary().then(setSummary).catch(console.error);
  }, []);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;

    const timeout = setTimeout(() => {
      api.getOnboardings(params)
        .then(setOnboardings)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [statusFilter, search]);

  const summaryCards = summary
    ? [
        { label: 'Pendentes', value: summary.pending, color: 'text-gray-600' },
        { label: 'Em andamento', value: summary.inProgress, color: 'text-blue-600' },
        { label: 'Aguardando cliente', value: summary.waitingClient, color: 'text-yellow-600' },
        { label: 'Concluídos', value: summary.completed, color: 'text-green-600' },
        { label: 'Atrasados', value: summary.overdue, color: 'text-red-600' },
      ]
    : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding</h1>
          <p className="mt-1 text-gray-500">Gestão de onboarding de clientes</p>
        </div>
        <button
          onClick={() => router.push('/onboarding/new')}
          className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700"
        >
          <Plus className="h-4 w-4" />
          Novo Onboarding
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-5 gap-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className={cn('mt-1 text-2xl font-bold', card.color)}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar onboardings..."
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
          {['PENDING', 'IN_PROGRESS', 'WAITING_CLIENT', 'REVIEW', 'COMPLETED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition',
                statusFilter === s ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100',
              )}
            >
              {statusConfig[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Onboarding List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Carregando...</div>
        ) : onboardings.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p>Nenhum onboarding encontrado</p>
            <button
              onClick={() => router.push('/onboarding/new')}
              className="mt-3 text-sm font-medium text-pisom-600 hover:text-pisom-700"
            >
              Criar primeiro onboarding
            </button>
          </div>
        ) : (
          onboardings.map((ob) => {
            const status = statusConfig[ob.status] || statusConfig.PENDING;
            const StatusIcon = status.icon;
            const isOverdue = ob.dueDate && new Date(ob.dueDate) < new Date() && ob.status !== 'COMPLETED';

            return (
              <div
                key={ob.id}
                onClick={() => router.push(`/onboarding/${ob.id}`)}
                className={cn(
                  'flex cursor-pointer items-center gap-4 rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md',
                  isOverdue ? 'border-red-200' : 'border-gray-200',
                )}
              >
                <div className={cn('rounded-lg p-2.5', status.bg)}>
                  <StatusIcon className={cn('h-5 w-5', status.color)} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{ob.title}</h3>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                      {serviceLabels[ob.serviceType] || ob.serviceType}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                    {ob.responsible && (
                      <span>
                        Responsável: {ob.responsible.firstName} {ob.responsible.lastName}
                      </span>
                    )}
                    {ob.dueDate && (
                      <span className={isOverdue ? 'font-medium text-red-600' : ''}>
                        Prazo: {new Date(ob.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-48">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {ob.progress.completed}/{ob.progress.total} itens
                    </span>
                    <span className="font-medium text-gray-700">{ob.progress.percentage}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        ob.progress.percentage === 100 ? 'bg-green-500' :
                        ob.progress.percentage > 50 ? 'bg-pisom-500' : 'bg-yellow-500',
                      )}
                      style={{ width: `${ob.progress.percentage}%` }}
                    />
                  </div>
                  {ob.progress.isReadyToOperate && (
                    <p className="mt-1 text-xs font-medium text-green-600">Pronto para operar</p>
                  )}
                </div>

                <span className={cn('rounded-full px-3 py-1 text-xs font-medium', status.bg, status.color)}>
                  {status.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
