'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Plus, CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/cn';

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  TODO: { label: 'A fazer', icon: Circle, color: 'text-gray-500' },
  IN_PROGRESS: { label: 'Em andamento', icon: Clock, color: 'text-blue-500' },
  WAITING: { label: 'Aguardando', icon: AlertCircle, color: 'text-yellow-500' },
  DONE: { label: 'Concluído', icon: CheckCircle2, color: 'text-green-500' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Baixa', color: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Média', color: 'bg-blue-100 text-blue-600' },
  HIGH: { label: 'Alta', color: 'bg-orange-100 text-orange-600' },
  URGENT: { label: 'Urgente', color: 'bg-red-100 text-red-600' },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTasks = () => {
    const params: Record<string, string> = {};
    if (filter) params.status = filter;

    api.getTasks(params)
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
          <p className="mt-1 text-gray-500">{tasks.length} tarefas</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </button>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg border border-gray-300 p-1">
        <button
          onClick={() => setFilter('')}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition',
            !filter ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100',
          )}
        >
          Todas
        </button>
        {Object.entries(statusConfig).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setFilter(key === filter ? '' : key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition',
              filter === key ? 'bg-pisom-100 text-pisom-700' : 'text-gray-500 hover:bg-gray-100',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="py-8 text-center text-gray-400">Carregando...</div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center text-gray-400">Nenhuma tarefa encontrada</div>
        ) : (
          tasks.map((task: any) => {
            const status = statusConfig[task.status] || statusConfig.TODO;
            const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
            const StatusIcon = status.icon;

            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-center gap-4 rounded-xl border bg-white px-5 py-3 shadow-sm transition hover:shadow-md',
                  isOverdue ? 'border-red-200' : 'border-gray-200',
                )}
              >
                <button
                  onClick={() =>
                    handleStatusChange(
                      task.id,
                      task.status === 'DONE' ? 'TODO' : 'DONE',
                    )
                  }
                  className={cn('flex-shrink-0', status.color)}
                >
                  <StatusIcon className="h-5 w-5" />
                </button>

                <div className="flex-1">
                  <p
                    className={cn(
                      'font-medium',
                      task.status === 'DONE' ? 'text-gray-400 line-through' : 'text-gray-900',
                    )}
                  >
                    {task.title}
                  </p>
                  {task.deal && (
                    <p className="text-sm text-gray-500">{task.deal.title}</p>
                  )}
                </div>

                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', priority.color)}>
                  {priority.label}
                </span>

                {task.assignee && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pisom-100 text-xs font-medium text-pisom-700">
                    {task.assignee.firstName?.[0]}
                  </div>
                )}

                {task.dueDate && (
                  <span
                    className={cn(
                      'text-xs',
                      isOverdue ? 'font-medium text-red-600' : 'text-gray-400',
                    )}
                  >
                    {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
