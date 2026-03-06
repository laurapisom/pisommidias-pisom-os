import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OnboardingService } from './onboarding.service';
import {
  CreateOnboardingDto,
  UpdateOnboardingDto,
  UpdateOnboardingItemDto,
  AddSectionDto,
} from './onboarding.dto';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  @Post()
  @ApiOperation({ summary: 'Criar onboarding (a partir de template ou do zero)' })
  create(@CurrentUser() user: any, @Body() dto: CreateOnboardingDto) {
    return this.onboardingService.create(user.organizationId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar onboardings' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('serviceType') serviceType?: string,
    @Query('responsibleId') responsibleId?: string,
    @Query('search') search?: string,
  ) {
    return this.onboardingService.findAll(user.organizationId, {
      status, serviceType, responsibleId, search,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo dos onboardings (contadores por status)' })
  getSummary(@CurrentUser() user: any) {
    return this.onboardingService.getSummary(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do onboarding com checklist completo' })
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.onboardingService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar onboarding (status, responsável, notas, prazo)' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateOnboardingDto) {
    return this.onboardingService.update(user.organizationId, id, dto);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Marcar/desmarcar item do checklist ou preencher valor' })
  updateItem(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOnboardingItemDto,
  ) {
    return this.onboardingService.updateItem(user.organizationId, id, itemId, user.id, dto);
  }

  @Post(':id/sections')
  @ApiOperation({ summary: 'Adicionar seção ao onboarding' })
  addSection(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: AddSectionDto) {
    return this.onboardingService.addSection(user.organizationId, id, dto);
  }

  @Patch(':id/accept-terms')
  @ApiOperation({ summary: 'Registrar aceite dos termos' })
  acceptTerms(@CurrentUser() user: any, @Param('id') id: string) {
    return this.onboardingService.acceptTerms(user.organizationId, id);
  }
}
