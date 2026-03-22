import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Dados do usuário logado' })
  getMe(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar perfil do usuário logado' })
  updateMe(@CurrentUser() user: any, @Body() body: any) {
    return this.usersService.updateMe(user.id, body);
  }

  @Get('team')
  @ApiOperation({ summary: 'Membros da organização' })
  getTeam(@CurrentUser() user: any) {
    return this.usersService.getOrganizationMembers(user.organizationId);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Convidar novo colaborador' })
  inviteMember(@CurrentUser() user: any, @Body() body: any) {
    return this.usersService.inviteMember(user.organizationId, body);
  }

  @Patch('team/:memberId/role')
  @ApiOperation({ summary: 'Atualizar papel do membro' })
  updateMemberRole(
    @CurrentUser() user: any,
    @Param('memberId') memberId: string,
    @Body() body: { role: string },
  ) {
    return this.usersService.updateMemberRole(user.organizationId, memberId, body.role);
  }

  @Patch('team/:memberId/permissions')
  @ApiOperation({ summary: 'Atualizar permissões de módulos do membro' })
  updateMemberPermissions(
    @CurrentUser() user: any,
    @Param('memberId') memberId: string,
    @Body() body: { modulePermissions: any },
  ) {
    return this.usersService.updateMemberPermissions(user.organizationId, memberId, body.modulePermissions);
  }

  @Patch('team/:memberId/active')
  @ApiOperation({ summary: 'Ativar/desativar membro' })
  toggleMemberActive(
    @CurrentUser() user: any,
    @Param('memberId') memberId: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.usersService.toggleMemberActive(user.organizationId, memberId, body.isActive);
  }

  @Delete('team/:memberId')
  @ApiOperation({ summary: 'Remover membro da organização' })
  removeMember(
    @CurrentUser() user: any,
    @Param('memberId') memberId: string,
  ) {
    return this.usersService.removeMember(user.organizationId, memberId);
  }
}
