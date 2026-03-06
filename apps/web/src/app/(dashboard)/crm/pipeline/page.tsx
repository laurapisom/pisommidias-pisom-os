'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Plus, DollarSign, User, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Stage {
  id: string;
  name: string;
  color: string;
  probability: number;
  deals: Deal[];
}

interface Deal {
  id: string;
  title: string;
  value: number | null;
  owner: { id: string; firstName: string; lastName: string; avatar: string | null };
  company: { id: string; name: string } | null;
  _count: { tasks: number };
}

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<{ id: string; name: string; stages: Stage[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewDeal, setShowNewDeal] = useState<string | null>(null);
  const [newDealTitle, setNewDealTitle] = useState('');
  const [draggedDeal, setDraggedDeal] = useState<{ dealId: string; fromStageId: string } | null>(null);

  const loadPipeline = useCallback(async () => {
    try {
      const defaultPipeline = await api.getDefaultPipeline();
      const kanban = await api.getDealKanban(defaultPipeline.id);
      setPipeline(kanban);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPipeline();
  }, [loadPipeline]);

  const handleCreateDeal = async (stageId: string) => {
    if (!newDealTitle.trim() || !pipeline) return;

    try {
      await api.createDeal({
        title: newDealTitle,
        pipelineId: pipeline.id,
        stageId,
      });
      setNewDealTitle('');
      setShowNewDeal(null);
      loadPipeline();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDrop = async (targetStageId: string) => {
    if (!draggedDeal || draggedDeal.fromStageId === targetStageId) {
      setDraggedDeal(null);
      return;
    }

    try {
      await api.moveDeal(draggedDeal.dealId, targetStageId);
      loadPipeline();
    } catch (err) {
      console.error(err);
    }
    setDraggedDeal(null);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-pulse text-gray-500">Carregando pipeline...</div>
      </div>
    );
  }

  if (!pipeline) {
    return <div className="text-center text-gray-500">Pipeline não encontrado</div>;
  }

  const totalValue = pipeline.stages.reduce(
    (sum, stage) =>
      sum + stage.deals.reduce((s, d) => s + (Number(d.value) || 0), 0),
    0,
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pipeline.name}</h1>
          <p className="mt-1 text-gray-500">
            {pipeline.stages.reduce((s, st) => s + st.deals.length, 0)} negócios
            {' · '}
            R$ {totalValue.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {pipeline.stages.map((stage) => {
          const stageValue = stage.deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
          return (
            <div
              key={stage.id}
              className={cn(
                'flex w-72 flex-shrink-0 flex-col rounded-xl border-2 border-transparent bg-gray-100 transition',
                draggedDeal && draggedDeal.fromStageId !== stage.id && 'border-dashed border-pisom-300',
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage.id)}
            >
              <div className="flex items-center gap-2 p-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: stage.color || '#6B7280' }}
                />
                <h3 className="flex-1 text-sm font-semibold text-gray-700">{stage.name}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500">
                  {stage.deals.length}
                </span>
              </div>
              {stageValue > 0 && (
                <div className="px-3 pb-2 text-xs text-gray-500">
                  R$ {stageValue.toLocaleString('pt-BR')}
                </div>
              )}

              <div className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                {stage.deals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => setDraggedDeal({ dealId: deal.id, fromStageId: stage.id })}
                    onDragEnd={() => setDraggedDeal(null)}
                    className="group cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium text-gray-900">{deal.title}</h4>
                      <button className="invisible rounded p-1 text-gray-400 hover:bg-gray-100 group-hover:visible">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>

                    {deal.company && (
                      <p className="mt-1 text-xs text-gray-500">{deal.company.name}</p>
                    )}

                    <div className="mt-2 flex items-center gap-3">
                      {deal.value && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                          <DollarSign className="h-3 w-3" />
                          R$ {Number(deal.value).toLocaleString('pt-BR')}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <User className="h-3 w-3" />
                        {deal.owner.firstName}
                      </span>
                    </div>
                  </div>
                ))}

                {showNewDeal === stage.id ? (
                  <div className="rounded-lg border-2 border-pisom-300 bg-white p-3">
                    <input
                      autoFocus
                      value={newDealTitle}
                      onChange={(e) => setNewDealTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateDeal(stage.id);
                        if (e.key === 'Escape') setShowNewDeal(null);
                      }}
                      placeholder="Nome do negócio..."
                      className="w-full border-none bg-transparent text-sm outline-none placeholder:text-gray-400"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleCreateDeal(stage.id)}
                        className="rounded bg-pisom-600 px-3 py-1 text-xs font-medium text-white hover:bg-pisom-700"
                      >
                        Criar
                      </button>
                      <button
                        onClick={() => setShowNewDeal(null)}
                        className="rounded px-3 py-1 text-xs text-gray-500 hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowNewDeal(stage.id);
                      setNewDealTitle('');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg p-2 text-sm text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
                  >
                    <Plus className="h-4 w-4" />
                    Novo negócio
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
