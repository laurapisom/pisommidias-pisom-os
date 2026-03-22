import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
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
  update(@CurrentUser() user: any, @Body() body: { name?: string; logo?: string | null }) {
    return this.orgService.update(user.organizationId, body);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar organização (alias)' })
  updateMe(@CurrentUser() user: any, @Body() body: { name?: string; logo?: string | null }) {
    return this.orgService.update(user.organizationId, body);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Resetar dados da organização seletivamente' })
  reset(@CurrentUser() user: any, @Body() body: ResetDataDto) {
    return this.orgService.resetData(user.organizationId, body);
  }

  // ---- Job Titles (Cargos) ----

  @Get('job-titles')
  @ApiOperation({ summary: 'Listar cargos da organização' })
  getJobTitles(@CurrentUser() user: any) {
    return this.orgService.getJobTitles(user.organizationId);
  }

  @Post('job-titles')
  @ApiOperation({ summary: 'Criar cargo' })
  createJobTitle(@CurrentUser() user: any, @Body() body: { name: string; description?: string }) {
    return this.orgService.createJobTitle(user.organizationId, body);
  }

  @Patch('job-titles/:id')
  @ApiOperation({ summary: 'Atualizar cargo' })
  updateJobTitle(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; isActive?: boolean },
  ) {
    return this.orgService.updateJobTitle(user.organizationId, id, body);
  }

  @Delete('job-titles/:id')
  @ApiOperation({ summary: 'Excluir cargo' })
  deleteJobTitle(@CurrentUser() user: any, @Param('id') id: string) {
    return this.orgService.deleteJobTitle(user.organizationId, id);
  }
}
