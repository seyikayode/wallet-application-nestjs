import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { CacheService } from '../cache/cache.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockWallet = {
    id: 'wallet-id-1',
    userId: 'user-id-1',
    balance: 1000
  };

  const mockTransaction = {
    id: 'transaction-id-1',
    walletId: 'wallet-id-1',
    type: 'DEPOSIT',
    amount: 100,
    status: 'COMPLETED',
    createdAt: new Date()
  };

  const mockTransactionsRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockWalletsRepository = {
    findOne: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionsRepository,
        },
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockWalletsRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();
    mockTransactionsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history if', async () => {
      const userId = 'user-id-1';
      const getTransactionsDto = { page: 1, limit: 20 };

      mockWalletsRepository.findOne.mockResolvedValue(mockWallet);
      mockCacheService.get.mockResolvedValue(null);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTransaction], 1]);

      const result = await service.getTransactionHistory(userId, getTransactionsDto);
      const mockResult = {
        transactions: [mockTransaction],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      };
      expect(result).toEqual(mockResult);
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = 'nonexistent-user';
      const getTransactionsDto = { page: 1, limit: 20 };

      mockWalletsRepository.findOne.mockResolvedValue(null);

      await expect(service.getTransactionHistory(userId, getTransactionsDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction if found', async () => {
      const userId = 'user-id-1';
      const transactionId = 'transaction-id-1';

      mockWalletsRepository.findOne.mockResolvedValue(mockWallet);
      mockTransactionsRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.getTransactionById(userId, transactionId);

      expect(mockTransactionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: transactionId, walletId: mockWallet.id },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      const userId = 'user-id-1';
      const transactionId = 'nonexistent-transaction';

      mockWalletsRepository.findOne.mockResolvedValue(mockWallet);
      mockTransactionsRepository.findOne.mockResolvedValue(null);

      await expect(service.getTransactionById(userId, transactionId)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = 'nonexistent-user';
      const transactionId = 'transaction-id-1';

      mockWalletsRepository.findOne.mockResolvedValue(null);

      await expect(service.getTransactionById(userId, transactionId)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});