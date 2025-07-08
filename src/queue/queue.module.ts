import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionProcessor } from './transaction.processor';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'wallet-transactions',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000
        },
      },
    }),
    TypeOrmModule.forFeature([Wallet, Transaction]),
    CacheModule
  ],
  providers: [TransactionProcessor],
  exports: [TransactionProcessor]
})
export class QueueModule {}