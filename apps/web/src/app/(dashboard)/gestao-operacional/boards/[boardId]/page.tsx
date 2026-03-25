'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  DndContext, DragEndEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, CheckCircle2, Circle, Calendar, X, ChevronLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

// ─── Sortable Card ───────────────────────────────────────
function SortableCard({ card, onOpen }: { card: any; onOpen: (card: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card)}
      className="mb-2 cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition"
    >
      {card.company && (
        <span
          className="mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: card.company.color || '#6b7280' }}
        >
          {card.company.name}
        </span>
      )}
      <p className="text-sm font-medium text-gray-900 line-clamp-2">{card.title}</p>
      <div className="mt-2 flex items-center gap-2">
        {card.priority === 'ALTA' && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Alta</span>
        )}
        {card.dueDate && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="h-3 w-3" />
            {new Date(card.dueDate).toLocaleDateString('pt-BR')}
          </span>
        )}
        {card.isCompleted && <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />}
      </div>
      {card.assignees?.length > 0 && (
        <div className="mt-2 flex -space-x-1">
          {card.assignees.slice(0, 3).map((a: any) => (
            <div key={a.user.id} className="flex h-5 w-5 items-center justify-center rounded-full bg-pisom-100 text-xs font-bold text-pisom-700 ring-1 ring-white">
              {a.user.firstName[0]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── List Column ─────────────────────────────────────────
function ListColumn({ list, cards, onOpenCard, onAddCard }: {
  list: any; cards: any[]; onOpenCard: (c: any) => void; onAddCard: (listId: string) => void;
}) {
  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl bg-gray-100 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{list.name}</h3>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">{cards.length}</span>
      </div>
      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[4px] flex-1">
          {cards.map(card => (
            <SortableCard key={card.id} card={card} onOpen={onOpenCard} />
          ))}
        </div>
      </SortableContext>
      <button
        onClick={() => onAddCard(list.id)}
        className="mt-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar cartão
      </button>
    </div>
  );
}

// ─── Card Detail Modal ────────────────────────────────────
function CardDetailModal({ cardId, onClose, onRefresh }: { cardId: string; onClose: () => void; onRefresh: () => void }) {
  const [card, setCard] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [tab, setTab] = useState<'details' | 'comments' | 'history'>('details');

  useEffect(() => {
    api.getCard(cardId).then(setCard).catch(console.error);
    api.getCardComments(cardId).then(setComments).catch(console.error);
  }, [cardId]);

  const handleToggleComplete = async () => {
    try {
      await api.toggleCardComplete(cardId);
      const updated = await api.getCard(cardId);
      setCard(updated);
      onRefresh();
    } catch (err) { console.error('Erro ao completar cartão:', err); }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.createComment(cardId, { content: newComment.trim() });
      setNewComment('');
      api.getCardComments(cardId).then(setComments);
    } catch (err) { console.error('Erro ao comentar:', err); }
  };

  if (!card) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="rounded-xl bg-white p-8"><div className="animate-pulse text-gray-500">Carregando...</div></div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 p-4" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{card.title}</h2>
            {card.company && (
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: card.company.color || '#6b7280' }}
              >
                {card.company.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleComplete}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                card.isCompleted
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {card.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              {card.isCompleted ? 'Concluído' : 'Marcar como concluído'}
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-100 px-6">
          <div className="flex gap-4">
            {(['details', 'comments', 'history'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border-b-2 py-3 text-sm font-medium transition ${
                  tab === t ? 'border-pisom-600 text-pisom-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'details' ? 'Detalhes' : t === 'comments' ? `Comentários (${comments.length})` : 'Histórico'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {tab === 'details' && (
            <div className="space-y-4">
              {card.description && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-gray-400">Descrição</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{card.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-gray-400">Prioridade</p>
                  <span className={`text-sm font-medium ${card.priority === 'ALTA' ? 'text-red-600' : 'text-gray-600'}`}>
                    {card.priority === 'ALTA' ? 'Alta' : 'Normal'}
                  </span>
                </div>
                {card.dueDate && (
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-gray-400">Prazo</p>
                    <p className="text-sm text-gray-700">{new Date(card.dueDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
              </div>
              {card.assignees?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase text-gray-400">Responsáveis</p>
                  <div className="flex flex-wrap gap-2">
                    {card.assignees.map((a: any) => (
                      <div key={a.user.id} className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-pisom-200 text-xs font-bold text-pisom-800">
                          {a.user.firstName[0]}
                        </div>
                        {a.user.firstName} {a.user.lastName}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {card.checklists?.length > 0 && card.checklists.map((cl: any) => (
                <div key={cl.id}>
                  <p className="mb-2 text-xs font-medium uppercase text-gray-400">{cl.title}</p>
                  <div className="space-y-1">
                    {cl.items?.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <button
                          onClick={async () => { await api.toggleChecklistItem(item.id); const c = await api.getCard(cardId); setCard(c); }}
                          className={item.isCompleted ? 'text-green-500' : 'text-gray-300 hover:text-gray-500'}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <span className={item.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}>{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'comments' && (
            <div className="space-y-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pisom-100 text-sm font-bold text-pisom-700">
                    {c.user.firstName[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-900">{c.user.firstName} {c.user.lastName}</span>
                      <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                      {c.isEdited && <span className="text-xs text-gray-400">(editado)</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
              <form onSubmit={handleComment} className="flex gap-2 pt-2">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Adicione um comentário..."
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none"
                />
                <button type="submit" className="self-end rounded-lg bg-pisom-600 px-3 py-2 text-sm font-medium text-white hover:bg-pisom-700">
                  Enviar
                </button>
              </form>
            </div>
          )}

          {tab === 'history' && (
            <HistoryTab cardId={cardId} />
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryTab({ cardId }: { cardId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => { api.getCardHistory(cardId).then(setHistory).catch(console.error); }, [cardId]);
  return (
    <div className="space-y-3">
      {history.map(h => (
        <div key={h.id} className="flex items-start gap-3 text-sm">
          <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-pisom-400 ring-4 ring-pisom-50" />
          <div>
            <span className="font-medium text-gray-700">{h.user?.firstName ?? 'Sistema'}</span>
            <span className="ml-1 text-gray-500">{h.action.replace(/_/g, ' ')}</span>
            <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleString('pt-BR')}</p>
          </div>
        </div>
      ))}
      {history.length === 0 && <p className="text-sm text-gray-400">Nenhum histórico ainda.</p>}
    </div>
  );
}

// ─── Main Board Page ──────────────────────────────────────
export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    try {
      const [boardData, cardsData] = await Promise.all([
        api.getBoard(boardId),
        api.getBoardCards(boardId),
      ]);
      setBoard(boardData);
      setCards(cardsData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [boardId]);

  useEffect(() => { load(); }, [load]);

  const cardsByList = (listId: string) => cards.filter(c => c.listId === listId && !c.isArchived).sort((a, b) => a.position - b.position);

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeCard = cards.find(c => c.id === active.id);
    if (!activeCard) return;

    // Determine target list
    const overCard = cards.find(c => c.id === over.id);
    const targetListId = overCard ? overCard.listId : (over.id as string);

    const listCards = cards.filter(c => c.listId === targetListId).sort((a, b) => a.position - b.position);
    const overIndex = overCard ? listCards.findIndex(c => c.id === over.id) : listCards.length;

    // Optimistic update
    setCards(prev => prev.map(c =>
      c.id === active.id ? { ...c, listId: targetListId, position: overIndex } : c
    ));

    try {
      await api.moveCard(active.id as string, { listId: targetListId, position: overIndex });
    } catch (err) {
      load(); // revert on error
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim() || !addingToList) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createCard(boardId, { title: newCardTitle.trim(), listId: addingToList });
      setNewCardTitle('');
      setAddingToList(null);
      await load();
    } catch (err: any) {
      console.error('Erro ao criar cartão:', err);
      setError(err.message || 'Erro ao criar cartão');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-pulse text-gray-500">Carregando quadro...</div>
    </div>
  );

  if (!board) return <div className="text-center py-20 text-gray-500">Quadro não encontrado</div>;

  return (
    <div className="-m-6 flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-3">
        <Link href="/gestao-operacional" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="h-4 w-px bg-gray-200" />
        <h1 className="text-lg font-semibold text-gray-900">{board.name}</h1>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4">
            {board.lists?.map((list: any) => (
              <div key={list.id}>
                <ListColumn
                  list={list}
                  cards={cardsByList(list.id)}
                  onOpenCard={c => setSelectedCardId(c.id)}
                  onAddCard={setAddingToList}
                />
                {addingToList === list.id && (
                  <form onSubmit={handleAddCard} className="mt-2 w-72">
                    <input
                      autoFocus
                      type="text"
                      value={newCardTitle}
                      onChange={e => setNewCardTitle(e.target.value)}
                      placeholder="Título do cartão..."
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-pisom-500 focus:outline-none"
                    />
                    <div className="mt-1.5 flex gap-1.5">
                      <button type="submit" disabled={submitting} className="rounded-lg bg-pisom-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-pisom-700 disabled:opacity-50">
                        {submitting ? 'Criando...' : 'Criar'}
                      </button>
                      <button type="button" onClick={() => setAddingToList(null)} className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100">Cancelar</button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        </DndContext>
      </div>

      {/* Card Detail Modal */}
      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          onClose={() => setSelectedCardId(null)}
          onRefresh={load}
        />
      )}
    </div>
  );
}
