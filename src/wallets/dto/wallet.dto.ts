import { IsNumber, IsString, IsUUID, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({ example: 100.50, description: 'Amount to deposit' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'txn_123456', description: 'Unique transaction ID for idempotency' })
  @IsString()
  transactionId: string;
}

export class WithdrawDto {
  @ApiProperty({ example: 50.25, description: 'Amount to withdraw' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'txn_789012', description: 'Unique transaction ID for idempotency' })
  @IsString()
  transactionId: string;
}

export class TransferDto {
  @ApiProperty({ example: 'wallet-uuid-here', description: 'Recipient wallet ID' })
  @IsUUID()
  toWalletId: string;

  @ApiProperty({ example: 75.00, description: 'Amount to transfer' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'txn_345678', description: 'Unique transaction ID for idempotency' })
  @IsString()
  transactionId: string;
};