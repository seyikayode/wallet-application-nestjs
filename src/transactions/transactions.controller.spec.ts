import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let transactionsService: TransactionsService;

  const mockTransactionsService = {
    getTransactionHistory: jest.fn(),
    getTransactionById: jest.fn()
  };

  const mockUser = {
    id: 'user-id-1',
    email: 'test@example.com',
  };

  const mockTransaction = {
    id: 'transaction-id-1',
    walletId: 'wallet-id-1',
    type: 'DEPOSIT',
    amount: 100,
    status: 'COMPLETED',
    createdAt: new Date()
  };

  const mockTransactionHistory = {
    transactions: [mockTransaction],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    transactionsService = module.get<TransactionsService>(TransactionsService);

    jest.clearAllMocks();
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history', async () => {
      const req = { user: mockUser };
      const getTransactionsDto = { page: 1, limit: 20 };

      mockTransactionsService.getTransactionHistory.mockResolvedValue(mockTransactionHistory);
      const result = await controller.getTransactionHistory(req, getTransactionsDto);
      expect(transactionsService.getTransactionHistory).toHaveBeenCalledWith(
        mockUser.id,
        getTransactionsDto,
      );
      expect(result).toEqual(mockTransactionHistory);
    });

    it('should handle query parameters correctly', async () => {
      const req = { user: mockUser };
      const getTransactionsDto = {
        page: 2,
        limit: 10,
        type: 'DEPOSIT' as any,
        status: 'COMPLETED' as any,
      };

      mockTransactionsService.getTransactionHistory.mockResolvedValue(mockTransactionHistory);
      await controller.getTransactionHistory(req, getTransactionsDto);
      expect(transactionsService.getTransactionHistory).toHaveBeenCalledWith(
        mockUser.id,
        getTransactionsDto,
      );
    });
  });

  describe('getTransaction', () => {
    it('should return specific transaction', async () => {
      const req = { user: mockUser };
      const id = 'transaction-id-1';

      mockTransactionsService.getTransactionById.mockResolvedValue(mockTransaction);
      const result = await controller.getTransaction(req, id);
      expect(transactionsService.getTransactionById).toHaveBeenCalledWith(
        mockUser.id,
        id,
      );
      expect(result).toEqual(mockTransaction);
    });
  });
});