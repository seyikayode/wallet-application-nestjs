import { IsOptional, IsEnum, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum TransactionTypeFilter {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export enum TransactionStatusFilter {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class GetTransactionsDto {
  @ApiProperty({ example: 1, description: 'Page number', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, description: 'Number of items per page', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ enum: TransactionTypeFilter, description: 'Filter by transaction type', required: false })
  @IsOptional()
  @IsEnum(TransactionTypeFilter)
  type?: TransactionTypeFilter;

  @ApiProperty({ enum: TransactionStatusFilter, description: 'Filter by transaction status', required: false })
  @IsOptional()
  @IsEnum(TransactionStatusFilter)
  status?: TransactionStatusFilter;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Start date filter', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', description: 'End date filter', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
};