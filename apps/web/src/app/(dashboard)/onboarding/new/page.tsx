'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, FileText } from 'lucide-react';
import { cn } from '@/lib/cn';

const serviceTypes = [
  { value: 'TRAFEGO_PAGO', label: 'Tráfego Pago', description: 'Google Ads, Meta Ads, mídia paga' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media', description: 'Gestão de redes sociais e conteúdo' },
  { value: 'WEBSITE', label: 'Website', description: 'Desenvolvimento de site ou landing page' },
  { value: 'CRM_AUTOMACAO', label: 'CRM/Automação', description: 'Implantação de CRM e automações' },
  { value: 'BRANDING', label: 'Branding', description: 'Identidade visual e marca' },
  { value: 'SEO', label: 'SEO', description: 'Otimização para buscadores' },
  { value: 'EMAIL_MARKETING', label: 'Email Marketing', description: 'Fluxos de email e newsletters' },
  { value: 'CONSULTORIA', label: 'Consultoria', description: 'Consultoria em marketing digital' },
  { value: 'CUSTOM', label: 'Personalizado', description: 'Definir checklist do zero' },
];

export default function NewOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    serviceType: '',
    templateId: '',
    dueDate: '',
    notes: '',
  });

  useEffect(() => {
    if (form.serviceType) {
      api.getOnboardingTemplates(form.serviceType).then(setTemplates).catch(console.error);
    }
  }, [form.serviceType]);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title || !form.serviceType) return;
    setLoading(true);

    try {
      const result = await api.createOnboarding({
        title: form.title,
        serviceType: form.serviceType,
        templateId: form.templateId || undefined,
        dueDate: form.dueDate || undefined,
        notes: form.notes || undefined,
      });
      router.push(`/onboarding/${result.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">Novo Onboarding</h1>
      <p className="mb-8 text-gray-500">Configure o onboarding do seu cliente passo a passo</p>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                step >= s ? 'bg-pisom-600 text-white' : 'bg-gray-200 text-gray-500',
              )}
            >
              {s}
            </div>
            <span className={cn('text-sm', step >= s ? 'font-medium text-gray-900' : 'text-gray-400')}>
              {s === 1 ? 'Serviço' : s === 2 ? 'Template' : 'Detalhes'}
            </span>
            {s < 3 && <div className="ml-2 h-px w-12 bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select service type */}
      {step === 1 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Qual tipo de serviço?</h2>
          <div className="grid grid-cols-2 gap-3">
            {serviceTypes.map((st) => (
              <button
                key={st.value}
                onClick={() => {
                  update('serviceType', st.value);
                  setStep(2);
                }}
                className={cn(
                  'rounded-xl border p-4 text-left transition hover:border-pisom-300 hover:shadow-md',
                  form.serviceType === st.value
                    ? 'border-pisom-500 bg-pisom-50'
                    : 'border-gray-200 bg-white',
                )}
              >
                <h3 className="font-medium text-gray-900">{st.label}</h3>
                <p className="mt-1 text-sm text-gray-500">{st.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Select template */}
      {step === 2 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Usar template?</h2>
          <div className="space-y-3">
            {templates.map((tmpl: any) => (
              <button
                key={tmpl.id}
                onClick={() => {
                  update('templateId', tmpl.id);
                  setStep(3);
                }}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition hover:border-pisom-300 hover:shadow-md',
                  form.templateId === tmpl.id
                    ? 'border-pisom-500 bg-pisom-50'
                    : 'border-gray-200 bg-white',
                )}
              >
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 text-pisom-500" />
                  <div>
                    <h3 className="font-medium text-gray-900">{tmpl.name}</h3>
                    {tmpl.description && (
                      <p className="mt-1 text-sm text-gray-500">{tmpl.description}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      {tmpl.sections?.length || 0} seções,{' '}
                      {tmpl.sections?.reduce((s: number, sec: any) => s + (sec.items?.length || 0), 0) || 0} itens
                    </p>
                  </div>
                </div>
              </button>
            ))}

            <button
              onClick={() => {
                update('templateId', '');
                setStep(3);
              }}
              className="w-full rounded-xl border border-dashed border-gray-300 p-4 text-left transition hover:border-pisom-300 hover:bg-gray-50"
            >
              <h3 className="font-medium text-gray-700">Começar do zero</h3>
              <p className="mt-1 text-sm text-gray-500">
                Criar onboarding vazio e adicionar itens manualmente
              </p>
            </button>

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setStep(1)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Detalhes do onboarding</h2>
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome do onboarding *
              </label>
              <input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Ex: Onboarding - Empresa X - Tráfego Pago"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Prazo</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => update('dueDate', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
              <textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={3}
                placeholder="Informações adicionais sobre o onboarding..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-pisom-500 focus:outline-none focus:ring-2 focus:ring-pisom-200"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.title || loading}
                className="flex-1 rounded-lg bg-pisom-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-pisom-700 disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar Onboarding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
