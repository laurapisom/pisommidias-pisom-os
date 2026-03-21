import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResetDataDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  financial: boolean = false;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  crm: boolean = false;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  pipeline: boolean = false;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  tasks: boolean = false;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  onboarding: boolean = false;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  content: boolean = false;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  categories: boolean = false;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  tags: boolean = false;
}
