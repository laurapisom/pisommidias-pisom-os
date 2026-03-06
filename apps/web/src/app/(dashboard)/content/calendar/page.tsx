'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  IDEA: 'bg-gray-200',
  DRAFT: 'bg-yellow-300',
  IN_REVIEW: 'bg-blue-300',
  APPROVED: 'bg-green-300',
  SCHEDULED: 'bg-purple-300',
  PUBLISHED: 'bg-emerald-400',
  REJECTED: 'bg-red-300',
};

const channelEmoji: Record<string, string> = {
  INSTAGRAM_FEED: 'IG',
  INSTAGRAM_STORIES: 'ST',
  INSTAGRAM_REELS: 'RL',
  FACEBOOK: 'FB',
  TIKTOK: 'TK',
  YOUTUBE: 'YT',
  LINKEDIN: 'LI',
  TWITTER: 'TW',
  BLOG: 'BL',
  EMAIL: 'EM',
  WHATSAPP: 'WA',
  OTHER: '...',
};

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function CalendarPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    api.getContentCalendar(monthStr).then(setPosts).catch(console.error).finally(() => setLoading(false));
  }, [monthStr]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const navigate = (dir: number) => {
    setCurrentDate(new Date(year, month + dir, 1));
  };

  const getPostsForDay = (day: number) => {
    return posts.filter((p) => {
      const d = new Date(p.scheduledAt);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendário Editorial</h1>
          <p className="mt-1 text-gray-500">Agenda de publicações</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[180px] text-center text-sm font-semibold text-gray-900">
            {MONTHS[month]} {year}
          </span>
          <button onClick={() => navigate(1)} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAYS.map((d) => (
            <div key={d} className="px-2 py-3 text-center text-xs font-medium uppercase text-gray-500">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const dayPosts = day ? getPostsForDay(day) : [];
            return (
              <div
                key={i}
                className={cn(
                  'min-h-[120px] border-b border-r border-gray-100 p-1.5',
                  !day && 'bg-gray-50/50',
                )}
              >
                {day && (
                  <>
                    <div className={cn(
                      'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs',
                      isToday ? 'bg-pisom-600 font-bold text-white' : 'text-gray-600',
                    )}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayPosts.map((post) => (
                        <div
                          key={post.id}
                          className={cn(
                            'rounded px-1.5 py-1 text-[10px] leading-tight',
                            statusColors[post.status] || 'bg-gray-200',
                          )}
                          title={`${post.title} (${post.profile?.clientName || 'Sem cliente'})`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="rounded bg-white/50 px-1 text-[9px] font-bold">{channelEmoji[post.channel] || '?'}</span>
                            <span className="truncate font-medium">{post.title}</span>
                          </div>
                          {post.profile && (
                            <p className="mt-0.5 truncate opacity-75">{post.profile.clientName}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn('h-3 w-3 rounded', color)} />
            <span className="text-xs text-gray-500">
              {status === 'IDEA' ? 'Ideia' : status === 'DRAFT' ? 'Rascunho' : status === 'IN_REVIEW' ? 'Revisão' : status === 'APPROVED' ? 'Aprovado' : status === 'SCHEDULED' ? 'Agendado' : status === 'PUBLISHED' ? 'Publicado' : 'Rejeitado'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
