import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OnboardingTemplatesService } from './onboarding-templates.service';
import { CreateTemplateDto } from './onboarding.dto';

@ApiTags('Onboarding Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding-templates')
export class OnboardingTemplatesController {
  constructor(private templatesService: OnboardingTemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar template de onboarding' })
  create(@CurrentUser() user: any, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(user.organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar templates' })
  findAll(@CurrentUser() user: any, @Query('serviceType') serviceType?: string) {
    return this.templatesService.findAll(user.organizationId, serviceType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do template' })
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.templatesService.findById(user.organizationId, id);
  }

  @Post('seed-defaults')
  @ApiOperation({ summary: 'Criar templates padrão (Tráfego, Social, Website)' })
  seedDefaults(@CurrentUser() user: any) {
    return this.templatesService.seedDefaults(user.organizationId);
  }
}
