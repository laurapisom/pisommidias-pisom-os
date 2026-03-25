'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Plus, Kanban, Users, Clock, MoreHorizontal, Archive } from 'lucide-react';

export default function BoardsPage() {
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const load = () => {
    api.getBoards()
      .then(setBoards)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.createBoard({ name: newName.trim() });
      setNewName('');
      setCreating(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-pulse text-gray-500">Carregando quadros...</div>
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão Operacional</h1>
          <p className="mt-1 text-sm text-gray-500">Quadros Kanban para gerenciamento de tarefas da equipe</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700"
        >
          <Plus className="h-4 w-4" />
          Novo Quadro
        </button>
      </div>

      {creating && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nome do quadro..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:outline-none"
            />
            <button type="submit" className="rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700">
              Criar
            </button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              Cancelar
            </button>
          </form>
        </div>
      )}

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Kanban className="mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum quadro ainda</h3>
          <p className="mt-1 text-sm text-gray-500">Crie seu primeiro quadro Kanban para começar.</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700"
          >
            <Plus className="h-4 w-4" />
            Criar Quadro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map(board => (
            <Link
              key={board.id}
              href={`/gestao-operacional/boards/${board.id}`}
              className="group relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-pisom-300"
            >
              <div
                className="mb-3 h-2 w-8 rounded-full"
                style={{ backgroundColor: board.color || '#7c3aed' }}
              />
              <h3 className="font-semibold text-gray-900 group-hover:text-pisom-700">{board.name}</h3>
              {board.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{board.description}</p>
              )}
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {board._count?.members ?? 0} membros
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {board._count?.cards ?? 0} cartões
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
