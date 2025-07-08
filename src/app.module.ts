import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { WalletsModule } from '../src/wallets/wallets.module';
import { TransactionsModule } from '../src/transactions/transactions.module';
import { CacheModule } from './cache/cache.module';
import { QueueModule } from './queue/queue.module';
import { DatabaseModule } from '../src/database/database.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000'),
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100')
      }
    ]),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    WalletsModule,
    TransactionsModule,
    CacheModule,
    QueueModule,
    HealthModule
  ],
  controllers: [AppController],
  providers: [AppService]
})

export class AppModule {}