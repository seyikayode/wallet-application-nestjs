import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { CacheService } from '../cache/cache.service';

describe('WalletsService', () => {
  let service: WalletsService;

  const mockWallet = {
    id: 'wallet-id-1',
    userId: 'user-id-1',
    balance: 0,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockTransaction = {
    id: 'transaction-id-1',
    walletId: 'wallet-id-1',
    type: 'DEPOSIT',
    amount: 100,
    status: 'COMPLETED',
    referenceNumber: 'ref-123',
    transactionId: 'txn-123'
  };

  const mockWalletsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn()
  };

  const mockTransactionsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn()
  };

  const mockCacheService = {
    setWalletBalance: jest.fn(),
    getWalletBalance: jest.fn(),
    invalidateWalletBalance: jest.fn()
  };

  const mockQueue = {
    add: jest.fn()
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn()
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockWalletsRepository
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionsRepository
        },
        {
          provide: getQueueToken('wallet-transactions'),
          useValue: mockQueue
        },
        {
          provide: CacheService,
          useValue: mockCacheService
        },
        {
          provide: DataSource,
          useValue: mockDataSource
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

    jest.clearAllMocks();
  });

  describe('createWallet', () => {
    it('should create a new wallet and set wallet balance as zero', async () => {
      const userId = 'user-id-1';

      mockWalletsRepository.findOne.mockResolvedValue(null);
      mockWalletsRepository.create.mockReturnValue({ ...mockWallet, balance: 0 });
      mockWalletsRepository.save.mockResolvedValue({ ...mockWallet, balance: 0 });

      const result = await service.createWallet(userId);

      expect(mockWalletsRepository.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(mockWalletsRepository.create).toHaveBeenCalledWith({userId, balance: 0,});
      expect(mockCacheService.setWalletBalance).toHaveBeenCalledWith(mockWallet.id, 0);
      expect(result.balance).toBe(0);
    });

    it('should throw ConflictException if wallet already exists', async () => {
      const userId = 'user-id-1';

      mockWalletsRepository.findOne.mockResolvedValue(mockWallet);

      await expect(service.createWallet(userId)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('getWalletByUserId', () => {
    it('should return wallet if found', async () => {
      const userId = 'user-id-1';
      mockWalletsRepository.findOne.mockResolvedValue(mockWallet);

      const result = await service.getWalletByUserId(userId);

      expect(mockWalletsRepository.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(result).toEqual(mockWallet);
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = 'nonexistent-user';
      mockWalletsRepository.findOne.mockResolvedValue(null);

      await expect(service.getWalletByUserId(userId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getBalance', () => {
    it('should return cached balance if available', async () => {
      const userId = 'user-id-1';
      const cachedBalance = 0;

      mockWalletsRepository.findOne.mockResolvedValue(mockWallet);
      mockCacheService.getWalletBalance.mockResolvedValue(cachedBalance);

      const result = await service.getBalance(userId);

      expect(mockCacheService.getWalletBalance).toHaveBeenCalledWith(mockWallet.id);
      expect(result).toEqual({ balance: cachedBalance });
    });

    it('should fetch from database and cache if not in cache', async () => {
      const userId = 'user-id-1';

      mockWalletsRepository.findOne.mockResolvedValueOnce(mockWallet);
      mockCacheService.getWalletBalance.mockResolvedValue(null);
      mockWalletsRepository.findOne.mockResolvedValueOnce(mockWallet);

      const result = await service.getBalance(userId);

      expect(mockCacheService.setWalletBalance).toHaveBeenCalledWith(
        mockWallet.id,
        mockWallet.balance
      );
      expect(result).toEqual({ balance: mockWallet.balance });
    });
  });

  describe('deposit', () => {
    it('should queue deposit successfully', async () => {
      const userId = 'user-id-1';
      const depositDto = { amount: 100, transactionId: 'txn-123' };
      const jobId = 'job-123';

      mockWalletsRepository.findOne.mockResolvedValue(mockWallet);
      mockTransactionsRepository.findOne.mockResolvedValue(null);
      mockQueue.add.mockResolvedValue({ id: jobId });

      const result = await service.deposit(userId, depositDto);

      expect(mockTransactionsRepository.findOne).toHaveBeenCalledWith({
        where: { transactionId: depositDto.transactionId },
      });
      expect(mockQueue.add).toHaveBeenCalledWith('deposit', expect.objectContaining({
        walletId: mockWallet.id,
        amount: depositDto.amount,
        transactionId: depositDto.transactionId,
      }));
      expect(result.message).toBe('Deposit queued for processing');
      expect(result.jobId).toBe(jobId);
    });

    it('should return existing transaction if duplicate transactionId', async () => {
      const userId = 'user-id-1';
      const depositDto = { amount: 100, transactionId: 'txn-123' };

      mockWalletsRepository.findOne.mockResolvedValue(mockWallet);
      mockTransactionsRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await service.deposit(userId, depositDto);

      expect(result.message).toBe('Transaction already processed');
      expect(result.transaction).toEqual(mockTransaction);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('withdraw', () => {
    it('should queue withdrawal successfully', async () => {
      const withdrawalMockWallet = {
        id: 'wallet-id-1',
        userId: 'user-id-1',
        balance: 300,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const userId = 'user-id-1';
      const withdrawDto = { amount: 200, transactionId: 'txn-withdraw-123' };
      const jobId = 'job-withdraw-123';

      mockWalletsRepository.findOne.mockResolvedValue(withdrawalMockWallet);
      mockTransactionsRepository.findOne.mockResolvedValue(null);
      mockQueue.add.mockResolvedValue({ id: jobId });

      const result = await service.withdraw(userId, withdrawDto);

      expect(mockWalletsRepository.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(mockTransactionsRepository.findOne).toHaveBeenCalledWith({
        where: { transactionId: withdrawDto.transactionId },
      });
      expect(mockQueue.add).toHaveBeenCalledWith('withdraw', expect.objectContaining({
        walletId: withdrawalMockWallet.id,
        amount: withdrawDto.amount,
        transactionId: withdrawDto.transactionId
      }));
      expect(result.message).toBe('Withdrawal queued for processing');
      expect(result.jobId).toBe(jobId);
    });

    it('should return existing transaction if duplicate transactionId for withdrawal', async () => {
      const userId = 'user-id-1';
      const withdrawDto = { amount: 200, transactionId: 'txn-withdraw-123' };
      const existingTransaction = {
        id: 'existing-txn-id',
        type: 'WITHDRAWAL',
        amount: 200,
        transactionId: 'txn-withdraw-123',
        status: 'COMPLETED'
      };

      mockWalletsRepository.findOne.mockResolvedValue(mockWallet);
      mockTransactionsRepository.findOne.mockResolvedValue(existingTransaction);

      const result = await service.withdraw(userId, withdrawDto);

      expect(result.message).toBe('Transaction already processed');
      expect(result.transaction).toEqual(existingTransaction);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('transfer', () => {
    const fromWallet = {
      id: 'wallet-id-1',
      userId: 'user-id-1',
      balance: 1000
    };
    const toWallet = {
      id: 'wallet-id-2',
      userId: 'user-id-2',
      balance: 500
    };

    it('should queue transfer successfully', async () => {
      const userId = 'user-id-1';
      const transferDto = {
        toWalletId: 'wallet-id-2',
        amount: 300,
        transactionId: 'txn-transfer-123',
      };
      const jobId = 'job-transfer-123';

      mockWalletsRepository.findOne.mockResolvedValueOnce(fromWallet);
      mockWalletsRepository.findOne.mockResolvedValueOnce(toWallet);
      mockTransactionsRepository.findOne.mockResolvedValue(null);
      mockQueue.add.mockResolvedValue({ id: jobId });

      const result = await service.transfer(userId, transferDto);

      expect(mockWalletsRepository.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(mockWalletsRepository.findOne).toHaveBeenCalledWith({ 
        where: { id: transferDto.toWalletId } 
      });
      expect(mockTransactionsRepository.findOne).toHaveBeenCalledWith({
        where: { transactionId: transferDto.transactionId },
      });
      expect(mockQueue.add).toHaveBeenCalledWith('transfer', expect.objectContaining({
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amount: transferDto.amount,
        transactionId: transferDto.transactionId
      }));
      expect(result.message).toBe('Transfer queued for processing');
      expect(result.jobId).toBe(jobId);
    });

    it('should return existing transaction if duplicate transactionId for transfer', async () => {
      const userId = 'user-id-1';
      const transferDto = {
        toWalletId: 'wallet-id-2',
        amount: 300,
        transactionId: 'txn-transfer-duplicate',
      };
      const existingTransaction = {
        id: 'existing-transfer-id',
        type: 'TRANSFER_OUT',
        amount: 300,
        transactionId: 'txn-tranfer-duplicate',
        status: 'COMPLETED',
      };

      mockWalletsRepository.findOne.mockResolvedValueOnce(mockWallet);
      mockWalletsRepository.findOne.mockResolvedValueOnce(toWallet);
      mockTransactionsRepository.findOne.mockResolvedValue(existingTransaction);

      const result = await service.transfer(userId, transferDto);

      expect(result.message).toBe('Transaction already processed');
      expect(result.transaction).toEqual(existingTransaction);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
});