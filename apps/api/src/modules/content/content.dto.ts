import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsArray } from 'class-validator';

export class CreatePostDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caption?: string;
  @ApiProperty() @IsString() channel: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profileId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() mediaUrls?: string[];
}

export class UpdatePostDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caption?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profileId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedToId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() mediaUrls?: string[];
}

export class UpdatePostStatusDto {
  @ApiProperty() @IsString() status: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
}

export class CreateIdeaDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profileId?: string;
}

export class CreateProfileDto {
  @ApiProperty() @IsString() clientName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandVoice?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() visualGuide?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetAudience?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() competitors?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hashtags?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() channels?: string[];
}

export class CreateVersionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caption?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
