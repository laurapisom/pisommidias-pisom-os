import { Controller, Get, UseGuards } from '@nestjs/common';
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

  @Get('team')
  @ApiOperation({ summary: 'Membros da organização' })
  getTeam(@CurrentUser() user: any) {
    return this.usersService.getOrganizationMembers(user.organizationId);
  }
}
