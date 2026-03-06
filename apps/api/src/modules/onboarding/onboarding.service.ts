import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateOnboardingDto,
  UpdateOnboardingDto,
  UpdateOnboardingItemDto,
  AddSectionDto,
} from './onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateOnboardingDto) {
    // If a template is selected, clone its sections/items into the onboarding
    let sectionsData: any = undefined;

    if (dto.templateId) {
      const template = await this.prisma.onboardingTemplate.findFirst({
        where: { id: dto.templateId, organizationId },
        include: {
          sections: {
            include: { items: { orderBy: { position: 'asc' } } },
            orderBy: { position: 'asc' },
          },
        },
      });

      if (!template) throw new NotFoundException('Template não encontrado');

      sectionsData = {
        create: template.sections.map((section) => ({
          name: section.name,
          description: section.description,
          position: section.position,
          items: {
            create: section.items.map((item) => ({
              title: item.title,
              description: item.description,
              itemType: item.itemType,
              isRequired: item.isRequired,
              position: item.position,
              metadata: item.metadata,
            })),
          },
        })),
      };
    }

    const onboarding = await this.prisma.onboarding.create({
      data: {
        organizationId,
        templateId: dto.templateId,
        dealId: dto.dealId,
        companyId: dto.companyId,
        responsibleId: dto.responsibleId || userId,
        title: dto.title,
        serviceType: dto.serviceType as any,
        notes: dto.notes,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        sections: sectionsData,
      },
      include: this.fullInclude(),
    });

    return onboarding;
  }

  async findAll(organizationId: string, filters?: {
    status?: string;
    serviceType?: string;
    responsibleId?: string;
    search?: string;
  }) {
    const where: any = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.serviceType) where.serviceType = filters.serviceType;
    if (filters?.responsibleId) where.responsibleId = filters.responsibleId;
    if (filters?.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }

    const onboardings = await this.prisma.onboarding.findMany({
      where,
      include: {
        responsible: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        sections: {
          include: { items: { select: { id: true, isCompleted: true, isRequired: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate progress for each onboarding
    return onboardings.map((ob) => {
      const allItems = ob.sections.flatMap((s) => s.items);
      const totalItems = allItems.length;
      const completedItems = allItems.filter((i) => i.isCompleted).length;
      const requiredItems = allItems.filter((i) => i.isRequired);
      const completedRequired = requiredItems.filter((i) => i.isCompleted).length;

      return {
        ...ob,
        sections: undefined,
        progress: {
          total: totalItems,
          completed: completedItems,
          percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
          requiredTotal: requiredItems.length,
          requiredCompleted: completedRequired,
          isReadyToOperate: completedRequired === requiredItems.length && requiredItems.length > 0,
        },
      };
    });
  }

  async findById(organizationId: string, id: string) {
    const onboarding = await this.prisma.onboarding.findFirst({
      where: { id, organizationId },
      include: this.fullInclude(),
    });

    if (!onboarding) throw new NotFoundException('Onboarding não encontrado');

    const allItems = onboarding.sections.flatMap((s) => s.items);
    const totalItems = allItems.length;
    const completedItems = allItems.filter((i) => i.isCompleted).length;
    const requiredItems = allItems.filter((i) => i.isRequired);
    const completedRequired = requiredItems.filter((i) => i.isCompleted).length;

    return {
      ...onboarding,
      progress: {
        total: totalItems,
        completed: completedItems,
        percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        requiredTotal: requiredItems.length,
        requiredCompleted: completedRequired,
        isReadyToOperate: completedRequired === requiredItems.length && requiredItems.length > 0,
      },
    };
  }

  async update(organizationId: string, id: string, dto: UpdateOnboardingDto) {
    await this.ensureExists(organizationId, id);

    const data: any = {};
    if (dto.title) data.title = dto.title;
    if (dto.responsibleId) data.responsibleId = dto.responsibleId;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);

    if (dto.status) {
      data.status = dto.status;
      if (dto.status === 'IN_PROGRESS' && !data.startedAt) {
        data.startedAt = new Date();
      }
      if (dto.status === 'COMPLETED') {
        data.completedAt = new Date();
      }
    }

    return this.prisma.onboarding.update({
      where: { id },
      data,
      include: this.fullInclude(),
    });
  }

  async updateItem(organizationId: string, onboardingId: string, itemId: string, userId: string, dto: UpdateOnboardingItemDto) {
    await this.ensureExists(organizationId, onboardingId);

    const item = await this.prisma.onboardingItem.findFirst({
      where: { id: itemId, section: { onboardingId } },
    });
    if (!item) throw new NotFoundException('Item não encontrado');

    const data: any = {};
    if (dto.isCompleted !== undefined) {
      data.isCompleted = dto.isCompleted;
      data.completedAt = dto.isCompleted ? new Date() : null;
      data.completedById = dto.isCompleted ? userId : null;
    }
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.fileUrl !== undefined) data.fileUrl = dto.fileUrl;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.onboardingItem.update({
      where: { id: itemId },
      data,
      include: {
        completedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Auto-update onboarding status based on progress
    await this.autoUpdateStatus(onboardingId);

    return updated;
  }

  async addSection(organizationId: string, onboardingId: string, dto: AddSectionDto) {
    await this.ensureExists(organizationId, onboardingId);

    const maxPos = await this.prisma.onboardingSection.aggregate({
      where: { onboardingId },
      _max: { position: true },
    });

    return this.prisma.onboardingSection.create({
      data: {
        onboardingId,
        name: dto.name,
        description: dto.description,
        position: (maxPos._max.position ?? -1) + 1,
        items: dto.items
          ? {
              create: dto.items.map((item, i) => ({
                title: item.title,
                description: item.description,
                itemType: (item.itemType as any) || 'CHECKBOX',
                isRequired: item.isRequired ?? true,
                position: i,
              })),
            }
          : undefined,
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  }

  async acceptTerms(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);

    return this.prisma.onboarding.update({
      where: { id },
      data: { acceptedTermsAt: new Date() },
    });
  }

  async getSummary(organizationId: string) {
    const [pending, inProgress, waitingClient, completed, total] = await Promise.all([
      this.prisma.onboarding.count({ where: { organizationId, status: 'PENDING' } }),
      this.prisma.onboarding.count({ where: { organizationId, status: 'IN_PROGRESS' } }),
      this.prisma.onboarding.count({ where: { organizationId, status: 'WAITING_CLIENT' } }),
      this.prisma.onboarding.count({ where: { organizationId, status: 'COMPLETED' } }),
      this.prisma.onboarding.count({ where: { organizationId } }),
    ]);

    // Overdue onboardings
    const overdue = await this.prisma.onboarding.count({
      where: {
        organizationId,
        status: { in: ['PENDING', 'IN_PROGRESS', 'WAITING_CLIENT'] },
        dueDate: { lt: new Date() },
      },
    });

    return { pending, inProgress, waitingClient, completed, total, overdue };
  }

  private async autoUpdateStatus(onboardingId: string) {
    const onboarding = await this.prisma.onboarding.findUnique({
      where: { id: onboardingId },
      include: {
        sections: {
          include: { items: true },
        },
      },
    });

    if (!onboarding) return;

    const allItems = onboarding.sections.flatMap((s) => s.items);
    const requiredItems = allItems.filter((i) => i.isRequired);
    const allRequiredCompleted = requiredItems.every((i) => i.isCompleted);
    const anyCompleted = allItems.some((i) => i.isCompleted);

    let newStatus = onboarding.status;

    if (allRequiredCompleted && requiredItems.length > 0 && onboarding.status !== 'COMPLETED') {
      newStatus = 'REVIEW';
    } else if (anyCompleted && onboarding.status === 'PENDING') {
      newStatus = 'IN_PROGRESS';
    }

    if (newStatus !== onboarding.status) {
      await this.prisma.onboarding.update({
        where: { id: onboardingId },
        data: {
          status: newStatus as any,
          startedAt: newStatus === 'IN_PROGRESS' && !onboarding.startedAt ? new Date() : undefined,
        },
      });
    }
  }

  private async ensureExists(organizationId: string, id: string) {
    const onboarding = await this.prisma.onboarding.findFirst({ where: { id, organizationId } });
    if (!onboarding) throw new NotFoundException('Onboarding não encontrado');
    return onboarding;
  }

  private fullInclude() {
    return {
      responsible: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
      template: { select: { id: true, name: true } },
      sections: {
        orderBy: { position: 'asc' } as const,
        include: {
          items: {
            orderBy: { position: 'asc' } as const,
            include: {
              completedBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
          },
        },
      },
    };
  }
}
