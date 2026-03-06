import { IsString, IsOptional, IsEnum, IsArray, ValidateNested, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOnboardingDto {
  @ApiProperty({ example: 'Onboarding - Empresa X - Tráfego Pago' })
  @IsString()
  title: string;

  @ApiProperty({ enum: ['TRAFEGO_PAGO', 'SOCIAL_MEDIA', 'WEBSITE', 'CRM_AUTOMACAO', 'BRANDING', 'SEO', 'EMAIL_MARKETING', 'CONSULTORIA', 'CUSTOM'] })
  @IsString()
  serviceType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateOnboardingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  responsibleId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateOnboardingItemDto {
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddSectionDto {
  @ApiProperty({ example: 'Acessos do Google Ads' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  items?: AddItemDto[];
}

export class AddItemDto {
  @ApiProperty({ example: 'Login do Google Ads' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['CHECKBOX', 'TEXT_INPUT', 'FILE_UPLOAD', 'URL_INPUT', 'CREDENTIAL', 'SELECT', 'DATE', 'SIGNATURE'] })
  @IsOptional()
  @IsString()
  itemType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class CreateTemplateDto {
  @ApiProperty({ example: 'Template - Tráfego Pago' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['TRAFEGO_PAGO', 'SOCIAL_MEDIA', 'WEBSITE', 'CRM_AUTOMACAO', 'BRANDING', 'SEO', 'EMAIL_MARKETING', 'CONSULTORIA', 'CUSTOM'] })
  @IsString()
  serviceType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  sections?: CreateTemplateSectionDto[];
}

export class CreateTemplateSectionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  items?: CreateTemplateItemDto[];
}

export class CreateTemplateItemDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  itemType?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
