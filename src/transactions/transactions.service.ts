import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { CacheService } from '../cache/cache.service';
import { GetTransactionsDto } from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
    private cacheService: CacheService
  ) {}

  async getTransactionHistory(userId: string, getTransactionsDto: GetTransactionsDto) {
    const wallet = await this.walletsRepository.findOne({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    };

    const { page = 1, limit = 20, type, status, startDate, endDate } = getTransactionsDto;
    const skip = (page - 1) * limit;

    const cacheKey = `transactions:${wallet.id}:${JSON.stringify(getTransactionsDto)}`;
    const cachedResult = await this.cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    };

    const queryBuilder = this.transactionsRepository.createQueryBuilder('transaction')
      .where('transaction.walletId = :walletId', { walletId: wallet.id })
      .orderBy('transaction.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (type) {
      queryBuilder.andWhere('transaction.type = :type', { type });
    };
    if (status) {
      queryBuilder.andWhere('transaction.status = :status', { status });
    };
    if (startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', { startDate });
    };
    if (endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', { endDate });
    };

    const [transactions, total] = await queryBuilder.getManyAndCount();

    const result = {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    await this.cacheService.set(cacheKey, result, 300);
    return result;
  };

  async getTransactionById(userId: string, id: string): Promise<Transaction> {
    const wallet = await this.walletsRepository.findOne({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    };

    const transaction = await this.transactionsRepository.findOne({
      where: { id, walletId: wallet.id }
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    };

    return transaction;
  };
};