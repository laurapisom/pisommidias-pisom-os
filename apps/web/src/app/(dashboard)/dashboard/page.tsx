'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { TrendingUp, Users, DollarSign, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [overdueTasks, setOverdueTasks] = useState<any[]>([]);

  useEffect(() => {
    api.getDealsSummary().then(setSummary).catch(console.error);
    api.getTasks({ status: 'TODO' }).then((tasks) => {
      setOverdueTasks(tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date()));
    }).catch(console.error);
  }, []);

  const stats = [
    {
      label: 'Negócios Abertos',
      value: summary?.open || 0,
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Valor no Pipeline',
      value: summary?.totalOpenValue
        ? `R$ ${Number(summary.totalOpenValue).toLocaleString('pt-BR')}`
        : 'R$ 0',
      icon: DollarSign,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Negócios Ganhos',
      value: summary?.won || 0,
      icon: Users,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Tarefas Atrasadas',
      value: overdueTasks.length,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Visão geral da sua operação</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`rounded-lg p-3 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {overdueTasks.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Tarefas Atrasadas</h2>
          <div className="rounded-xl border border-red-200 bg-white shadow-sm">
            {overdueTasks.map((task: any) => (
              <div
                key={task.id}
                className="flex items-center justify-between border-b border-gray-100 px-5 py-3 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">{task.title}</p>
                  {task.deal && (
                    <p className="text-sm text-gray-500">{task.deal.title}</p>
                  )}
                </div>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  Venceu {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
