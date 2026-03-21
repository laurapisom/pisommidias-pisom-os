import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
              },
            },
          },
          take: 1,
        },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const membership = user.memberships?.[0];
    return {
      ...user,
      memberships: undefined,
      organization: membership?.organization || null,
      role: membership?.role || null,
    };
  }

  async getOrganizationMembers(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isActive: true,
          },
        },
      },
    });
  }
}
