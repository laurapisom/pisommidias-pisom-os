'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';

// Maps route prefixes to module permission keys
const ROUTE_PERMISSION_MAP: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/crm': 'crm',
  '/onboarding': 'onboarding',
  '/tasks': 'tasks',
  '/financial': 'financial',
  '/collaborators': 'collaborators',
  '/settings': 'settings',
};

function getRequiredPermission(pathname: string): string | null {
  for (const [route, moduleKey] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return moduleKey;
    }
  }
  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    // Check permissions
    api.getMe().then((me: any) => {
      const role = me.role;
      const isFullAccess = role === 'OWNER' || role === 'ADMIN';
      const perms = me.modulePermissions || {};

      const requiredPerm = getRequiredPermission(pathname);

      if (requiredPerm && !isFullAccess && perms[requiredPerm] !== true) {
        setAccessDenied(true);
        setReady(true);
      } else {
        setAccessDenied(false);
        setReady(true);
      }
    }).catch(() => {
      setReady(true);
    });
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="ml-[260px] min-h-screen p-6">
          {accessDenied ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 rounded-full bg-red-100 p-4">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Acesso Restrito</h2>
              <p className="mt-2 text-gray-500">
                Você não tem permissão para acessar este módulo.
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Entre em contato com o administrador para solicitar acesso.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-6 rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700"
              >
                Voltar ao Dashboard
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
