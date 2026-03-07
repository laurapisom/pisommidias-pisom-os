'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  FileText,
  Target,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Megaphone,
} from 'lucide-react';
import { SkeletonKPI } from '@/components/ui/LoadingSkeleton';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtShort = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return `R$ ${v.toFixed(0)}`;
};

const pct = (v: number) => `${v.toFixed(1)}%`;

/* ------------------------------------------------------------------ */
/*  Mini Bar Chart Component (CSS-only)                                */
/* ------------------------------------------------------------------ */

function MiniBarChart({
  data,
  color = 'bg-pisom-500',
  height = 120,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={cn('w-full min-w-[8px] rounded-t transition-all', color)}
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
          />
          <span className="text-[10px] text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stacked Bar Chart (Revenue vs Expenses)                            */
/* ------------------------------------------------------------------ */

function StackedBarChart({
  data,
  height = 140,
}: {
  data: { label: string; revenue: number; expense: number }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => Math.max(d.revenue, d.expense)), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-end gap-[2px]">
            <div
              className="flex-1 rounded-t bg-emerald-400 transition-all"
              style={{ height: `${(d.revenue / max) * (height - 20)}px`, minHeight: d.revenue > 0 ? 3 : 0 }}
            />
            <div
              className="flex-1 rounded-t bg-red-300 transition-all"
              style={{ height: `${(d.expense / max) * (height - 20)}px`, minHeight: d.expense > 0 ? 3 : 0 }}
            />
          </div>
          <span className="text-[10px] text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Funnel Chart (CSS-only)                                            */
/* ------------------------------------------------------------------ */

function FunnelChart({ stages }: { stages: { name: string; count: number; value: number }[] }) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className="space-y-2">
      {stages.map((stage, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600 font-medium truncate mr-2">{stage.name}</span>
            <span className="text-gray-400 shrink-0">{stage.count} • {fmtShort(stage.value)}</span>
          </div>
          <div className="h-6 w-full rounded bg-gray-100">
            <div
              className="h-6 rounded bg-gradient-to-r from-pisom-500 to-pisom-400 transition-all flex items-center justify-end pr-2"
              style={{ width: `${Math.max((stage.count / maxCount) * 100, 8)}%` }}
            >
              <span className="text-[10px] font-bold text-white">{stage.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Donut Chart (SVG)                                                  */
/* ------------------------------------------------------------------ */

function DonutChart({
  segments,
  size = 120,
  strokeWidth = 20,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="shrink-0">
        {total === 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
        ) : (
          segments.map((seg, i) => {
            const pctVal = seg.value / total;
            const dashLen = pctVal * circumference;
            const dashOffset = -offset * circumference;
            offset += pctVal;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="transition-all"
              />
            );
          })
        )}
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="text-lg font-bold fill-gray-800">
          {total}
        </text>
      </svg>
      <div className="space-y-1.5 min-w-0">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600 truncate">{seg.label}</span>
            <span className="text-gray-400 ml-auto shrink-0">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress Ring                                                      */
/* ------------------------------------------------------------------ */

function ProgressRing({ value, max, label, color = '#5c7cfa' }: { value: number; max: number; label: string; color?: string }) {
  const pctVal = max > 0 ? (value / max) * 100 : 0;
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={68} height={68}>
        <circle cx={34} cy={34} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
        <circle
          cx={34} cy={34} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${(pctVal / 100) * c} ${c}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(-90 34 34)"
          className="transition-all"
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold fill-gray-800">
          {pct(pctVal)}
        </text>
      </svg>
      <span className="text-[11px] text-gray-500 text-center">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KPI Card                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
          {trend && (
            <div className={cn('mt-1 flex items-center gap-1 text-xs font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {trend.value >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(trend.value).toFixed(1)}% {trend.label}
            </div>
          )}
        </div>
        <div className={cn('rounded-lg p-3 shrink-0', color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Card wrapper                                               */
/* ------------------------------------------------------------------ */

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-5 shadow-sm', className)}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard Page                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);
  const [kanban, setKanban] = useState<any>(null);
  const [cashflow, setCashflow] = useState<any[]>([]);
  const [mrr, setMrr] = useState<any>(null);
  const [invoiceSummary, setInvoiceSummary] = useState<any>(null);
  const [contentSummary, setContentSummary] = useState<any>(null);
  const [onboardingSummary, setOnboardingSummary] = useState<any>(null);
  const [leads, setLeads] = useState<any>({ data: [], total: 0 });
  const [recentDeals, setRecentDeals] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.getDealsSummary().then(setSummary).catch(() => null),
      api.getTasks({ status: 'TODO' }).then((tasks) => {
        setOverdueTasks(tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date()));
      }).catch(() => null),
      api.getDefaultPipeline().then((p) => {
        if (p?.id) api.getDealKanban(p.id).then(setKanban).catch(() => null);
      }).catch(() => null),
      api.getCashflowRealized(6).then(setCashflow).catch(() => null),
      api.getMRR().then(setMrr).catch(() => null),
      api.getInvoiceSummary().then(setInvoiceSummary).catch(() => null),
      api.getContentPostSummary().then(setContentSummary).catch(() => null),
      api.getOnboardingSummary().then(setOnboardingSummary).catch(() => null),
      api.getLeads({ limit: '5' }).then(setLeads).catch(() => null),
      api.getDeals({ status: 'OPEN', limit: '5' }).then(setRecentDeals).catch(() => null),
      api.getMyTasks().then(setMyTasks).catch(() => null),
    ]).finally(() => setLoading(false));
  }, []);

  /* ---------- derived data ---------- */

  const totalTasks = myTasks.length;
  const doneTasks = myTasks.filter((t: any) => t.status === 'DONE').length;
  const inProgressTasks = myTasks.filter((t: any) => t.status === 'IN_PROGRESS').length;
  const todoTasks = myTasks.filter((t: any) => t.status === 'TODO').length;

  // Funnel from kanban stages
  const funnelStages = kanban?.stages
    ?.map((s: any) => ({
      name: s.name,
      count: s.deals?.length || 0,
      value: s.deals?.reduce((sum: number, d: any) => sum + Number(d.value || 0), 0) || 0,
    })) || [];

  // Cashflow chart data
  const cashflowChart = cashflow.map((m: any) => ({
    label: new Date(m.month + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
    revenue: Number(m.revenue || 0),
    expense: Number(m.expenses || 0),
  }));

  // Revenue mini chart
  const revenueChart = cashflow.map((m: any) => ({
    label: new Date(m.month + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
    value: Number(m.revenue || 0),
  }));

  // Content donut
  const contentSegments = contentSummary
    ? [
        { label: 'Rascunho', value: Number(contentSummary.draft || 0), color: '#9ca3af' },
        { label: 'Em revisão', value: Number(contentSummary.review || 0), color: '#fbbf24' },
        { label: 'Aprovado', value: Number(contentSummary.approved || 0), color: '#34d399' },
        { label: 'Publicado', value: Number(contentSummary.published || 0), color: '#5c7cfa' },
      ].filter((s) => s.value > 0)
    : [];

  // Month-over-month revenue trend
  const currentRevenue = cashflow.length > 0 ? Number(cashflow[cashflow.length - 1]?.revenue || 0) : 0;
  const prevRevenue = cashflow.length > 1 ? Number(cashflow[cashflow.length - 2]?.revenue || 0) : 0;
  const revenueTrend = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  /* ---------- loading ---------- */

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">Visão geral da sua operação</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonKPI key={i} />)}
        </div>
      </div>
    );
  }

  /* ---------- render ---------- */

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Visão geral da sua operação</p>
      </div>

      {/* ============ KPI ROW 1 — Financial ============ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard
          label="MRR"
          value={mrr?.mrr != null ? fmt(Number(mrr.mrr)) : 'R$ 0,00'}
          subtitle={mrr?.activeContracts ? `${mrr.activeContracts} contratos ativos` : undefined}
          icon={DollarSign}
          color="text-emerald-600 bg-emerald-50"
          trend={revenueTrend !== 0 ? { value: revenueTrend, label: 'vs mês anterior' } : undefined}
        />
        <KpiCard
          label="Valor no Pipeline"
          value={summary?.totalOpenValue ? fmt(Number(summary.totalOpenValue)) : 'R$ 0,00'}
          subtitle={`${summary?.open || 0} negócios abertos`}
          icon={TrendingUp}
          color="text-blue-600 bg-blue-50"
        />
        <KpiCard
          label="Negócios Ganhos"
          value={summary?.won || 0}
          subtitle={summary?.totalWonValue ? fmt(Number(summary.totalWonValue)) : undefined}
          icon={Target}
          color="text-pisom-600 bg-pisom-50"
        />
        <KpiCard
          label="Faturas em Aberto"
          value={invoiceSummary?.pendingCount || 0}
          subtitle={invoiceSummary?.pendingAmount ? fmt(Number(invoiceSummary.pendingAmount)) : undefined}
          icon={FileText}
          color="text-amber-600 bg-amber-50"
        />
      </div>

      {/* ============ KPI ROW 2 — Operations ============ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard
          label="Leads Recentes"
          value={leads?.total || (Array.isArray(leads?.data) ? leads.data.length : 0)}
          icon={Users}
          color="text-violet-600 bg-violet-50"
        />
        <KpiCard
          label="Tarefas Atrasadas"
          value={overdueTasks.length}
          icon={AlertTriangle}
          color={overdueTasks.length > 0 ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-50'}
        />
        <KpiCard
          label="Conteúdos"
          value={contentSummary ? Object.values(contentSummary).reduce((a: number, b: any) => a + Number(b || 0), 0) : 0}
          subtitle={contentSummary?.published ? `${contentSummary.published} publicados` : undefined}
          icon={Megaphone}
          color="text-pink-600 bg-pink-50"
        />
        <KpiCard
          label="Onboardings"
          value={onboardingSummary?.active || 0}
          subtitle={onboardingSummary?.completed ? `${onboardingSummary.completed} concluídos` : undefined}
          icon={Briefcase}
          color="text-teal-600 bg-teal-50"
        />
      </div>

      {/* ============ CHARTS ROW ============ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
        {/* Revenue vs Expenses */}
        <Section title="Receita vs Despesas — Últimos 6 meses">
          {cashflowChart.length > 0 ? (
            <>
              <StackedBarChart data={cashflowChart} />
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Receita</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-300" />Despesas</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados de fluxo de caixa</p>
          )}
        </Section>

        {/* Sales Funnel */}
        <Section title="Funil de Vendas">
          {funnelStages.length > 0 ? (
            <FunnelChart stages={funnelStages} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Configure um pipeline para ver o funil</p>
          )}
        </Section>
      </div>

      {/* ============ CONTENT + TASKS ROW ============ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-6">
        {/* Content Status Donut */}
        <Section title="Status do Conteúdo">
          {contentSegments.length > 0 ? (
            <DonutChart segments={contentSegments} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum conteúdo criado</p>
          )}
        </Section>

        {/* Task Progress */}
        <Section title="Minhas Tarefas">
          {totalTasks > 0 ? (
            <div className="flex items-center justify-around">
              <ProgressRing value={doneTasks} max={totalTasks} label="Concluídas" color="#34d399" />
              <ProgressRing value={inProgressTasks} max={totalTasks} label="Em andamento" color="#5c7cfa" />
              <ProgressRing value={todoTasks} max={totalTasks} label="A fazer" color="#fbbf24" />
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Nenhuma tarefa atribuída</p>
          )}
        </Section>

        {/* Revenue Trend */}
        <Section title="Evolução da Receita">
          {revenueChart.length > 0 ? (
            <MiniBarChart data={revenueChart} color="bg-emerald-400" />
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
          )}
        </Section>
      </div>

      {/* ============ LISTS ROW ============ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mb-6">
        {/* Recent Deals */}
        <Section title="Negócios Recentes">
          {recentDeals.length > 0 ? (
            <div className="space-y-0 divide-y divide-gray-100">
              {recentDeals.slice(0, 5).map((deal: any) => (
                <div key={deal.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{deal.title}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {deal.company?.name || deal.contact?.name || '—'}
                      {deal.stage && <> • {deal.stage.name}</>}
                    </p>
                  </div>
                  <span className="shrink-0 ml-3 text-sm font-semibold text-gray-700">
                    {deal.value ? fmtShort(Number(deal.value)) : '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum negócio aberto</p>
          )}
        </Section>

        {/* Overdue Tasks */}
        <Section title="Tarefas Atrasadas">
          {overdueTasks.length > 0 ? (
            <div className="space-y-0 divide-y divide-gray-100">
              {overdueTasks.slice(0, 5).map((task: any) => (
                <div key={task.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{task.title}</p>
                    {task.deal && <p className="text-xs text-gray-400 truncate">{task.deal.title}</p>}
                  </div>
                  <span className="shrink-0 ml-3 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    Venceu {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
              {overdueTasks.length > 5 && (
                <p className="pt-3 text-center text-xs text-gray-400">
                  +{overdueTasks.length - 5} mais tarefas atrasadas
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
              <p className="text-sm text-gray-500">Nenhuma tarefa atrasada!</p>
            </div>
          )}
        </Section>
      </div>

      {/* ============ LEADS LIST ============ */}
      {(Array.isArray(leads?.data) ? leads.data : []).length > 0 && (
        <Section title="Últimos Leads" className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">Nome</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(leads.data || []).slice(0, 5).map((lead: any) => (
                  <tr key={lead.id}>
                    <td className="py-2.5 text-sm font-medium text-gray-900">{lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '—'}</td>
                    <td className="py-2.5 text-sm text-gray-500">{lead.email || '—'}</td>
                    <td className="py-2.5">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        lead.status === 'NEW' && 'bg-blue-100 text-blue-700',
                        lead.status === 'CONTACTED' && 'bg-yellow-100 text-yellow-700',
                        lead.status === 'QUALIFIED' && 'bg-emerald-100 text-emerald-700',
                        lead.status === 'CONVERTED' && 'bg-pisom-100 text-pisom-700',
                        !['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED'].includes(lead.status) && 'bg-gray-100 text-gray-600',
                      )}>
                        {lead.status || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 text-sm text-gray-500">{lead.source || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}
