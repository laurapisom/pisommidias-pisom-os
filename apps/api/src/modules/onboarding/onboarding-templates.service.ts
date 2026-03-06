import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTemplateDto } from './onboarding.dto';

@Injectable()
export class OnboardingTemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateTemplateDto) {
    return this.prisma.onboardingTemplate.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        serviceType: dto.serviceType as any,
        sections: dto.sections
          ? {
              create: dto.sections.map((section, si) => ({
                name: section.name,
                description: section.description,
                position: si,
                items: section.items
                  ? {
                      create: section.items.map((item, ii) => ({
                        title: item.title,
                        description: item.description,
                        itemType: (item.itemType as any) || 'CHECKBOX',
                        isRequired: item.isRequired ?? true,
                        position: ii,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        sections: {
          include: { items: { orderBy: { position: 'asc' } } },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async findAll(organizationId: string, serviceType?: string) {
    const where: any = { organizationId, isActive: true };
    if (serviceType) where.serviceType = serviceType;

    return this.prisma.onboardingTemplate.findMany({
      where,
      include: {
        sections: {
          include: { items: { orderBy: { position: 'asc' } } },
          orderBy: { position: 'asc' },
        },
        _count: { select: { onboardings: true } },
      },
      orderBy: { position: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const template = await this.prisma.onboardingTemplate.findFirst({
      where: { id, organizationId },
      include: {
        sections: {
          include: { items: { orderBy: { position: 'asc' } } },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!template) throw new NotFoundException('Template não encontrado');
    return template;
  }

  async seedDefaults(organizationId: string) {
    const existing = await this.prisma.onboardingTemplate.count({ where: { organizationId } });
    if (existing > 0) return;

    const templates = [
      {
        name: 'Onboarding - Tráfego Pago',
        serviceType: 'TRAFEGO_PAGO' as const,
        description: 'Checklist completo para início de gestão de tráfego pago',
        sections: [
          {
            name: 'Acessos e Contas',
            items: [
              { title: 'Acesso ao Gerenciador de Anúncios (Meta)', itemType: 'CREDENTIAL' },
              { title: 'Acesso ao Google Ads', itemType: 'CREDENTIAL' },
              { title: 'Pixel do Facebook instalado e verificado', itemType: 'CHECKBOX' },
              { title: 'Google Tag Manager configurado', itemType: 'CHECKBOX' },
              { title: 'Conversões do Google Ads configuradas', itemType: 'CHECKBOX' },
              { title: 'Google Analytics vinculado', itemType: 'URL_INPUT' },
            ],
          },
          {
            name: 'Briefing e Estratégia',
            items: [
              { title: 'Público-alvo definido (personas)', itemType: 'CHECKBOX' },
              { title: 'Objetivo principal da campanha', itemType: 'TEXT_INPUT' },
              { title: 'Orçamento mensal definido (R$)', itemType: 'TEXT_INPUT' },
              { title: 'Concorrentes mapeados', itemType: 'TEXT_INPUT' },
              { title: 'Histórico de campanhas anteriores', itemType: 'FILE_UPLOAD', isRequired: false },
              { title: 'Metas (CPL, CPA, ROAS esperado)', itemType: 'TEXT_INPUT' },
            ],
          },
          {
            name: 'Criativos e Landing Pages',
            items: [
              { title: 'Manual de marca / Identidade Visual', itemType: 'FILE_UPLOAD' },
              { title: 'Landing page principal (URL)', itemType: 'URL_INPUT' },
              { title: 'Materiais de referência (criativos que performaram)', itemType: 'FILE_UPLOAD', isRequired: false },
              { title: 'Textos/copy base aprovados', itemType: 'FILE_UPLOAD', isRequired: false },
            ],
          },
          {
            name: 'Termos e Aceites',
            items: [
              { title: 'Contrato de prestação de serviço assinado', itemType: 'SIGNATURE' },
              { title: 'Termo de responsabilidade sobre verba de mídia', itemType: 'SIGNATURE' },
              { title: 'Aceite do prazo de ramp-up (30-90 dias)', itemType: 'CHECKBOX' },
            ],
          },
        ],
      },
      {
        name: 'Onboarding - Social Media',
        serviceType: 'SOCIAL_MEDIA' as const,
        description: 'Checklist para gestão de redes sociais',
        sections: [
          {
            name: 'Acessos',
            items: [
              { title: 'Acesso à página do Facebook (admin)', itemType: 'CREDENTIAL' },
              { title: 'Acesso ao Instagram (login)', itemType: 'CREDENTIAL' },
              { title: 'Acesso ao LinkedIn Company Page', itemType: 'CREDENTIAL', isRequired: false },
              { title: 'Acesso ao TikTok Business', itemType: 'CREDENTIAL', isRequired: false },
              { title: 'Ferramenta de agendamento configurada', itemType: 'CHECKBOX' },
            ],
          },
          {
            name: 'Briefing e Tom de Voz',
            items: [
              { title: 'Manual de marca / Identidade Visual', itemType: 'FILE_UPLOAD' },
              { title: 'Tom de voz definido', itemType: 'TEXT_INPUT' },
              { title: 'Palavras/termos proibidos', itemType: 'TEXT_INPUT', isRequired: false },
              { title: 'Referências visuais (perfis que gostam)', itemType: 'TEXT_INPUT' },
              { title: 'Frequência de postagem acordada', itemType: 'TEXT_INPUT' },
              { title: 'Categorias de conteúdo definidas', itemType: 'TEXT_INPUT' },
            ],
          },
          {
            name: 'Materiais Base',
            items: [
              { title: 'Fotos do negócio/produto/equipe', itemType: 'FILE_UPLOAD' },
              { title: 'Vídeos institucionais', itemType: 'FILE_UPLOAD', isRequired: false },
              { title: 'Logos em alta resolução (PNG/SVG)', itemType: 'FILE_UPLOAD' },
              { title: 'Paleta de cores e fontes', itemType: 'FILE_UPLOAD' },
            ],
          },
          {
            name: 'Termos',
            items: [
              { title: 'Contrato assinado', itemType: 'SIGNATURE' },
              { title: 'Fluxo de aprovação definido (quem aprova)', itemType: 'TEXT_INPUT' },
              { title: 'SLA de aprovação acordado (ex: 48h)', itemType: 'TEXT_INPUT' },
            ],
          },
        ],
      },
      {
        name: 'Onboarding - Website',
        serviceType: 'WEBSITE' as const,
        description: 'Checklist para desenvolvimento de site',
        sections: [
          {
            name: 'Acessos',
            items: [
              { title: 'Acesso ao domínio/registrador', itemType: 'CREDENTIAL' },
              { title: 'Acesso à hospedagem', itemType: 'CREDENTIAL' },
              { title: 'Acesso ao painel atual (se existir)', itemType: 'CREDENTIAL', isRequired: false },
              { title: 'Emails do domínio (configuração desejada)', itemType: 'TEXT_INPUT' },
            ],
          },
          {
            name: 'Briefing do Projeto',
            items: [
              { title: 'Objetivo do site', itemType: 'TEXT_INPUT' },
              { title: 'Páginas necessárias (listar)', itemType: 'TEXT_INPUT' },
              { title: 'Sites de referência (URLs)', itemType: 'TEXT_INPUT' },
              { title: 'Funcionalidades específicas', itemType: 'TEXT_INPUT' },
              { title: 'Integrações necessárias (WhatsApp, forms, pagamento)', itemType: 'TEXT_INPUT' },
            ],
          },
          {
            name: 'Conteúdo e Materiais',
            items: [
              { title: 'Textos para cada página', itemType: 'FILE_UPLOAD' },
              { title: 'Fotos em alta resolução', itemType: 'FILE_UPLOAD' },
              { title: 'Logo em alta resolução', itemType: 'FILE_UPLOAD' },
              { title: 'Manual de marca', itemType: 'FILE_UPLOAD', isRequired: false },
              { title: 'Depoimentos de clientes', itemType: 'TEXT_INPUT', isRequired: false },
            ],
          },
          {
            name: 'Termos',
            items: [
              { title: 'Contrato assinado', itemType: 'SIGNATURE' },
              { title: 'Prazo de entrega acordado', itemType: 'DATE' },
              { title: 'Número de revisões inclusas', itemType: 'TEXT_INPUT' },
            ],
          },
        ],
      },
    ];

    for (const tmpl of templates) {
      await this.create(organizationId, {
        name: tmpl.name,
        serviceType: tmpl.serviceType,
        description: tmpl.description,
        sections: tmpl.sections.map((section) => ({
          name: section.name,
          items: section.items.map((item) => ({
            title: item.title,
            itemType: item.itemType,
            isRequired: (item as any).isRequired ?? true,
          })),
        })),
      });
    }
  }
}
