'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Lock,
  Upload,
  Link as LinkIcon,
  Type,
  Calendar,
  PenTool,
  ChevronDown,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCheck,
  Clock,
} from 'lucide-react';

const itemTypeIcons: Record<string, any> = {
  CHECKBOX: CheckCircle2,
  TEXT_INPUT: Type,
  FILE_UPLOAD: Upload,
  URL_INPUT: LinkIcon,
  CREDENTIAL: Lock,
  SELECT: ChevronDown,
  DATE: Calendar,
  SIGNATURE: PenTool,
};

const itemTypeLabels: Record<string, string> = {
  CHECKBOX: 'Checkbox',
  TEXT_INPUT: 'Texto',
  FILE_UPLOAD: 'Arquivo',
  URL_INPUT: 'URL',
  CREDENTIAL: 'Credencial',
  SELECT: 'Seleção',
  DATE: 'Data',
  SIGNATURE: 'Assinatura',
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pendente', color: 'text-gray-600', bg: 'bg-gray-100' },
  IN_PROGRESS: { label: 'Em andamento', color: 'text-blue-600', bg: 'bg-blue-100' },
  WAITING_CLIENT: { label: 'Aguardando cliente', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  REVIEW: { label: 'Em revisão', color: 'text-purple-600', bg: 'bg-purple-100' },
  COMPLETED: { label: 'Concluído', color: 'text-green-600', bg: 'bg-green-100' },
  CANCELLED: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-100' },
};

export default function OnboardingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [onboarding, setOnboarding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const loadOnboarding = useCallback(async () => {
    try {
      const data = await api.getOnboarding(id);
      setOnboarding(data);
      // Expand all sections by default
      setExpandedSections(new Set(data.sections?.map((s: any) => s.id) || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOnboarding();
  }, [loadOnboarding]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleToggleItem = async (itemId: string, currentCompleted: boolean) => {
    try {
      await api.updateOnboardingItem(id, itemId, { isCompleted: !currentCompleted });
      loadOnboarding();
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemValue = async (itemId: string, value: string) => {
    try {
      await api.updateOnboardingItem(id, itemId, { value });
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemNotes = async (itemId: string, notes: string) => {
    try {
      await api.updateOnboardingItem(id, itemId, { notes });
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.updateOnboarding(id, { status: newStatus });
      loadOnboarding();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return;
    try {
      await api.addOnboardingSection(id, { name: newSectionName });
      setNewSectionName('');
      setShowAddSection(false);
      loadOnboarding();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-pulse text-gray-500">Carregando onboarding...</div>
      </div>
    );
  }

  if (!onboarding) {
    return <div className="text-center text-gray-500">Onboarding não encontrado</div>;
  }

  const status = statusConfig[onboarding.status] || statusConfig.PENDING;
  const progress = onboarding.progress;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <button
        onClick={() => router.push('/onboarding')}
        className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para lista
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{onboarding.title}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className={cn('rounded-full px-3 py-1 text-xs font-medium', status.bg, status.color)}>
              {status.label}
            </span>
            {onboarding.responsible && (
              <span className="text-sm text-gray-500">
                Responsável: {onboarding.responsible.firstName} {onboarding.responsible.lastName}
              </span>
            )}
            {onboarding.dueDate && (
              <span className={cn(
                'text-sm',
                new Date(onboarding.dueDate) < new Date() && onboarding.status !== 'COMPLETED'
                  ? 'font-medium text-red-600'
                  : 'text-gray-500',
              )}>
                Prazo: {new Date(onboarding.dueDate).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex gap-2">
          {onboarding.status !== 'COMPLETED' && (
            <>
              <button
                onClick={() => handleStatusChange('WAITING_CLIENT')}
                className="rounded-lg border border-yellow-300 px-3 py-2 text-xs font-medium text-yellow-700 hover:bg-yellow-50"
              >
                Aguardando cliente
              </button>
              <button
                onClick={() => handleStatusChange('COMPLETED')}
                className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
              >
                Concluir
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-gray-500">Progresso geral</p>
              <p className="text-3xl font-bold text-gray-900">{progress.percentage}%</p>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCheck className="h-4 w-4 text-green-500" />
                <span className="text-gray-600">{progress.completed}/{progress.total} concluídos</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-gray-600">
                  {progress.requiredCompleted}/{progress.requiredTotal} obrigatórios
                </span>
              </div>
              {progress.isReadyToOperate && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600">Pronto para operar</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              progress.percentage === 100 ? 'bg-green-500' :
              progress.percentage > 50 ? 'bg-pisom-500' : 'bg-yellow-500',
            )}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Notes */}
      {onboarding.notes && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-medium text-gray-700">Observações</h3>
          <p className="text-sm text-gray-600">{onboarding.notes}</p>
        </div>
      )}

      {/* Sections & Checklist */}
      <div className="space-y-4">
        {onboarding.sections?.map((section: any) => {
          const isExpanded = expandedSections.has(section.id);
          const sectionCompleted = section.items.filter((i: any) => i.isCompleted).length;
          const sectionTotal = section.items.length;

          return (
            <div key={section.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center gap-3 p-4"
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">{section.name}</h3>
                  {section.description && (
                    <p className="mt-0.5 text-sm text-gray-500">{section.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {sectionCompleted}/{sectionTotal}
                  </span>
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        sectionCompleted === sectionTotal ? 'bg-green-500' : 'bg-pisom-500',
                      )}
                      style={{ width: sectionTotal > 0 ? `${(sectionCompleted / sectionTotal) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-2">
                  {section.items.map((item: any) => {
                    const ItemIcon = itemTypeIcons[item.itemType] || Circle;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-start gap-3 rounded-lg px-3 py-3 transition hover:bg-gray-50',
                          item.isCompleted && 'opacity-70',
                        )}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleItem(item.id, item.isCompleted)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {item.isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300 hover:text-gray-400" />
                          )}
                        </button>

                        {/* Item Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-sm font-medium',
                                item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900',
                              )}
                            >
                              {item.title}
                            </span>
                            {item.isRequired && !item.isCompleted && (
                              <span className="text-xs text-red-500">*</span>
                            )}
                            <span className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                              <ItemIcon className="h-3 w-3" />
                              {itemTypeLabels[item.itemType]}
                            </span>
                          </div>

                          {item.description && (
                            <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
                          )}

                          {/* Input based on item type */}
                          {!item.isCompleted && (
                            <div className="mt-2">
                              {item.itemType === 'TEXT_INPUT' && (
                                <input
                                  defaultValue={item.value || ''}
                                  onBlur={(e) => handleItemValue(item.id, e.target.value)}
                                  placeholder="Digite aqui..."
                                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-pisom-500 focus:outline-none"
                                />
                              )}
                              {item.itemType === 'URL_INPUT' && (
                                <input
                                  type="url"
                                  defaultValue={item.value || ''}
                                  onBlur={(e) => handleItemValue(item.id, e.target.value)}
                                  placeholder="https://..."
                                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-pisom-500 focus:outline-none"
                                />
                              )}
                              {item.itemType === 'CREDENTIAL' && (
                                <div className="space-y-1">
                                  <input
                                    defaultValue={item.value || ''}
                                    onBlur={(e) => handleItemValue(item.id, e.target.value)}
                                    placeholder="Usuário / Email de acesso"
                                    className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-pisom-500 focus:outline-none"
                                  />
                                  <input
                                    defaultValue={item.notes || ''}
                                    onBlur={(e) => handleItemNotes(item.id, e.target.value)}
                                    placeholder="Observações (não coloque senhas aqui)"
                                    className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-pisom-500 focus:outline-none"
                                  />
                                </div>
                              )}
                              {item.itemType === 'FILE_UPLOAD' && (
                                <div className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 p-3">
                                  <Upload className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-500">
                                    {item.fileUrl ? 'Arquivo enviado' : 'Arraste ou clique para enviar'}
                                  </span>
                                </div>
                              )}
                              {item.itemType === 'DATE' && (
                                <input
                                  type="date"
                                  defaultValue={item.value || ''}
                                  onBlur={(e) => handleItemValue(item.id, e.target.value)}
                                  className="rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-pisom-500 focus:outline-none"
                                />
                              )}
                              {item.itemType === 'SIGNATURE' && (
                                <button className="rounded-md border border-pisom-300 px-3 py-1.5 text-sm font-medium text-pisom-600 hover:bg-pisom-50">
                                  Solicitar assinatura
                                </button>
                              )}
                            </div>
                          )}

                          {/* Completed info */}
                          {item.isCompleted && item.completedBy && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              Concluído por {item.completedBy.firstName} {item.completedBy.lastName}
                              {item.completedAt &&
                                ` em ${new Date(item.completedAt).toLocaleDateString('pt-BR')}`}
                            </p>
                          )}

                          {item.isCompleted && item.value && (
                            <p className="mt-1 text-xs text-gray-500">
                              Valor: {item.value}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Add Section */}
        {showAddSection ? (
          <div className="rounded-xl border-2 border-dashed border-pisom-300 bg-white p-4">
            <input
              autoFocus
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSection();
                if (e.key === 'Escape') setShowAddSection(false);
              }}
              placeholder="Nome da seção..."
              className="w-full border-none bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleAddSection}
                className="rounded-lg bg-pisom-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-pisom-700"
              >
                Adicionar Seção
              </button>
              <button
                onClick={() => setShowAddSection(false)}
                className="rounded-lg px-4 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddSection(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500 transition hover:border-pisom-300 hover:text-pisom-600"
          >
            <Plus className="h-4 w-4" />
            Adicionar seção
          </button>
        )}
      </div>

      {/* Terms acceptance */}
      {!onboarding.acceptedTermsAt && onboarding.status !== 'COMPLETED' && (
        <div className="mt-8 rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <h3 className="font-medium text-yellow-800">Aceite de termos pendente</h3>
          <p className="mt-1 text-sm text-yellow-700">
            O cliente ainda não aceitou os termos deste onboarding.
          </p>
          <button
            onClick={async () => {
              await api.acceptOnboardingTerms(id);
              loadOnboarding();
            }}
            className="mt-3 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
          >
            Registrar aceite
          </button>
        </div>
      )}

      {onboarding.acceptedTermsAt && (
        <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Termos aceitos em {new Date(onboarding.acceptedTermsAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
}
