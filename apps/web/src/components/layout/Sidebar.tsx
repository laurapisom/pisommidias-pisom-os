'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
  UserCircle,
  CheckSquare,
  Settings,
  LogOut,
  ChevronDown,
  Target,
  ClipboardCheck,
  DollarSign,
  FileText,
  Receipt,
  TrendingUp,
  CreditCard,
  PenTool,
  Calendar,
  Lightbulb,
  UserCog,
  Landmark,
  ListOrdered,
  FileBarChart,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'CRM',
    icon: Target,
    children: [
      { label: 'Pipeline', href: '/crm/pipeline', icon: Kanban },
      { label: 'Leads', href: '/crm/leads', icon: Users },
      { label: 'Contatos', href: '/crm/contacts', icon: UserCircle },
      { label: 'Empresas', href: '/crm/companies', icon: Building2 },
    ],
  },
  { label: 'Onboarding', href: '/onboarding', icon: ClipboardCheck },
  { label: 'Tarefas', href: '/tasks', icon: CheckSquare },
  {
    label: 'Conteúdo',
    icon: PenTool,
    children: [
      { label: 'Posts', href: '/content', icon: FileText },
      { label: 'Calendário', href: '/content/calendar', icon: Calendar },
      { label: 'Ideias', href: '/content/ideas', icon: Lightbulb },
      { label: 'Perfis', href: '/content/profiles', icon: UserCog },
    ],
  },
  {
    label: 'Financeiro',
    icon: DollarSign,
    children: [
      { label: 'Visão Geral', href: '/financial', icon: TrendingUp },
      { label: 'Contas', href: '/financial/accounts', icon: Landmark },
      { label: 'Contratos', href: '/financial/contracts', icon: FileText },
      { label: 'Faturas', href: '/financial/invoices', icon: Receipt },
      { label: 'Despesas', href: '/financial/expenses', icon: CreditCard },
      { label: 'Extrato Bancário', href: '/financial/statements', icon: ListOrdered },
      { label: 'DDA', href: '/financial/dda', icon: FileBarChart },
      { label: 'Fluxo de Caixa', href: '/financial/cashflow', icon: TrendingUp },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [orgName, setOrgName] = useState('Pisom OS');
  const [orgLogo, setOrgLogo] = useState('');

  useEffect(() => {
    // Load from cache first for instant render
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('pisom_org_brand');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (data.name) setOrgName(data.name);
          if (data.logo) setOrgLogo(data.logo);
        } catch { /* ignore */ }
      }
    }

    // Fetch fresh data
    api.getMe().then((me: any) => {
      const org = me.organization;
      if (org) {
        const brandData = { name: org.name || 'Pisom OS', logo: org.logo || '' };
        setOrgName(brandData.name);
        setOrgLogo(brandData.logo);
        localStorage.setItem('pisom_org_brand', JSON.stringify(brandData));
      }
    }).catch(() => { /* ignore */ });
  }, []);

  // Listen for brand updates from settings page
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'pisom_org_brand' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.name) setOrgName(data.name);
          if (data.logo) setOrgLogo(data.logo);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', handler);

    // Also listen for custom event (same-tab updates)
    const customHandler = () => {
      const cached = localStorage.getItem('pisom_org_brand');
      if (cached) {
        try {
          const data = JSON.parse(cached);
          if (data.name) setOrgName(data.name);
          if (data.logo) setOrgLogo(data.logo);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('pisom_brand_updated', customHandler);

    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('pisom_brand_updated', customHandler);
    };
  }, []);

  const handleLogout = () => {
    api.clearToken();
    localStorage.removeItem('pisom_org_brand');
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-full w-[260px] flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
        {orgLogo ? (
          <img
            src={orgLogo}
            alt={orgName}
            className="h-8 w-8 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pisom-600 text-sm font-bold text-white">
            {orgName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="truncate text-lg font-bold text-gray-900">{orgName}</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {navItems.map((item) => {
          if ('children' in item) {
            const isActive = item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'));
            return (
              <div key={item.label} className="mb-1">
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600',
                    isActive && 'text-pisom-700',
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                  <ChevronDown className={cn('ml-auto h-4 w-4 transition', isActive && 'rotate-180')} />
                </div>
                <div className="ml-4 space-y-0.5 border-l border-gray-200 pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                        pathname === child.href || pathname.startsWith(child.href + '/')
                          ? 'bg-pisom-50 font-medium text-pisom-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      )}
                    >
                      <child.icon className="h-4 w-4" />
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                'mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                pathname === item.href || pathname.startsWith(item.href! + '/')
                  ? 'bg-pisom-50 font-medium text-pisom-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <Link
          href="/settings"
          className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
        >
          <Settings className="h-5 w-5" />
          Configurações
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
