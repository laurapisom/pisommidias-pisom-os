import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { ResetDataDto } from './dto/reset-data.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private orgService: OrganizationsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Dados da organização atual' })
  getCurrent(@CurrentUser() user: any) {
    return this.orgService.findById(user.organizationId);
  }

  @Patch('current')
  @ApiOperation({ summary: 'Atualizar organização' })
  update(@CurrentUser() user: any, @Body() body: { name?: string; logo?: string }) {
    return this.orgService.update(user.organizationId, body);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Resetar dados da organização seletivamente' })
  reset(@CurrentUser() user: any, @Body() body: ResetDataDto) {
    return this.orgService.resetData(user.organizationId, body);
  }
}
