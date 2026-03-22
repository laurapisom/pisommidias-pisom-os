'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Crown,
  X,
  Check,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Trash2,
  KeyRound,
  LayoutDashboard,
  Target,
  ClipboardCheck,
  CheckSquare,
  DollarSign,
  Settings,
  Phone,
  Briefcase,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Module definitions — update this when adding new modules           */
/* ------------------------------------------------------------------ */

const SYSTEM_MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600 bg-blue-50' },
  { key: 'crm', label: 'CRM', icon: Target, color: 'text-violet-600 bg-violet-50' },
  { key: 'onboarding', label: 'Onboarding', icon: ClipboardCheck, color: 'text-cyan-600 bg-cyan-50' },
  { key: 'tasks', label: 'Tarefas', icon: CheckSquare, color: 'text-amber-600 bg-amber-50' },
  { key: 'financial', label: 'Financeiro', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'collaborators', label: 'Colaboradores', icon: Users, color: 'text-pink-600 bg-pink-50' },
  { key: 'settings', label: 'Configurações', icon: Settings, color: 'text-gray-600 bg-gray-50' },
];

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  OWNER: { label: 'Proprietário', icon: Crown, color: 'text-amber-700 bg-amber-100' },
  ADMIN: { label: 'Administrador', icon: ShieldCheck, color: 'text-red-700 bg-red-100' },
  MANAGER: { label: 'Gestor', icon: ShieldAlert, color: 'text-blue-700 bg-blue-100' },
  MEMBER: { label: 'Membro', icon: Shield, color: 'text-gray-700 bg-gray-100' },
  VIEWER: { label: 'Visualizador', icon: Eye, color: 'text-gray-500 bg-gray-50' },
};

// Tipo de Acesso options for invite/edit (OWNER not selectable)
const ACCESS_TYPES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gestor' },
  { value: 'MEMBER', label: 'Membro' },
];

