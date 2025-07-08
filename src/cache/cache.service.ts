import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
      maxRetriesPerRequest: 3
    });
  }

  async get(key: string): Promise<any> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  };

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  };

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  };

  async setWalletBalance(walletId: string, balance: number): Promise<void> {
    const key = `wallet:balance:${walletId}`;
    await this.set(key, balance, 300);
  };

  async getWalletBalance(walletId: string): Promise<number | null> {
    const key = `wallet:balance:${walletId}`;
    return await this.get(key);
  };

  async invalidateWalletBalance(walletId: string): Promise<void> {
    const key = `wallet:balance:${walletId}`;
    await this.del(key);
    
    const pattern = `transactions:${walletId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  };
};