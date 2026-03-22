import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto, LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
      });

      const org = await tx.organization.create({
        data: {
          name: dto.organizationName || `${dto.firstName}'s Workspace`,
          slug: this.generateSlug(dto.organizationName || dto.firstName),
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: newUser.id,
          role: 'OWNER',
        },
      });

      // Create default pipeline
      const pipeline = await tx.pipeline.create({
        data: {
          organizationId: org.id,
          name: 'Pipeline Principal',
          isDefault: true,
        },
      });

      const stages = [
        { name: 'Novo Lead', color: '#6B7280', position: 0, probability: 10 },
        { name: 'Qualificação', color: '#3B82F6', position: 1, probability: 25 },
        { name: 'Proposta', color: '#F59E0B', position: 2, probability: 50 },
        { name: 'Negociação', color: '#8B5CF6', position: 3, probability: 75 },
        { name: 'Fechamento', color: '#10B981', position: 4, probability: 90 },
      ];

      for (const stage of stages) {
        await tx.pipelineStage.create({
          data: { pipelineId: pipeline.id, ...stage },
        });
      }

      return { user: newUser, organization: org };
    });

    const token = this.generateToken(user.user.id);

    return {
      token,
      user: {
        id: user.user.id,
        email: user.user.email,
        firstName: user.user.firstName,
        lastName: user.user.lastName,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slug: user.organization.slug,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: {
          include: { organization: true },
          take: 1,
        },
      },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = this.generateToken(user.id);
    const membership = user.memberships[0];

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      organization: membership
        ? {
            id: membership.organization.id,
            name: membership.organization.name,
            slug: membership.organization.slug,
            role: membership.role,
            modulePermissions: membership.modulePermissions || null,
          }
        : null,
    };
  }

  private generateToken(userId: string): string {
    return this.jwtService.sign({ sub: userId });
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
  }
}
