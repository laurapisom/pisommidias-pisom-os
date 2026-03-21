'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  User,
  Building2,
  Users,
  Shield,
  Mail,
  Copy,
  Trash2,
  Plus,
  AlertTriangle,
  RotateCcw,
  DollarSign,
  UserCheck,
  Kanban,
  CheckSquare,
  ClipboardList,
  FileText,
  Tag,
  FolderOpen,
  Upload,
  ImageIcon,
  X,
  Palette,
} from 'lucide-react';

const TABS = [
  { key: 'perfil', label: 'Perfil', icon: User },
  { key: 'organizacao', label: 'Organização', icon: Building2 },
  { key: 'equipe', label: 'Equipe', icon: Users },
  { key: 'resetar', label: 'Resetar Dados', icon: RotateCcw },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as const;

const roleBadgeColors: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MANAGER: 'bg-amber-100 text-amber-700',
  MEMBER: 'bg-gray-100 text-gray-700',
  VIEWER: 'bg-green-100 text-green-700',
};

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200';

const btnPrimary =
  'bg-pisom-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-pisom-700 disabled:opacity-50 disabled:cursor-not-allowed';

function getInitials(firstName?: string, lastName?: string) {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('perfil');
  const [loading, setLoading] = useState(true);

  // User state
  const [user, setUser] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Organization state
  const [orgName, setOrgName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgMsg, setOrgMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Brand customization state
  const [orgLogo, setOrgLogo] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMsg, setBrandMsg] = useState('');

  // Team state
  const [team, setTeam] = useState<any[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  // Reset state
  const [resetOptions, setResetOptions] = useState({
    financial: false,
    crm: false,
    pipeline: false,
    tasks: false,
    onboarding: false,
    content: false,
    categories: false,
    tags: false,
  });
  const [resetStep, setResetStep] = useState<'select' | 'confirm' | 'processing' | 'done'>('select');
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<Record<string, number> | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [resetProgress, setResetProgress] = useState(0);
  const [resetCurrentLabel, setResetCurrentLabel] = useState('');
  const [resetError, setResetError] = useState('');

  const RESET_LABELS: Record<string, string> = {
    financial: 'Apagando dados financeiros...',
    categories: 'Removendo categorias e centros de custo...',
    tags: 'Removendo tags...',
    tasks: 'Apagando tarefas e comentários...',
    onboarding: 'Removendo onboardings e templates...',
    content: 'Apagando conteúdo, posts e ideias...',
    crm: 'Removendo CRM (deals, leads, contatos, empresas)...',
    pipeline: 'Resetando pipelines...',
  };

  const executeReset = useCallback(async () => {
    setResetStep('processing');
    setResetProgress(0);
    setResetError('');
    setResetCurrentLabel('Preparando exclusão...');

    const selectedKeys = Object.entries(resetOptions)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const totalSteps = selectedKeys.length + 1;

    // Animate progress through selected steps
    for (let i = 0; i < selectedKeys.length; i++) {
      setResetCurrentLabel(RESET_LABELS[selectedKeys[i]] || `Processando ${selectedKeys[i]}...`);
      setResetProgress(Math.round(((i + 1) / totalSteps) * 80));
      await new Promise((r) => setTimeout(r, 400));
    }

    setResetCurrentLabel('Enviando requisição ao servidor...');
    setResetProgress(85);

    try {
      const result = await api.resetOrganizationData(resetOptions);
      setResetProgress(100);
      setResetCurrentLabel('Concluído!');
      await new Promise((r) => setTimeout(r, 500));
      setResetResult(result.deleted);
      setResetStep('done');
    } catch (err: any) {
      setResetError(err.message || 'Erro ao resetar dados. Tente novamente.');
      setResetStep('confirm');
    }
  }, [resetOptions]);

  useEffect(() => {
    async function load() {
      try {
        const [me, teamData] = await Promise.all([api.getMe(), api.getTeam()]);
        setUser(me);
        setProfileForm({ firstName: me.firstName || '', lastName: me.lastName || '' });
        setOrgName(me.organization?.name || '');
        setOrgId(me.organization?.id || '');
        setOrgLogo(me.organization?.logo || '');
        setLogoPreview(me.organization?.logo || '');
        setTeam(teamData);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const payload: any = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
      };
      if (passwordForm.newPassword) {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          setProfileMsg('As senhas não coincidem.');
          setProfileSaving(false);
          return;
        }
        payload.currentPassword = passwordForm.currentPassword;
        payload.newPassword = passwordForm.newPassword;
      }
      await api.updateMe(payload);
      setProfileMsg('Perfil atualizado com sucesso.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setProfileMsg(err.message || 'Erro ao atualizar perfil.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleOrgSave = async () => {
    setOrgSaving(true);
    setOrgMsg('');
    try {
      await api.updateOrganization({ name: orgName });
      setOrgMsg('Organização atualizada com sucesso.');
    } catch (err: any) {
      setOrgMsg(err.message || 'Erro ao atualizar organização.');
    } finally {
      setOrgSaving(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(orgId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async () => {
    setInviting(true);
    try {
      await api.inviteMember({ email: inviteEmail, role: inviteRole });
      const teamData = await api.getTeam();
      setTeam(teamData);
      setInviteEmail('');
      setInviteRole('MEMBER');
      setShowInvite(false);
    } catch {
      // ignore
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    try {
      await api.updateMemberRole(memberId, role);
      setTeam((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role } : m)),
      );
    } catch {
      // ignore
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await api.removeMember(memberId);
      setTeam((prev) => prev.filter((m) => m.id !== memberId));
      setConfirmRemove(null);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pisom-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie seu perfil e sua organização
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-pisom-50 text-pisom-700'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'perfil' && (
        <div className="space-y-6">
          {/* Profile Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Informações do Perfil
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={profileForm.firstName}
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Sobrenome
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={profileForm.lastName}
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  <Mail className="mr-1 inline h-4 w-4" />
                  E-mail
                </label>
                <input
                  type="email"
                  className={cn(inputClass, 'bg-gray-50 text-gray-500')}
                  value={user?.email || ''}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Alterar Senha
            </h2>
            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Senha Atual
                </label>
                <input
                  type="password"
                  className={inputClass}
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((p) => ({
                      ...p,
                      currentPassword: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    className={inputClass}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((p) => ({
                        ...p,
                        newPassword: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    className={inputClass}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((p) => ({
                        ...p,
                        confirmPassword: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-4">
            <button
              className={btnPrimary}
              disabled={profileSaving}
              onClick={handleProfileSave}
            >
              {profileSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            {profileMsg && (
              <span className="text-sm text-gray-600">{profileMsg}</span>
            )}
          </div>
        </div>
      )}

      {activeTab === 'organizacao' && (
        <div className="space-y-6">
          {/* Brand Customization */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">
              <Palette className="mr-2 inline h-5 w-5" />
              Personalização do Sistema
            </h2>
            <p className="mb-6 text-sm text-gray-500">
              Personalize o nome e a logo que aparecem na barra lateral do sistema.
            </p>

            <div className="flex flex-col gap-6 sm:flex-row">
              {/* Logo upload */}
              <div className="flex flex-col items-center gap-3">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Logo (1:1)
                </label>
                <div className="relative group">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="h-24 w-24 rounded-xl border-2 border-gray-200 object-cover"
                      />
                      <button
                        onClick={() => {
                          setLogoPreview('');
                          setOrgLogo('');
                        }}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-pisom-400 hover:bg-pisom-50">
                      <ImageIcon className="mb-1 h-6 w-6 text-gray-400" />
                      <span className="text-xs text-gray-400">Upload</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2_000_000) {
                            setBrandMsg('A imagem deve ter no máximo 2MB.');
                            return;
                          }
                          // Compress and resize to 128x128
                          const img = new Image();
                          const url = URL.createObjectURL(file);
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = 128;
                            canvas.height = 128;
                            const ctx = canvas.getContext('2d')!;
                            // Draw centered/cropped square
                            const size = Math.min(img.width, img.height);
                            const sx = (img.width - size) / 2;
                            const sy = (img.height - size) / 2;
                            ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);
                            const compressed = canvas.toDataURL('image/webp', 0.8);
                            setLogoPreview(compressed);
                            setOrgLogo(compressed);
                            URL.revokeObjectURL(url);
                          };
                          img.src = url;
                        }}
                      />
                    </label>
                  )}
                </div>
                <span className="text-xs text-gray-400">PNG, JPG ou SVG (max 500KB)</span>
              </div>

              {/* Preview */}
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nome do Sistema
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ex: Minha Agência"
                />

                {/* Live preview */}
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Preview da barra lateral
                  </label>
                  <div className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pisom-600 text-sm font-bold text-white">
                        {(orgName || 'P').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-lg font-bold text-gray-900">
                      {orgName || 'Pisom OS'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                className={btnPrimary}
                disabled={brandSaving}
                onClick={async () => {
                  setBrandSaving(true);
                  setBrandMsg('');
                  try {
                    await api.updateOrganization({ name: orgName, logo: orgLogo || null });
                    const brandData = { name: orgName, logo: orgLogo };
                    localStorage.setItem('pisom_org_brand', JSON.stringify(brandData));
                    window.dispatchEvent(new Event('pisom_brand_updated'));
                    setBrandMsg('Personalização salva com sucesso!');
                  } catch (err: any) {
                    setBrandMsg(err.message || 'Erro ao salvar personalização.');
                  } finally {
                    setBrandSaving(false);
                  }
                }}
              >
                {brandSaving ? 'Salvando...' : 'Salvar Personalização'}
              </button>
              {brandMsg && (
                <span className="text-sm text-gray-600">{brandMsg}</span>
              )}
            </div>
          </div>

          {/* Organization Data */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              <Building2 className="mr-2 inline h-5 w-5" />
              Dados da Organização
            </h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ID da Organização
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={cn(inputClass, 'bg-gray-50 font-mono text-xs text-gray-500')}
                  value={orgId}
                  readOnly
                />
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'equipe' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                <Users className="mr-2 inline h-5 w-5" />
                Membros da Equipe
              </h2>
              <button
                onClick={() => setShowInvite(!showInvite)}
                className={btnPrimary + ' flex items-center gap-2'}
              >
                <Plus className="h-4 w-4" />
                Convidar Membro
              </button>
            </div>

            {/* Invite form */}
            {showInvite && (
              <div className="mb-6 rounded-lg border border-pisom-200 bg-pisom-50 p-4">
                <h3 className="mb-3 text-sm font-medium text-gray-900">
                  Convidar novo membro
                </h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="email"
                      placeholder="E-mail do membro"
                      className={inputClass}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <select
                    className={cn(inputClass, 'w-40')}
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    {ROLES.filter((r) => r !== 'OWNER').map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    className={btnPrimary}
                    disabled={inviting || !inviteEmail}
                    onClick={handleInvite}
                  >
                    {inviting ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </div>
            )}

            {/* Team list */}
            <div className="divide-y divide-gray-100">
              {team.map((member) => {
                const u = member.user || member;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pisom-100 text-sm font-semibold text-pisom-700">
                      {getInitials(u.firstName, u.lastName)}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-gray-500">
                        <Mail className="h-3 w-3" />
                        {u.email}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        member.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {member.isActive ? 'Ativo' : 'Inativo'}
                    </span>

                    {/* Role badge */}
                    <span
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                        roleBadgeColors[member.role] || 'bg-gray-100 text-gray-700',
                      )}
                    >
                      <Shield className="h-3 w-3" />
                      {member.role}
                    </span>

                    {/* Role select */}
                    <select
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
                      value={member.role}
                      disabled={member.role === 'OWNER'}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    {/* Remove button */}
                    {member.role !== 'OWNER' && (
                      <>
                        {confirmRemove === member.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRemove(member.id)}
                              className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmRemove(null)}
                              className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRemove(member.id)}
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                            title="Remover membro"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {team.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">
                  Nenhum membro encontrado.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'resetar' && (
        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <h3 className="text-sm font-semibold text-red-800">Zona de Perigo</h3>
              <p className="mt-1 text-sm text-red-700">
                As ações abaixo apagam dados permanentemente e não podem ser desfeitas.
                Selecione com cuidado os dados que deseja remover.
              </p>
            </div>
          </div>

          {resetStep === 'select' && (
            <>
              {/* Reset options */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-2 text-lg font-semibold text-gray-900">
                  <RotateCcw className="mr-2 inline h-5 w-5" />
                  Selecione o que deseja apagar
                </h2>
                <p className="mb-6 text-sm text-gray-500">
                  Marque as categorias de dados que deseja remover permanentemente.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    {
                      key: 'financial' as const,
                      icon: DollarSign,
                      label: 'Financeiro',
                      desc: 'Contratos, faturas e despesas',
                      color: 'text-green-600 bg-green-50',
                    },
                    {
                      key: 'crm' as const,
                      icon: UserCheck,
                      label: 'CRM',
                      desc: 'Deals, leads, contatos, empresas e atividades',
                      color: 'text-blue-600 bg-blue-50',
                    },
                    {
                      key: 'pipeline' as const,
                      icon: Kanban,
                      label: 'Pipeline',
                      desc: 'Pipelines e estágios (recria o padrão)',
                      color: 'text-purple-600 bg-purple-50',
                    },
                    {
                      key: 'tasks' as const,
                      icon: CheckSquare,
                      label: 'Tarefas',
                      desc: 'Tarefas e comentários',
                      color: 'text-amber-600 bg-amber-50',
                    },
                    {
                      key: 'onboarding' as const,
                      icon: ClipboardList,
                      label: 'Onboarding',
                      desc: 'Onboardings, checklists e templates',
                      color: 'text-cyan-600 bg-cyan-50',
                    },
                    {
                      key: 'content' as const,
                      icon: FileText,
                      label: 'Conteúdo',
                      desc: 'Posts, ideias, perfis e versões',
                      color: 'text-pink-600 bg-pink-50',
                    },
                    {
                      key: 'categories' as const,
                      icon: FolderOpen,
                      label: 'Categorias e Centros de Custo',
                      desc: 'Categorias de despesa e centros de custo',
                      color: 'text-orange-600 bg-orange-50',
                    },
                    {
                      key: 'tags' as const,
                      icon: Tag,
                      label: 'Tags',
                      desc: 'Tags e associações de tags',
                      color: 'text-indigo-600 bg-indigo-50',
                    },
                  ]).map((item) => {
                    const Icon = item.icon;
                    const checked = resetOptions[item.key];
                    return (
                      <label
                        key={item.key}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-all',
                          checked
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 bg-white hover:border-gray-300',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setResetOptions((prev) => ({
                              ...prev,
                              [item.key]: e.target.checked,
                            }))
                          }
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn('rounded-md p-1', item.color)}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {item.label}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">{item.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Select all / Deselect all */}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() =>
                      setResetOptions({
                        financial: true,
                        crm: true,
                        pipeline: true,
                        tasks: true,
                        onboarding: true,
                        content: true,
                        categories: true,
                        tags: true,
                      })
                    }
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Selecionar tudo
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() =>
                      setResetOptions({
                        financial: false,
                        crm: false,
                        pipeline: false,
                        tasks: false,
                        onboarding: false,
                        content: false,
                        categories: false,
                        tags: false,
                      })
                    }
                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Desmarcar tudo
                  </button>
                </div>
              </div>

              {/* Continue button */}
              <button
                disabled={!Object.values(resetOptions).some(Boolean)}
                onClick={() => {
                  setResetStep('confirm');
                  setConfirmText('');
                }}
                className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuar para confirmação
              </button>
            </>
          )}

          {resetStep === 'confirm' && (
            <div className="rounded-xl border-2 border-red-300 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-red-800">
                    Confirmar exclusão de dados
                  </h2>
                  <p className="text-sm text-red-600">
                    Esta ação é irreversível!
                  </p>
                </div>
              </div>

              {/* Summary of what will be deleted */}
              <div className="mb-6 rounded-lg bg-red-50 p-4">
                <p className="mb-2 text-sm font-medium text-red-800">
                  Você está prestes a apagar:
                </p>
                <ul className="space-y-1">
                  {resetOptions.financial && (
                    <li className="flex items-center gap-2 text-sm text-red-700">
                      <DollarSign className="h-3.5 w-3.5" /> Contratos, faturas e despesas
                    </li>
                  )}
                  {resetOptions.crm && (
                    <li className="flex items-center gap-2 text-sm text-red-700">
                      <UserCheck className="h-3.5 w-3.5" /> Deals, leads, contatos, empresas e atividades
                    </li>
                  )}
                  {resetOptions.pipeline && (
                    <li className="flex items-center gap-2 text-sm text-red-700">
                      <Kanban className="h-3.5 w-3.5" /> Pipelines e estágios
                    </li>
                  )}
                  {resetOptions.tasks && (
                    <li className="flex items-center gap-2 text-sm text-red-700">
                      <CheckSquare className="h-3.5 w-3.5" /> Tarefas e comentários
                    </li>
                  )}
                  {resetOptions.onboarding && (
                    <li className="flex items-center gap-2 text-sm text-red-700">
                      <ClipboardList className="h-3.5 w-3.5" /> Onboardings e templates
                    </li>
                  )}
                  {resetOptions.content && (
                    <li className="flex items-center gap-2 text-sm text-red-700">
                      <FileText className="h-3.5 w-3.5" /> Posts, ideias e perfis de conteúdo
                    </li>
                  )}
                  {resetOptions.categories && (
                    <li className="flex items-center gap-2 text-sm text-red-700">
                      <FolderOpen className="h-3.5 w-3.5" /> Categorias e centros de custo
                    </li>
                  )}
                  {resetOptions.tags && (
                    <li className="flex items-center gap-2 text-sm text-red-700">
                      <Tag className="h-3.5 w-3.5" /> Tags e associações
                    </li>
                  )}
                </ul>
              </div>

              {/* Confirmation input */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Digite <span className="font-bold text-red-600">APAGAR DADOS</span> para confirmar:
                </label>
                <input
                  type="text"
                  className={cn(inputClass, 'border-red-300 focus:border-red-500 focus:ring-red-200')}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="APAGAR DADOS"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setResetStep('select')}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Voltar
                </button>
                <button
                  disabled={confirmText !== 'APAGAR DADOS'}
                  onClick={() => executeReset()}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Apagar dados permanentemente
                </button>
              {resetError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mr-1 inline h-4 w-4" />
                  {resetError}
                </div>
              )}
              </div>
            </div>
          )}

          {resetStep === 'processing' && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="mx-auto max-w-md text-center">
                {/* Animated icon */}
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                  <RotateCcw className="h-10 w-10 animate-spin text-red-600" style={{ animationDuration: '2s' }} />
                </div>

                <h2 className="mb-2 text-xl font-bold text-gray-900">
                  Apagando dados...
                </h2>
                <p className="mb-6 text-sm text-gray-500">
                  Por favor, não feche esta página. Isso pode levar alguns segundos.
                </p>

                {/* Progress bar */}
                <div className="mb-3 h-4 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500 ease-out"
                    style={{ width: `${resetProgress}%` }}
                  />
                </div>

                {/* Progress percentage and label */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{resetCurrentLabel}</span>
                  <span className="font-semibold text-red-600">{resetProgress}%</span>
                </div>

                {/* Step indicators */}
                <div className="mt-6 space-y-2">
                  {Object.entries(resetOptions)
                    .filter(([, v]) => v)
                    .map(([key], idx, arr) => {
                      const stepProgress = ((idx + 1) / (arr.length + 1)) * 80;
                      const isDone = resetProgress > stepProgress;
                      const isCurrent = !isDone && resetProgress >= ((idx) / (arr.length + 1)) * 80;
                      const iconMap: Record<string, any> = {
                        financial: DollarSign,
                        crm: UserCheck,
                        pipeline: Kanban,
                        tasks: CheckSquare,
                        onboarding: ClipboardList,
                        content: FileText,
                        categories: FolderOpen,
                        tags: Tag,
                      };
                      const labelMap: Record<string, string> = {
                        financial: 'Financeiro',
                        crm: 'CRM',
                        pipeline: 'Pipeline',
                        tasks: 'Tarefas',
                        onboarding: 'Onboarding',
                        content: 'Conteúdo',
                        categories: 'Categorias',
                        tags: 'Tags',
                      };
                      const Icon = iconMap[key] || FileText;
                      return (
                        <div
                          key={key}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition-all',
                            isDone ? 'bg-green-50 text-green-700' :
                            isCurrent ? 'bg-red-50 text-red-700 font-medium' :
                            'bg-gray-50 text-gray-400',
                          )}
                        >
                          {isDone ? (
                            <CheckSquare className="h-4 w-4 text-green-500" />
                          ) : isCurrent ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                          <span>{labelMap[key] || key}</span>
                          {isDone && <span className="ml-auto text-xs text-green-500">Concluído</span>}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {resetStep === 'done' && resetResult && (
            <div className="rounded-xl border-2 border-green-300 bg-white p-6 shadow-sm">
              {/* Success header */}
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckSquare className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-green-800">
                  Dados removidos com sucesso!
                </h2>
                <p className="mt-1 text-sm text-green-600">
                  Todos os dados selecionados foram apagados permanentemente.
                </p>
                <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700">
                  <Trash2 className="h-4 w-4" />
                  {Object.values(resetResult).reduce((a, b) => a + b, 0)} registros removidos
                </div>
              </div>

              {/* Results summary */}
              <div className="mb-6 rounded-lg bg-gray-50 p-4">
                <p className="mb-3 text-sm font-medium text-gray-700">Resumo da exclusão:</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(resetResult).map(([key, count]) => {
                    const labels: Record<string, string> = {
                      invoices: 'Faturas',
                      expenses: 'Despesas',
                      contracts: 'Contratos',
                      expenseCategories: 'Categorias',
                      costCenters: 'Centros de Custo',
                      tagAssignments: 'Associações de Tags',
                      tags: 'Tags',
                      comments: 'Comentários',
                      tasks: 'Tarefas',
                      onboardingItems: 'Itens de Onboarding',
                      onboardingSections: 'Seções de Onboarding',
                      onboardings: 'Onboardings',
                      templateItems: 'Itens de Template',
                      templateSections: 'Seções de Template',
                      onboardingTemplates: 'Templates',
                      contentVersions: 'Versões de Conteúdo',
                      contentPosts: 'Posts',
                      contentIdeas: 'Ideias',
                      contentProfiles: 'Perfis de Conteúdo',
                      activities: 'Atividades',
                      dealContacts: 'Contatos de Deal',
                      deals: 'Deals',
                      leads: 'Leads',
                      contacts: 'Contatos',
                      companies: 'Empresas',
                      pipelineStages: 'Estágios de Pipeline',
                      pipelines: 'Pipelines',
                    };
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm"
                      >
                        <span className="text-gray-600">{labels[key] || key}</span>
                        <span className="font-semibold text-gray-900">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => {
                  setResetStep('select');
                  setResetResult(null);
                  setConfirmText('');
                  setResetOptions({
                    financial: false,
                    crm: false,
                    pipeline: false,
                    tasks: false,
                    onboarding: false,
                    content: false,
                    categories: false,
                    tags: false,
                  });
                }}
                className={btnPrimary + ' w-full'}
              >
                Voltar para configurações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
