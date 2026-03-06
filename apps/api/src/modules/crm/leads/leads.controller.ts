import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar lead' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.leadsService.create(user.organizationId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar leads' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leadsService.findAll(user.organizationId, {
      status, source, search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do lead' })
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.leadsService.findById(user.organizationId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status do lead' })
  updateStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { status: string }) {
    return this.leadsService.updateStatus(user.organizationId, id, body.status);
  }
}
