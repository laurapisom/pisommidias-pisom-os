import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// Default module permissions for new members
const DEFAULT_MODULE_PERMISSIONS = {
  dashboard: true,
  crm: true,
  onboarding: true,
  tasks: true,
  financial: false,
  settings: false,
  collaborators: false,
};

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
            modulePermissions: true,
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
      modulePermissions: membership?.modulePermissions || DEFAULT_MODULE_PERMISSIONS,
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
            phone: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMe(userId: string, data: { firstName?: string; lastName?: string; phone?: string; currentPassword?: string; newPassword?: string }) {
    const updateData: any = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;

    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new BadRequestException('Senha atual é obrigatória para alterar a senha');
      }
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('Usuário não encontrado');
      const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!valid) throw new BadRequestException('Senha atual incorreta');
      updateData.passwordHash = await bcrypt.hash(data.newPassword, 10);
    }

    return this.prisma.user.update({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
      data: updateData,
    });
  }

  async inviteMember(organizationId: string, data: { email: string; firstName: string; lastName: string; password?: string; role?: string; modulePermissions?: any }) {
    // Check if user already exists
    let user = await this.prisma.user.findUnique({ where: { email: data.email } });

    if (user) {
      // Check if already a member
      const existing = await this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.id } },
      });
      if (existing) throw new BadRequestException('Este usuário já é membro da organização');
    } else {
      // Create user with password provided by admin, or a random temp password
      const passwordHash = await bcrypt.hash(data.password || Math.random().toString(36).slice(-8), 10);
      user = await this.prisma.user.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          passwordHash,
        },
      });
    }

    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId,
        userId: user.id,
        role: (data.role as any) || 'MEMBER',
        modulePermissions: data.modulePermissions || DEFAULT_MODULE_PERMISSIONS,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isActive: true,
            phone: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
    });

    return member;
  }

  async updateMemberRole(organizationId: string, memberId: string, role: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    if (member.role === 'OWNER') throw new ForbiddenException('Não é possível alterar o papel do proprietário');

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: role as any },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, avatar: true, isActive: true },
        },
      },
    });
  }

  async updateMemberPermissions(organizationId: string, memberId: string, modulePermissions: any) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { modulePermissions },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, avatar: true, isActive: true },
        },
      },
    });
  }

  async removeMember(organizationId: string, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    if (member.role === 'OWNER') throw new ForbiddenException('Não é possível remover o proprietário');

    await this.prisma.organizationMember.delete({ where: { id: memberId } });
    return { success: true };
  }

  async toggleMemberActive(organizationId: string, memberId: string, isActive: boolean) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
      include: { user: true },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    if (member.role === 'OWNER') throw new ForbiddenException('Não é possível desativar o proprietário');

    await this.prisma.user.update({
      where: { id: member.userId },
      data: { isActive },
    });

    return { success: true, isActive };
  }

  async resetMemberPassword(organizationId: string, memberId: string, password: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    if (member.role === 'OWNER') throw new ForbiddenException('Não é possível alterar a senha do proprietário por aqui');

    if (!password || password.length < 6) {
      throw new BadRequestException('A senha deve ter pelo menos 6 caracteres');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: member.userId },
      data: { passwordHash },
    });

    return { success: true };
  }
}
