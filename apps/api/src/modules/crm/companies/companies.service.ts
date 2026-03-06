import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, data: {
    name: string;
    domain?: string;
    cnpj?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    industry?: string;
    size?: string;
  }) {
    return this.prisma.company.create({ data: { organizationId, ...data } });
  }

  async findAll(organizationId: string, search?: string) {
    const where: any = { organizationId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search } },
      ];
    }

    return this.prisma.company.findMany({
      where,
      include: {
        _count: { select: { contacts: true, deals: true, leads: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, organizationId },
      include: {
        contacts: { select: { id: true, firstName: true, lastName: true, email: true, position: true } },
        deals: { include: { stage: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return company;
  }

  async update(organizationId: string, id: string, data: Record<string, any>) {
    const company = await this.prisma.company.findFirst({ where: { id, organizationId } });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return this.prisma.company.update({ where: { id }, data });
  }
}