const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CollaboratorsPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Job titles
  const [jobTitles, setJobTitles] = useState<any[]>([]);

  // Invite form
  const defaultPerms: Record<string, boolean> = {};
  SYSTEM_MODULES.forEach((m) => {
    defaultPerms[m.key] = m.key === 'dashboard' || m.key === 'tasks';
  });
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    role: 'MEMBER',
    jobTitleId: '',
    modulePermissions: { ...defaultPerms } as Record<string, boolean>,
  });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Reset password
  const [resetPasswordMember, setResetPasswordMember] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [team, me, titles] = await Promise.all([api.getTeam(), api.getMe(), api.getJobTitles()]);
      setMembers(team);
      setCurrentUser(me);
      setJobTitles(titles);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.password) {
      setInviteError('Preencha email, nome e senha');
      return;
    }
    if (inviteForm.password.length < 6) {
      setInviteError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setInviting(true);
    setInviteError('');
    try {
      const payload: any = { ...inviteForm };
      if (!payload.jobTitleId) delete payload.jobTitleId;
      if (!payload.phone) delete payload.phone;
      await api.inviteMember(payload);
      setShowInvite(false);
      const resetPerms: Record<string, boolean> = {};
      SYSTEM_MODULES.forEach((m) => {
        resetPerms[m.key] = m.key === 'dashboard' || m.key === 'tasks';
      });
      setInviteForm({ email: '', firstName: '', lastName: '', phone: '', password: '', role: 'MEMBER', jobTitleId: '', modulePermissions: { ...resetPerms } });
      await loadData();
    } catch (e: any) {
      setInviteError(e.message || 'Erro ao convidar');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, role: string) {
    setSaving(memberId);
    try {
      await api.updateMemberRole(memberId, role);
      await loadData();
    } catch {
      /* ignore */
    } finally {
      setSaving(null);
    }
  }

  async function handlePermissionToggle(memberId: string, moduleKey: string, current: boolean) {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const perms = { ...(member.modulePermissions || {}) };
    perms[moduleKey] = !current;

    // Optimistic update
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, modulePermissions: perms } : m)),
    );

    try {
      await api.updateMemberPermissions(memberId, perms);
    } catch {
      await loadData(); // rollback
    }
  }

  async function handleToggleActive(memberId: string, isActive: boolean) {
    setSaving(memberId);
    try {
      await api.toggleMemberActive(memberId, !isActive);
      await loadData();
    } catch {
      /* ignore */
    } finally {
      setSaving(null);
    }
  }

  async function handleRemove(memberId: string) {
    setSaving(memberId);
    try {
      await api.removeMember(memberId);
      setDeleteConfirm(null);
      await loadData();
    } catch {
      /* ignore */
    } finally {
      setSaving(null);
    }
  }

  async function handleResetPassword(memberId: string) {
    if (!newPassword || newPassword.length < 6) return;
    setSaving(memberId);
    try {
      await api.resetMemberPassword(memberId, newPassword);
      setResetPasswordSuccess(true);
      setTimeout(() => {
        setResetPasswordMember(null);
        setNewPassword('');
        setResetPasswordSuccess(false);
      }, 2000);
    } catch {
      /* ignore */
    } finally {
      setSaving(null);
    }
  }

  function getPermissions(member: any): Record<string, boolean> {
    if (member.role === 'OWNER' || member.role === 'ADMIN') {
      const all: Record<string, boolean> = {};
      SYSTEM_MODULES.forEach((m) => (all[m.key] = true));
      return all;
    }
    const defaults: Record<string, boolean> = {};
    SYSTEM_MODULES.forEach((m) => (defaults[m.key] = false));
    return { ...defaults, ...(member.modulePermissions || {}) };
  }

  const isOwnerOrAdmin = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Colaboradores</h1>
          <p className="mt-1 text-gray-500">Gerencie sua equipe e permissões de acesso</p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Colaboradores</h1>
          <p className="mt-1 text-gray-500">
            {members.length} membro{members.length !== 1 ? 's' : ''} na organização
          </p>
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-pisom-700 transition"
          >
            <UserPlus className="h-4 w-4" />
            Novo Colaborador
          </button>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Novo Colaborador</h2>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500"
                  placeholder="colaborador@email.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
                  <input
                    type="text"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500"
                    placeholder="Nome"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Sobrenome</label>
                  <input
                    type="text"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500"
                    placeholder="Sobrenome"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
                <input
                  type="tel"
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Senha de Acesso</label>
                <input
                  type="text"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500"
                  placeholder="Mínimo 6 caracteres"
                />
                <p className="mt-1 text-xs text-gray-400">Informe essa senha ao colaborador para o primeiro acesso.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de Acesso</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500"
                  >
                    {ACCESS_TYPES.map((at) => (
                      <option key={at.value} value={at.value}>
                        {at.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cargo</label>
                  <select
                    value={inviteForm.jobTitleId}
                    onChange={(e) => setInviteForm({ ...inviteForm, jobTitleId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500"
                  >
                    <option value="">Sem cargo</option>
                    {jobTitles.filter((jt) => jt.isActive !== false).map((jt) => (
                      <option key={jt.id} value={jt.id}>
                        {jt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Module Permissions */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Acesso aos Módulos</label>
                <div className="grid grid-cols-2 gap-2">
                  {SYSTEM_MODULES.map((mod) => {
                    const ModIcon = mod.icon;
                    const isActive = inviteForm.modulePermissions[mod.key] ?? false;
                    const isAdmin = inviteForm.role === 'ADMIN';
                    return (
                      <button
                        key={mod.key}
                        type="button"
                        onClick={() => {
                          if (!isAdmin) {
                            setInviteForm({
                              ...inviteForm,
                              modulePermissions: {
                                ...inviteForm.modulePermissions,
                                [mod.key]: !isActive,
                              },
                            });
                          }
                        }}
                        disabled={isAdmin}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm transition',
                          isAdmin || isActive
                            ? 'border-pisom-300 bg-pisom-50 text-gray-900'
                            : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300',
                          isAdmin && 'cursor-not-allowed opacity-70',
                        )}
                      >
                        <div className={cn('rounded-md p-1', isAdmin || isActive ? mod.color : 'text-gray-300 bg-gray-100')}>
                          <ModIcon className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-xs font-medium">{mod.label}</span>
                        <div
                          className={cn(
                            'h-4 w-7 rounded-full transition relative',
                            isAdmin || isActive ? 'bg-pisom-500' : 'bg-gray-300',
                          )}
                        >
                          <div
                            className={cn(
                              'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform',
                              isAdmin || isActive ? 'translate-x-3' : 'translate-x-0.5',
                            )}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
                {inviteForm.role === 'ADMIN' && (
                  <p className="mt-1 text-xs text-gray-400">Administradores têm acesso total.</p>
                )}
              </div>

              {inviteError && (
                <p className="text-sm text-red-600">{inviteError}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowInvite(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleInvite}
                  disabled={inviting}
                  className="flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700 disabled:opacity-50"
                >
                  {inviting ? 'Convidando...' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Resetar Senha</h2>
              <button onClick={() => setResetPasswordMember(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {resetPasswordSuccess ? (
              <div className="py-4 text-center">
                <Check className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-gray-900">Senha alterada com sucesso!</p>
                <p className="mt-1 text-xs text-gray-500">Informe a nova senha ao colaborador.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nova Senha</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pisom-500 focus:ring-1 focus:ring-pisom-500"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setResetPasswordMember(null)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleResetPassword(resetPasswordMember)}
                    disabled={!newPassword || newPassword.length < 6 || saving === resetPasswordMember}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    Alterar Senha
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3">
        {members.map((member) => {
          const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.MEMBER;
          const RoleIcon = roleConfig.icon;
          const perms = getPermissions(member);
          const isOwner = member.role === 'OWNER';
          const isEditing = editingPermissions === member.id;
          const isSelf = member.userId === currentUser?.id;

          return (
            <div
              key={member.id}
              className={cn(
                'rounded-xl border bg-white shadow-sm transition',
                !member.user.isActive && 'opacity-60',
                isEditing ? 'border-pisom-300 ring-1 ring-pisom-200' : 'border-gray-200',
              )}
            >
              {/* Member Row */}
              <div className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pisom-100 text-sm font-bold text-pisom-700">
                  {member.user.firstName?.charAt(0)?.toUpperCase()}
                  {member.user.lastName?.charAt(0)?.toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    {isSelf && (
                      <span className="rounded-full bg-pisom-100 px-2 py-0.5 text-[10px] font-medium text-pisom-700">
                        Você
                      </span>
                    )}
                    {!member.user.isActive && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{member.user.email}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {member.jobTitle && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Briefcase className="h-3 w-3" />
                        {member.jobTitle.name}
                      </span>
                    )}
                    {member.user.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone className="h-3 w-3" />
                        {member.user.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Role Badge */}
                <div className="shrink-0">
                  {isOwnerOrAdmin && !isOwner ? (
                    <div className="relative">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        disabled={saving === member.id}
                        className={cn(
                          'appearance-none rounded-full pl-3 pr-8 py-1.5 text-xs font-medium border-0 cursor-pointer',
                          roleConfig.color,
                        )}
                      >
                        {ACCESS_TYPES.map((at) => (
                          <option key={at.value} value={at.value}>
                            {at.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
                    </div>
                  ) : (
                    <span className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium', roleConfig.color)}>
                      <RoleIcon className="h-3.5 w-3.5" />
                      {roleConfig.label}
                    </span>
                  )}
                </div>

                {/* Module Permissions Summary */}
                <div className="hidden md:flex items-center gap-1 shrink-0">
                  {SYSTEM_MODULES.map((mod) => {
                    const hasAccess = perms[mod.key] ?? false;
                    const ModIcon = mod.icon;
                    return (
                      <div
                        key={mod.key}
                        title={`${mod.label}: ${hasAccess ? 'Liberado' : 'Bloqueado'}`}
                        className={cn(
                          'rounded-md p-1.5 transition',
                          hasAccess ? mod.color : 'text-gray-300 bg-gray-50',
                        )}
                      >
                        <ModIcon className="h-3.5 w-3.5" />
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                {isOwnerOrAdmin && !isOwner && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditingPermissions(isEditing ? null : member.id)}
                      title="Editar permissões"
                      className={cn(
                        'rounded-lg p-2 text-sm transition',
                        isEditing
                          ? 'bg-pisom-100 text-pisom-700'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
                      )}
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setResetPasswordMember(member.id); setNewPassword(''); setResetPasswordSuccess(false); }}
                      title="Resetar senha"
                      className="rounded-lg p-2 text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(member.id, member.user.isActive)}
                      title={member.user.isActive ? 'Desativar' : 'Ativar'}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                    >
                      {member.user.isActive ? (
                        <ToggleRight className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </button>
                    {deleteConfirm === member.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="rounded-lg bg-red-100 p-2 text-red-600 hover:bg-red-200 transition"
                          title="Confirmar exclusão"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 transition"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(member.id)}
                        title="Remover"
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Permissions Panel */}
              {isEditing && (
                <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Permissões de Módulos
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                    {SYSTEM_MODULES.map((mod) => {
                      const hasAccess = perms[mod.key] ?? false;
                      const ModIcon = mod.icon;
                      const isAdminLocked = member.role === 'ADMIN';

                      return (
                        <button
                          key={mod.key}
                          onClick={() => {
                            if (!isAdminLocked) {
                              handlePermissionToggle(member.id, mod.key, hasAccess);
                            }
                          }}
                          disabled={isAdminLocked}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition',
                            hasAccess
                              ? 'border-pisom-300 bg-pisom-50'
                              : 'border-gray-200 bg-white',
                            isAdminLocked
                              ? 'cursor-not-allowed opacity-60'
                              : 'cursor-pointer hover:shadow-sm',
                          )}
                        >
                          <div className={cn('rounded-lg p-2', hasAccess ? mod.color : 'text-gray-300 bg-gray-100')}>
                            <ModIcon className="h-5 w-5" />
                          </div>
                          <span className={cn('text-xs font-medium', hasAccess ? 'text-gray-900' : 'text-gray-400')}>
                            {mod.label}
                          </span>
                          <div
                            className={cn(
                              'h-5 w-9 rounded-full transition relative',
                              hasAccess ? 'bg-pisom-500' : 'bg-gray-300',
                            )}
                          >
                            <div
                              className={cn(
                                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                                hasAccess ? 'translate-x-4' : 'translate-x-0.5',
                              )}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {member.role === 'ADMIN' && (
                    <p className="mt-3 text-xs text-gray-400">
                      Administradores têm acesso total a todos os módulos.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {members.length === 0 && (
        <div className="mt-12 flex flex-col items-center text-center">
          <Users className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum colaborador cadastrado</p>
          {isOwnerOrAdmin && (
            <button
              onClick={() => setShowInvite(true)}
              className="mt-4 flex items-center gap-2 rounded-lg bg-pisom-600 px-4 py-2 text-sm font-medium text-white hover:bg-pisom-700"
            >
              <UserPlus className="h-4 w-4" />
              Cadastrar primeiro colaborador
            </button>
          )}
        </div>
      )}
    </div>
  );
}
