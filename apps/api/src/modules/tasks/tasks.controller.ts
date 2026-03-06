import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Criar tarefa' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.tasksService.create(user.organizationId, user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tarefas' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('dealId') dealId?: string,
    @Query('priority') priority?: string,
  ) {
    return this.tasksService.findAll(user.organizationId, { status, assigneeId, dealId, priority });
  }

  @Get('my')
  @ApiOperation({ summary: 'Minhas tarefas' })
  getMyTasks(@CurrentUser() user: any) {
    return this.tasksService.getMyTasks(user.organizationId, user.id);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Tarefas atrasadas' })
  getOverdue(@CurrentUser() user: any) {
    return this.tasksService.getOverdueTasks(user.organizationId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status da tarefa' })
  updateStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { status: string }) {
    return this.tasksService.updateStatus(user.organizationId, id, body.status);
  }
}
