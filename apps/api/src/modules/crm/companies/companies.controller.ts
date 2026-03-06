import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CompaniesService } from './companies.service';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar empresa' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.companiesService.create(user.organizationId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar empresas' })
  findAll(@CurrentUser() user: any, @Query('search') search?: string) {
    return this.companiesService.findAll(user.organizationId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes da empresa' })
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.companiesService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar empresa' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.companiesService.update(user.organizationId, id, body);
  }
}
