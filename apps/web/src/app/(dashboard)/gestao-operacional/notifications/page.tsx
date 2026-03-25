'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Bell, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.getBoardNotifications().then(setNotifications).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleMarkAll = async () => {
    await api.markAllNotificationsRead();
    load();
  };

  const handleMarkOne = async (id: string) => {
    await api.markNotificationRead(id);
    load();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-pulse text-gray-500">Carregando...</div></div>;

  const unread = notifications.filter(n => !n.isRead);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
          <p className="mt-1 text-sm text-gray-500">{unread.length} não lidas</p>
        </div>
        {unread.length > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">Nenhuma notificação ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-xl border p-4 ${n.isRead ? 'border-gray-100 bg-white' : 'border-pisom-100 bg-pisom-50'}`}
            >
              <Bell className={`mt-0.5 h-4 w-4 flex-shrink-0 ${n.isRead ? 'text-gray-300' : 'text-pisom-500'}`} />
              <div className="flex-1">
                <p className="text-sm text-gray-800">{n.message}</p>
                <p className="mt-0.5 text-xs text-gray-400">{new Date(n.createdAt).toLocaleString('pt-BR')}</p>
              </div>
              {!n.isRead && (
                <button onClick={() => handleMarkOne(n.id)} className="text-xs text-pisom-600 hover:underline">
                  Marcar como lida
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
