import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, data: {
    title: string;
    description?: string;
    assigneeId?: string;
    dealId?: string;
    priority?: string;
    dueDate?: string;
    slaDeadline?: string;
  }) {
    return this.prisma.task.create({
      data: {
        organizationId,
        createdById: userId,
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId,
        dealId: data.dealId,
        priority: (data.priority as any) || 'MEDIUM',
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        slaDeadline: data.slaDeadline ? new Date(data.slaDeadline) : undefined,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        deal: { select: { id: true, title: true } },
      },
    });
  }

  async findAll(organizationId: string, filters?: {
    status?: string;
    assigneeId?: string;
    dealId?: string;
    priority?: string;
  }) {
    const where: any = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters?.dealId) where.dealId = filters.dealId;
    if (filters?.priority) where.priority = filters.priority;

    return this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        deal: { select: { id: true, title: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  async updateStatus(organizationId: string, id: string, status: string) {
    const task = await this.prisma.task.findFirst({ where: { id, organizationId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');

    return this.prisma.task.update({
      where: { id },
      data: {
        status: status as any,
        completedAt: status === 'DONE' ? new Date() : null,
      },
    });
  }

  async getMyTasks(organizationId: string, userId: string) {
    return this.prisma.task.findMany({
      where: {
        organizationId,
        assigneeId: userId,
        status: { not: 'CANCELLED' },
      },
      include: {
        deal: { select: { id: true, title: true } },
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  async getOverdueTasks(organizationId: string) {
    return this.prisma.task.findMany({
      where: {
        organizationId,
        status: { in: ['TODO', 'IN_PROGRESS', 'WAITING'] },
        dueDate: { lt: new Date() },
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
