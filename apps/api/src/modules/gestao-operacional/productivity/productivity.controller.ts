import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ProductivityService } from './productivity.service';
import { GestaoPermissionGuard } from '../guards/gestao-permission.guard';
import { RequireGestaoPermission } from '../guards/gestao-permission.decorator';

@ApiTags('Gestão Operacional - Produtividade')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gestao-operacional/productivity')
export class ProductivityController {
  constructor(private productivityService: ProductivityService) {}

  @Get()
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('ver_produtividade')
  @ApiOperation({ summary: 'Estatísticas de produtividade da organização' })
  getOrgStats(
    @CurrentUser() user: any,
    @Query('period') period?: string,
    @Query('boardId') boardId?: string,
  ) {
    return this.productivityService.getOrgStats(user.organizationId, period, boardId);
  }

  @Get('ranking')
  @UseGuards(GestaoPermissionGuard)
  @RequireGestaoPermission('ver_produtividade')
  @ApiOperation({ summary: 'Ranking de produtividade' })
  getRanking(@CurrentUser() user: any, @Query('period') period?: string) {
    return this.productivityService.getUserRanking(user.organizationId, period);
  }

  @Get('me')
  @ApiOperation({ summary: 'Minha produtividade' })
  getMyStats(@CurrentUser() user: any, @Query('period') period?: string) {
    return this.productivityService.getMyStats(user.organizationId, user.id, period);
  }
}
