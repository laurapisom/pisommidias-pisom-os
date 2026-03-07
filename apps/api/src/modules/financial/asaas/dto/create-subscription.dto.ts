import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsObject,
  ValidateNested,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingType, DiscountDto, InterestDto, FineDto } from './create-payment.dto';

export enum SubscriptionCycle {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  BIMONTHLY = 'BIMONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMIANNUALLY = 'SEMIANNUALLY',
  YEARLY = 'YEARLY',
}

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'ID do cliente local (AsaasCustomer)' })
  @IsString()
  customerId: string;

  @ApiProperty({ enum: BillingType })
  @IsEnum(BillingType)
  billingType: BillingType;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  value: number;

  @ApiProperty({ enum: SubscriptionCycle })
  @IsEnum(SubscriptionCycle)
  cycle: SubscriptionCycle;

  @ApiProperty({ description: 'Data do próximo vencimento (YYYY-MM-DD)' })
  @IsDateString()
  nextDueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiPropertyOptional({ description: 'Data de encerramento (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Número máximo de cobranças' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPayments?: number;

  @ApiPropertyOptional({ type: DiscountDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DiscountDto)
  discount?: DiscountDto;

  @ApiPropertyOptional({ type: InterestDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => InterestDto)
  interest?: InterestDto;

  @ApiPropertyOptional({ type: FineDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FineDto)
  fine?: FineDto;

  @ApiPropertyOptional({ description: 'ID do contrato local para vincular' })
  @IsOptional()
  @IsString()
  localContractId?: string;

  @ApiPropertyOptional({ description: 'ID da recorrência local para vincular' })
  @IsOptional()
  @IsString()
  localRecurrenceId?: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: BillingType })
  @IsOptional()
  @IsEnum(BillingType)
  billingType?: BillingType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  value?: number;

  @ApiPropertyOptional({ enum: SubscriptionCycle })
  @IsOptional()
  @IsEnum(SubscriptionCycle)
  cycle?: SubscriptionCycle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPayments?: number;

  @ApiPropertyOptional({ type: DiscountDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DiscountDto)
  discount?: DiscountDto;

  @ApiPropertyOptional({ type: InterestDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => InterestDto)
  interest?: InterestDto;

  @ApiPropertyOptional({ type: FineDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => FineDto)
  fine?: FineDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localContractId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localRecurrenceId?: string;
}
