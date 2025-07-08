import { Test, TestingModule } from '@nestjs/testing';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

describe('WalletsController', () => {
  let controller: WalletsController;
  let walletsService: WalletsService;

  const mockWalletsService = {
    createWallet: jest.fn(),
    getBalance: jest.fn(),
    deposit: jest.fn(),
    withdraw: jest.fn(),
    transfer: jest.fn()
  };

  const mockUser = {
    id: 'user-id-1',
    email: 'test@example.com'
  };

  const mockWallet = {
    id: 'wallet-id-1',
    userId: 'user-id-1',
    balance: 1000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [
        {
          provide: WalletsService,
          useValue: mockWalletsService,
        },
      ],
    }).compile();

    controller = module.get<WalletsController>(WalletsController);
    walletsService = module.get<WalletsService>(WalletsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new wallet', async () => {
      const req = { user: mockUser };
      mockWalletsService.createWallet.mockResolvedValue(mockWallet);
      const result = await controller.create(req);

      expect(walletsService.createWallet).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockWallet);
    });
  });

  describe('getBalance', () => {
    it('should return wallet balance', async () => {
      const req = { user: mockUser };
      const balanceResponse = { balance: 0 };

      mockWalletsService.getBalance.mockResolvedValue(balanceResponse);
      const result = await controller.getBalance(req);
      expect(walletsService.getBalance).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(balanceResponse);
    });
  });

  describe('deposit', () => {
    it('should initiate deposit', async () => {
      const depositDto = { amount: 100, transactionId: 'txn-123' };
      const req = { user: mockUser };
      const depositResponse = { message: 'Deposit queued for processing', jobId: 'job-123' };

      mockWalletsService.deposit.mockResolvedValue(depositResponse);
      const result = await controller.deposit(req, depositDto);

      expect(walletsService.deposit).toHaveBeenCalledWith(mockUser.id, depositDto);
      expect(result).toEqual(depositResponse);
    });
  });

  describe('withdraw', () => {
    it('should initiate withdrawal', async () => {
      const withdrawDto = { amount: 50, transactionId: 'txn-456' };
      const req = { user: mockUser };
      const withdrawResponse = { message: 'Withdrawal queued for processing', jobId: 'job-456' };

      mockWalletsService.withdraw.mockResolvedValue(withdrawResponse);
      const result = await controller.withdraw(req, withdrawDto);
      expect(walletsService.withdraw).toHaveBeenCalledWith(mockUser.id, withdrawDto);
      expect(result).toEqual(withdrawResponse);
    });
  });

  describe('transfer', () => {
    it('should initiate transfer', async () => {
      const transferDto = {
        toWalletId: 'wallet-id-2',
        amount: 75,
        transactionId: 'txn-789'
      };
      const req = { user: mockUser };
      const transferResponse = { message: 'Transfer queued for processing', jobId: 'job-789' };

      mockWalletsService.transfer.mockResolvedValue(transferResponse);
      const result = await controller.transfer(req, transferDto);
      expect(walletsService.transfer).toHaveBeenCalledWith(mockUser.id, transferDto);
      expect(result).toEqual(transferResponse);
    });
  });
});