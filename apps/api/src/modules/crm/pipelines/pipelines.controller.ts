import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PipelinesService } from './pipelines.service';

@ApiTags('Pipelines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pipelines')
export class PipelinesController {
  constructor(private pipelinesService: PipelinesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pipelines' })
  findAll(@CurrentUser() user: any) {
    return this.pipelinesService.findAll(user.organizationId);
  }

  @Get('default')
  @ApiOperation({ summary: 'Pipeline padrão' })
  getDefault(@CurrentUser() user: any) {
    return this.pipelinesService.getDefault(user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar pipeline' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.pipelinesService.create(user.organizationId, body);
  }
}
