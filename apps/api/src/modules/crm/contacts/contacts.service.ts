import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, data: {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    position?: string;
    companyId?: string;
  }) {
    return this.prisma.contact.create({
      data: { organizationId, ...data },
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async findAll(organizationId: string, search?: string) {
    const where: any = { organizationId };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.contact.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { leads: true, deals: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findById(organizationId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId },
      include: {
        company: true,
        leads: { include: { deals: { include: { stage: true } } } },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!contact) throw new NotFoundException('Contato não encontrado');
    return contact;
  }

  async update(organizationId: string, id: string, data: Record<string, any>) {
    const contact = await this.prisma.contact.findFirst({ where: { id, organizationId } });
    if (!contact) throw new NotFoundException('Contato não encontrado');
    return this.prisma.contact.update({ where: { id }, data });
  }
}
