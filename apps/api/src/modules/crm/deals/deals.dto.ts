import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDealDto {
  @ApiProperty({ example: 'Site + Tráfego - Empresa X' })
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  pipelineId: string;

  @ApiProperty()
  @IsString()
  stageId: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  customFields?: Record<string, any>;
}

export class UpdateDealDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  customFields?: Record<string, any>;
}

export class MoveDealDto {
  @ApiProperty()
  @IsString()
  stageId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  position?: number;
}
