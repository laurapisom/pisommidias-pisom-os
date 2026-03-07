import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsObject,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BillingType {
  BOLETO = 'BOLETO',
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  UNDEFINED = 'UNDEFINED',
}

export class DiscountDto {
  @ApiProperty()
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ description: 'Dias antes do vencimento para aplicar desconto' })
  @IsOptional()
  @IsNumber()
  dueDateLimitDays?: number;

  @ApiPropertyOptional({ enum: ['FIXED', 'PERCENTAGE'] })
  @IsOptional()
  @IsString()
  type?: string;
}

export class InterestDto {
  @ApiProperty({ description: 'Percentual de juros ao mês' })
  @IsNumber()
  value: number;
}

export class FineDto {
  @ApiProperty({ description: 'Percentual de multa' })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ enum: ['FIXED', 'PERCENTAGE'] })
  @IsOptional()
  @IsString()
  type?: string;
}

export class CreditCardDto {
  @ApiProperty()
  @IsString()
  holderName: string;

  @ApiProperty()
  @IsString()
  number: string;

  @ApiProperty()
  @IsString()
  expiryMonth: string;

  @ApiProperty()
  @IsString()
  expiryYear: string;

  @ApiProperty()
  @IsString()
  ccv: string;
}

export class CreditCardHolderInfoDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  cpfCnpj: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressComplement?: string;
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'ID do cliente local (AsaasCustomer) ou cpfCnpj' })
  @IsString()
  customerId: string;

  @ApiProperty({ enum: BillingType })
  @IsEnum(BillingType)
  billingType: BillingType;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  value: number;

  @ApiProperty({ description: 'Data de vencimento (YYYY-MM-DD)' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalReference?: string;

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

  @ApiPropertyOptional({ type: CreditCardDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreditCardDto)
  creditCard?: CreditCardDto;

  @ApiPropertyOptional({ type: CreditCardHolderInfoDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreditCardHolderInfoDto)
  creditCardHolderInfo?: CreditCardHolderInfoDto;

  @ApiPropertyOptional({ description: 'Número de parcelas (cartão de crédito)' })
  @IsOptional()
  @IsNumber()
  installmentCount?: number;

  @ApiPropertyOptional({ description: 'Valor total parcelado' })
  @IsOptional()
  @IsNumber()
  installmentValue?: number;

  @ApiPropertyOptional({ description: 'ID da fatura local para vincular' })
  @IsOptional()
  @IsString()
  localInvoiceId?: string;

  @ApiPropertyOptional({ description: 'ID do lançamento financeiro local para vincular' })
  @IsOptional()
  @IsString()
  localEntryId?: string;
}

export class RefundPaymentDto {
  @ApiPropertyOptional({ description: 'Valor a estornar (parcial). Se omitido, estorna total.' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  value?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
