import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { CacheService } from '../cache/cache.service';
import { DepositDto, WithdrawDto, TransferDto } from './dto/wallet.dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletsRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectQueue('wallet-transactions')
    private transactionQueue: Queue,
    private cacheService: CacheService
  ) {}

  async createWallet(userId: string): Promise<Wallet> {
    const existingWallet = await this.walletsRepository.findOne({ where: { userId } });
    if (existingWallet) {
      throw new ConflictException('User already has a wallet');
    };

    const wallet = this.walletsRepository.create({
      userId,
      balance: 0
    });

    const savedWallet = await this.walletsRepository.save(wallet);
    await this.cacheService.setWalletBalance(savedWallet.id, savedWallet.balance);
    
    return savedWallet;
  };

  async getWalletByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.walletsRepository.findOne({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  };

  async getBalance(userId: string): Promise<{ balance: number }> {
    const wallet = await this.getWalletByUserId(userId);
    
    const cachedBalance = await this.cacheService.getWalletBalance(wallet.id);
    if (cachedBalance !== null) {
      return { balance: cachedBalance };
    };

    const freshWallet = await this.walletsRepository.findOne({ where: { id: wallet.id } });
    if (!freshWallet) {
        throw new NotFoundException('Wallet not found');
    };

    await this.cacheService.setWalletBalance(wallet.id, freshWallet.balance);
    return { balance: freshWallet.balance };
  };

  async deposit(userId: string, depositDto: DepositDto): Promise<any> {
    const wallet = await this.getWalletByUserId(userId);
    const existingTransaction = await this.transactionsRepository.findOne({
        where: { transactionId: depositDto.transactionId }
    });
    if (existingTransaction) {
        return { message: 'Transaction already processed', transaction: existingTransaction };
    };

    const job = await this.transactionQueue.add('deposit', {
      walletId: wallet.id,
      amount: depositDto.amount,
      transactionId: depositDto.transactionId
    });

    return { message: 'Deposit queued for processing', jobId: job.id };
  };

  async withdraw(userId: string, withdrawDto: WithdrawDto): Promise<any> {
    const wallet = await this.getWalletByUserId(userId);
    
    const existingTransaction = await this.transactionsRepository.findOne({
        where: { transactionId: withdrawDto.transactionId }
    });
    if (existingTransaction) {
        return { message: 'Transaction already processed', transaction: existingTransaction };
    };

    if (Number(wallet.balance) < Number(withdrawDto.amount)) {
        throw new BadRequestException('Insufficient balance');
    };

    const job = await this.transactionQueue.add('withdraw', {
      walletId: wallet.id,
      amount: withdrawDto.amount,
      transactionId: withdrawDto.transactionId
    });

    return { message: 'Withdrawal queued for processing', jobId: job.id };
  };

  async transfer(userId: string, transferDto: TransferDto): Promise<any> {
    const fromWallet = await this.getWalletByUserId(userId);
    const toWallet = await this.walletsRepository.findOne({ where: { id: transferDto.toWalletId } });
    
    if (!toWallet) {
      throw new NotFoundException('Recipient wallet not found');
    };

    const existingTransaction = await this.transactionsRepository.findOne({
        where: { transactionId: transferDto.transactionId }
    });
    if (existingTransaction) {
        return { message: 'Transaction already processed', transaction: existingTransaction };
    };

    if (Number(fromWallet.balance) < Number(transferDto.amount)) {
        throw new BadRequestException('Insufficient balance');
    };

    const job = await this.transactionQueue.add('transfer', {
      fromWalletId: fromWallet.id,
      toWalletId: toWallet.id,
      amount: transferDto.amount,
      transactionId: transferDto.transactionId
    });

    return { message: 'Transfer queued for processing', jobId: job.id };
  };
};