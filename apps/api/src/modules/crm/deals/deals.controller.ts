import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealDto, MoveDealDto } from './deals.dto';

@ApiTags('Deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(private dealsService: DealsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar negócio' })
  create(@CurrentUser() user: any, @Body() dto: CreateDealDto) {
    return this.dealsService.create(user.organizationId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar negócios' })
  findAll(
    @CurrentUser() user: any,
    @Query('pipelineId') pipelineId?: string,
    @Query('stageId') stageId?: string,
    @Query('status') status?: string,
    @Query('ownerId') ownerId?: string,
    @Query('search') search?: string,
  ) {
    return this.dealsService.findAll(user.organizationId, {
      pipelineId, stageId, status, ownerId, search,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo do pipeline' })
  getSummary(@CurrentUser() user: any, @Query('pipelineId') pipelineId?: string) {
    return this.dealsService.getSummary(user.organizationId, pipelineId);
  }

  @Get('kanban/:pipelineId')
  @ApiOperation({ summary: 'Visão Kanban do pipeline' })
  getKanban(@CurrentUser() user: any, @Param('pipelineId') pipelineId: string) {
    return this.dealsService.getKanbanView(user.organizationId, pipelineId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do negócio' })
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.dealsService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar negócio' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.update(user.organizationId, id, user.id, dto);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Mover negócio de etapa' })
  move(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: MoveDealDto) {
    return this.dealsService.moveStage(user.organizationId, id, user.id, dto);
  }

  @Patch(':id/won')
  @ApiOperation({ summary: 'Marcar como ganho' })
  markWon(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.dealsService.markWon(user.organizationId, id, user.id, body.reason);
  }

  @Patch(':id/lost')
  @ApiOperation({ summary: 'Marcar como perdido' })
  markLost(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.dealsService.markLost(user.organizationId, id, user.id, body.reason);
  }
}
