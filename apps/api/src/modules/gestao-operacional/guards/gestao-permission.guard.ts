import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GESTAO_PERMISSION_KEY } from './gestao-permission.decorator';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class GestaoPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<string>(GESTAO_PERMISSION_KEY, context.getHandler());
    if (!permission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Não autenticado');

    // OWNER and ADMIN bypass all granular checks
    if (user.role === 'OWNER' || user.role === 'ADMIN') return true;

    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: user.organizationId, userId: user.id },
      select: { role: true, modulePermissions: true },
    });

    if (!member) throw new ForbiddenException('Acesso negado');
    if (member.role === 'OWNER' || member.role === 'ADMIN') return true;

    const perms = (member.modulePermissions as Record<string, boolean>) || {};
    if (!perms['gestao_operacional']) throw new ForbiddenException('Módulo não habilitado');
    if (!perms[permission]) throw new ForbiddenException(`Permissão '${permission}' negada`);

    return true;
  }
}
