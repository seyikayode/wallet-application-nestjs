import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { TransactionProcessor } from './transaction.processor';
import { Wallet } from '../wallets/entities/wallet.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { CacheService } from '../cache/cache.service';

describe('TransactionProcessor', () => {
  let processor: TransactionProcessor;

  const mockWallet = {
    id: 'wallet-id-1',
    userId: 'user-id-1',
    balance: 1000,
    save: jest.fn()
  };

  const mockTransaction = {
    id: 'transaction-id-1',
    walletId: 'wallet-id-1',
    type: 'DEPOSIT',
    amount: 100,
    status: 'COMPLETED'
  };

  const mockJob = {
    id: 'job-123',
    data: {
      walletId: 'wallet-id-1',
      amount: 100,
      transactionId: 'txn-123'
    },
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
      create: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn()
  };

  const mockWalletsRepository = {
    save: jest.fn()
  };

  const mockTransactionsRepository = {
    create: jest.fn(),
    save: jest.fn()
  };

  const mockCacheService = {
    invalidateWalletBalance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionProcessor,
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockWalletsRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionsRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    processor = module.get<TransactionProcessor>(TransactionProcessor);
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
    jest.clearAllMocks();
  });

  describe('handleDeposit', () => {
    it('should process deposit successfully', async () => {
      const updatedWallet = { ...mockWallet, balance: 1100 };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(mockWallet);
      mockQueryRunner.manager.save.mockResolvedValueOnce(updatedWallet);
      mockQueryRunner.manager.create.mockReturnValue(mockTransaction);
      mockQueryRunner.manager.save.mockResolvedValueOnce(mockTransaction);

      const result = await processor.handleDeposit(mockJob as any);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockCacheService.invalidateWalletBalance).toHaveBeenCalledWith(mockWallet.id);
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual(mockTransaction);
    });

    it('should return existing transaction if duplicate', async () => {
      const existingTransaction = { ...mockTransaction, id: 'existing-txn' };

      mockQueryRunner.manager.findOne.mockResolvedValue(existingTransaction);

      const result = await processor.handleDeposit(mockJob as any);
    //   expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(result).toEqual(existingTransaction);
    });

    it('should rollback and create failed transaction on error', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);
      mockQueryRunner.manager.findOne.mockRejectedValue(new Error('Database error'));
      mockTransactionsRepository.create.mockReturnValue(mockTransaction);
      mockTransactionsRepository.save.mockResolvedValue(mockTransaction);

      await expect(processor.handleDeposit(mockJob as any)).rejects.toThrow('Database error');

    //   expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockTransactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
        }),
      );
    });
  });

  describe('handleWithdrawal', () => {
    it('should process withdrawal successfully', async () => {
      const withdrawalJob = {
        ...mockJob,
        data: { ...mockJob.data, amount: 100 },
      };
      const updatedWallet = { ...mockWallet, balance: 900 };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(mockWallet);
      mockQueryRunner.manager.save.mockResolvedValueOnce(updatedWallet);
      mockQueryRunner.manager.create.mockReturnValue(mockTransaction);
      mockQueryRunner.manager.save.mockResolvedValueOnce(mockTransaction);

      const result = await processor.handleWithdrawal(withdrawalJob as any);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockCacheService.invalidateWalletBalance).toHaveBeenCalledWith(mockWallet.id);
      expect(result).toEqual(mockTransaction);
    });

    it('should throw error for insufficient balance', async () => {
      const withdrawalJob = {
        ...mockJob,
        data: { ...mockJob.data, amount: 2000 }
      };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(mockWallet);

      await expect(processor.handleWithdrawal(withdrawalJob as any)).rejects.toThrow(
        'Insufficient balance'
      );
    //   expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('handleTransfer', () => {
    it('should process transfer successfully', async () => {
      const transferJob = {
        id: 'job-123',
        data: {
          fromWalletId: 'wallet-id-1',
          toWalletId: 'wallet-id-2',
          amount: 100,
          referenceNumber: 'ref-123',
          transactionId: 'txn-123',
        },
      };

      const fromWallet = { ...mockWallet, id: 'wallet-id-1', balance: 1000 };
      const toWallet = { ...mockWallet, id: 'wallet-id-2', balance: 500 };
      const updatedWallets = [
        { ...fromWallet, balance: 900 },
        { ...toWallet, balance: 600 },
      ];

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);
      mockQueryRunner.manager.find.mockResolvedValue([fromWallet, toWallet]);
      mockQueryRunner.manager.save.mockResolvedValueOnce(updatedWallets);
      mockQueryRunner.manager.create.mockReturnValue(mockTransaction);
      mockQueryRunner.manager.save.mockResolvedValueOnce([mockTransaction, mockTransaction]);

      const result = await processor.handleTransfer(transferJob as any);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockCacheService.invalidateWalletBalance).toHaveBeenCalledWith('wallet-id-1');
      expect(mockCacheService.invalidateWalletBalance).toHaveBeenCalledWith('wallet-id-2');
      expect(result).toEqual([mockTransaction, mockTransaction]);
    });

    it('should throw error for insufficient balance in transfer', async () => {
      const transferJob = {
        id: 'job-123',
        data: {
          fromWalletId: 'wallet-id-1',
          toWalletId: 'wallet-id-2',
          amount: 2000,
          referenceNumber: 'ref-123',
          transactionId: 'txn-123',
        },
      };

      const fromWallet = { ...mockWallet, id: 'wallet-id-1', balance: 1000 };
      const toWallet = { ...mockWallet, id: 'wallet-id-2', balance: 500 };

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);
      mockQueryRunner.manager.find.mockResolvedValue([fromWallet, toWallet]);
      await expect(processor.handleTransfer(transferJob as any)).rejects.toThrow(
        'Insufficient balance'
      );
    //   expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});